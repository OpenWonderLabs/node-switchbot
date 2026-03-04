/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/base.ts: SwitchBot v4.0.0 - Base Device Class
 */

import type { OpenAPIClient } from '../api.js'
import type { BLEConnection } from '../ble.js'

import type { CommandResult, ConnectionType, DeviceInfo, DeviceStatus } from '../types/index.js'
import type { CircuitBreakerConfig, FallbackHandler, FallbackHandlerOptions, RetryConfig } from '../utils/index.js' // ms

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { APINotAvailableError, BLENotAvailableError } from '../errors.js'
import { DEVICE_COMMANDS } from '../settings.js'

import {
  CircuitBreaker,

  CircuitBreakerState,
  ConnectionTracker,

  FallbackHandlerManager,

  Logger,

  RetryExecutor,
} from '../utils/index.js'
// Passive polling interval (24 hours)
export const PASSIVE_POLL_INTERVAL = 60 * 60 * 24 * 1000

/**
 * Base class for all SwitchBot devices
 * Provides hybrid BLE/API functionality with automatic fallback, circuit breaker, and connection intelligence
 */
export abstract class SwitchBotDevice extends EventEmitter {
  protected logger: Logger
  protected bleConnection?: BLEConnection
  protected apiClient?: OpenAPIClient
  protected enableFallback: boolean
  protected preferredConnection: ConnectionType

  // Advanced features
  protected connectionTracker: ConnectionTracker
  protected circuitBreakerBLE: CircuitBreaker
  protected circuitBreakerAPI: CircuitBreaker
  protected fallbackHandlerManager: FallbackHandlerManager
  protected retryExecutor: RetryExecutor
  protected enableConnectionIntelligence: boolean
  protected enableCircuitBreaker: boolean
  protected enableRetry: boolean
  private bleOperationQueue: Promise<void> = Promise.resolve()

  // Passive polling
  private lastPolledAt?: number

  private defineCompatibilityProperties(): void {
    const properties: Array<'id' | 'name' | 'deviceType' | 'mac' | 'activeConnection'> = ['id', 'name', 'deviceType', 'mac', 'activeConnection']

    for (const property of properties) {
      Object.defineProperty(this, property, {
        enumerable: true,
        configurable: true,
        get: () => {
          const value = this.info[property]

          if ((property === 'id' || property === 'mac') && typeof value === 'string' && value.length === 0) {
            return undefined
          }

          return value
        },
      })
    }
  }

  constructor(
    protected info: DeviceInfo,
    options: {
      bleConnection?: BLEConnection
      apiClient?: OpenAPIClient
      enableFallback?: boolean
      preferredConnection?: ConnectionType
      enableConnectionIntelligence?: boolean
      enableCircuitBreaker?: boolean
      enableRetry?: boolean
      retryConfig?: RetryConfig
      circuitBreakerConfig?: CircuitBreakerConfig
      logLevel?: number
    } = {},
  ) {
    super()

    this.defineCompatibilityProperties()

    this.logger = new Logger(`${info.deviceType}:${info.id}`, options.logLevel)
    this.bleConnection = options.bleConnection
    this.apiClient = options.apiClient
    this.enableFallback = options.enableFallback ?? true
    this.preferredConnection = options.preferredConnection ?? 'ble'

    // Initialize advanced features
    this.enableConnectionIntelligence = options.enableConnectionIntelligence ?? true
    this.enableCircuitBreaker = options.enableCircuitBreaker ?? true
    this.enableRetry = options.enableRetry ?? true

    // Create connection tracker for this device
    this.connectionTracker = new ConnectionTracker(info.id, options.logLevel)

    // Create circuit breakers for each connection type
    this.circuitBreakerBLE = new CircuitBreaker(`${info.deviceType}:${info.id}:BLE`, options.circuitBreakerConfig, options.logLevel)
    this.circuitBreakerAPI = new CircuitBreaker(`${info.deviceType}:${info.id}:API`, options.circuitBreakerConfig, options.logLevel)

    // Create retry executor
    this.retryExecutor = new RetryExecutor(options.retryConfig, options.logLevel)

    // Create fallback handler manager
    this.fallbackHandlerManager = new FallbackHandlerManager(options.logLevel)
  }

  /**
   * Send multiple commands in sequence (all must succeed)
   * Used for Curtain 3, bulbs, strips, and other multi-step devices
   */
  async sendCommandSequence(commands: Array<() => Promise<boolean>>): Promise<boolean> {
    try {
      for (const command of commands) {
        const success = await command()
        if (!success) {
          this.logger.warn('Command in sequence failed, stopping execution')
          return false
        }
        // Small delay between commands for device processing
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return true
    } catch (error) {
      this.logger.error('Command sequence failed', error)
      return false
    }
  }

  /**
   * Send multiple commands (returns true if any succeed)
   * Used for fallback operations with complex patterns
   */
  async sendMultipleCommands(commands: Array<() => Promise<boolean>>): Promise<boolean> {
    let anySucceeded = false
    for (const command of commands) {
      try {
        const success = await command()
        if (success) {
          anySucceeded = true
        }
        // Small delay between commands
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        this.logger.debug('Command in multi-command attempt failed', error)
        // Continue trying other commands
      }
    }
    return anySucceeded
  }

  /**
   * Returns true if device should be polled (passive polling interval elapsed)
   */
  pollNeeded(interval: number = PASSIVE_POLL_INTERVAL): boolean {
    if (!this.lastPolledAt) {
      return true
    }
    return Date.now() - this.lastPolledAt > interval
  }

  /**
   * Poll device status if needed (passive polling)
   */
  async pollIfNeeded(interval: number = PASSIVE_POLL_INTERVAL): Promise<DeviceStatus | undefined> {
    if (this.pollNeeded(interval)) {
      const status = await this.getStatus()
      this.lastPolledAt = Date.now()
      return status
    }
    return undefined
  }

  /**
   * Get device information
   */
  getInfo(): DeviceInfo {
    return { ...this.info }
  }

  /**
   * Get device ID
   */
  getId(): string {
    return this.info.id
  }

  /**
   * Get device ID (property accessor for convenience)
   */
  get id(): string | undefined {
    return this.info.id.length > 0 ? this.info.id : undefined
  }

  /**
   * Get device name
   */
  getName(): string {
    return this.info.name
  }

  /**
   * Get device name (property accessor for convenience)
   */
  get name(): string {
    return this.info.name
  }

  /**
   * Get device type
   */
  getDeviceType(): string {
    return this.info.deviceType
  }

  /**
   * Get device type (property accessor for convenience)
   */
  get deviceType(): string {
    return this.info.deviceType
  }

  /**
   * Get MAC address (if available)
   */
  getMAC(): string | undefined {
    return this.info.mac && this.info.mac.length > 0 ? this.info.mac : undefined
  }

  /**
   * Get MAC address (property accessor for convenience)
   */
  get mac(): string | undefined {
    return this.info.mac && this.info.mac.length > 0 ? this.info.mac : undefined
  }

  /**
   * Get active connection type
   */
  getActiveConnection(): ConnectionType | undefined {
    return this.info.activeConnection
  }

  /**
   * Get active connection type (property accessor for convenience)
   */
  get activeConnection(): ConnectionType | undefined {
    return this.info.activeConnection
  }

  /**
   * Check if BLE is available for this device
   */
  hasBLE(): boolean {
    return this.info.connectionTypes.includes('ble') && !!this.bleConnection && !!this.info.mac
  }

  /**
   * Check if API is available for this device
   */
  hasAPI(): boolean {
    return this.info.connectionTypes.includes('api') && !!this.apiClient && this.info.cloudServiceEnabled !== false
  }

  /**
   * Get device status (abstract - implemented by subclasses)
   */
  abstract getStatus(): Promise<DeviceStatus>

  /**
   * Send a command via BLE with circuit breaker and retry logic
   */
  protected async sendBLECommand(
    command: readonly number[] | number[] | Buffer,
  ): Promise<CommandResult> {
    if (!this.hasBLE()) {
      return {
        success: false,
        connectionType: 'ble',
        error: 'BLE not available for this device',
      }
    }

    // Check circuit breaker
    if (this.enableCircuitBreaker && !this.circuitBreakerBLE.canExecute()) {
      const state = this.circuitBreakerBLE.getState()
      if (state === CircuitBreakerState.OPEN) {
        return {
          success: false,
          connectionType: 'ble',
          error: 'BLE circuit breaker is OPEN (too many failures)',
        }
      }
    }

    const executeCommand = async () => {
      this.logger.debug('Sending BLE command', command)
      const buffer = Buffer.isBuffer(command) ? command : Buffer.from(command)

      const startTime = Date.now()
      const mac = this.info.mac ?? `id:${this.info.bleId}`

      let response: Buffer | undefined
      if (this.info.encryptionKey && this.info.encryptionIV && this.bleConnection?.setEncryption) {
        this.bleConnection.setEncryption(
          mac,
          this.info.encryptionKey,
          this.info.encryptionIV,
          this.info.encryptionMode ?? 'auto',
        )
      }

      if (this.bleConnection?.sendCommand) {
        response = await this.bleConnection.sendCommand(mac, buffer, {
          expectResponse: true,
          validateResponse: true,
          responseTimeoutMs: 1200,
        })
      } else {
        await this.bleConnection!.write(mac, buffer)
      }
      const latencyMs = Date.now() - startTime

      // Record success
      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordSuccess('ble', latencyMs)
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerBLE.recordSuccess()
      }

      this.info.activeConnection = 'ble'
      this.emit('command', { type: 'ble', success: true })

      return {
        success: true,
        connectionType: 'ble' as const,
        data: response,
      }
    }

    try {
      return await this.runWithBLELock(async () => {
        if (this.enableRetry) {
          this.circuitBreakerBLE.markHalfOpenAttempt()
          return await this.retryExecutor.executeOrThrow(executeCommand, `BLE command for ${this.info.id}`)
        } else {
          if (this.enableCircuitBreaker) {
            this.circuitBreakerBLE.markHalfOpenAttempt()
          }
          return await executeCommand()
        }
      })
    } catch (error) {
      // Record failure
      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordFailure('ble')
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerBLE.recordFailure()
      }

      this.logger.error('BLE command failed', error)
      this.emit('error', { type: 'ble', error })

      return {
        success: false,
        connectionType: 'ble',
        error: (error as Error).message,
      }
    }
  }

  /**
   * Send a command via OpenAPI with circuit breaker and retry logic
   */
  protected async sendAPICommand(command: string, parameter?: any): Promise<CommandResult> {
    if (!this.hasAPI()) {
      return {
        success: false,
        connectionType: 'api',
        error: 'API not available for this device',
      }
    }

    // Check circuit breaker
    if (this.enableCircuitBreaker && !this.circuitBreakerAPI.canExecute()) {
      const state = this.circuitBreakerAPI.getState()
      if (state === CircuitBreakerState.OPEN) {
        return {
          success: false,
          connectionType: 'api',
          error: 'API circuit breaker is OPEN (too many failures)',
        }
      }
    }

    const executeCommand = async () => {
      this.logger.debug('Sending API command', { command, parameter })

      const startTime = Date.now()
      const response = await this.apiClient!.sendCommand(this.info.id, command, parameter)
      const latencyMs = Date.now() - startTime

      // Record success
      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordSuccess('api', latencyMs)
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerAPI.recordSuccess()
      }

      this.info.activeConnection = 'api'
      this.emit('command', { type: 'api', success: true })

      return {
        success: true,
        connectionType: 'api' as const,
        data: response,
      }
    }

    try {
      if (this.enableRetry) {
        this.circuitBreakerAPI.markHalfOpenAttempt()
        return await this.retryExecutor.executeOrThrow(executeCommand, `API command for ${this.info.id}`)
      } else {
        if (this.enableCircuitBreaker) {
          this.circuitBreakerAPI.markHalfOpenAttempt()
        }
        return await executeCommand()
      }
    } catch (error) {
      // Record failure
      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordFailure('api')
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerAPI.recordFailure()
      }

      this.logger.error('API command failed', error)
      this.emit('error', { type: 'api', error })

      return {
        success: false,
        connectionType: 'api',
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get best connection type based on intelligence tracking
   */
  private getBestConnection(): ConnectionType {
    if (!this.enableConnectionIntelligence) {
      return this.preferredConnection
    }

    const availableTypes: ConnectionType[] = []
    if (this.hasBLE()) {
      availableTypes.push('ble')
    }
    if (this.hasAPI()) {
      availableTypes.push('api')
    }

    if (availableTypes.length === 0) {
      return this.preferredConnection
    }

    // Get best connection based on statistics
    const best = this.connectionTracker.getBestConnection(availableTypes)

    if (best) {
      return best
    }

    return availableTypes.length > 0 ? availableTypes[0] : this.preferredConnection
  }

  /**
   * Send a command with automatic BLE/API fallback, circuit breaker, and retry logic
   */
  protected async sendCommand(
    bleCommand: readonly number[] | number[] | Buffer,
    apiCommand: string,
    apiParameter?: any,
  ): Promise<CommandResult> {
    // Determine connection strategy
    let primaryConnection = this.preferredConnection
    let secondaryConnection: ConnectionType | undefined

    if (this.enableConnectionIntelligence) {
      primaryConnection = this.getBestConnection()

      if (this.preferredConnection === 'ble' && primaryConnection === 'api' && this.hasBLE()) {
        secondaryConnection = 'ble'
      } else if (this.preferredConnection === 'api' && primaryConnection === 'ble' && this.hasAPI()) {
        secondaryConnection = 'api'
      }
    } else {
      // Fallback based on preferred connection
      if (this.preferredConnection === 'ble' && this.hasBLE()) {
        primaryConnection = 'ble'
        if (this.enableFallback && this.hasAPI()) {
          secondaryConnection = 'api'
        }
      } else if (this.preferredConnection === 'api' && this.hasAPI()) {
        primaryConnection = 'api'
        if (this.enableFallback && this.hasBLE()) {
          secondaryConnection = 'ble'
        }
      } else if (this.hasBLE()) {
        primaryConnection = 'ble'
        if (this.enableFallback && this.hasAPI()) {
          secondaryConnection = 'api'
        }
      } else {
        primaryConnection = 'api'
        secondaryConnection = undefined
      }
    }

    // Try primary connection
    let result: CommandResult
    let fallbackUsed = false

    if (primaryConnection === 'ble') {
      result = await this.sendBLECommand(bleCommand)
    } else {
      result = await this.sendAPICommand(apiCommand, apiParameter)
    }

    // Try fallback if primary failed and fallback is enabled
    if (!result.success && this.enableFallback && secondaryConnection) {
      fallbackUsed = true

      this.logger.warn(`${primaryConnection} failed, attempting fallback to ${secondaryConnection}`)

      // Emit fallback event
      const fallbackEvent = {
        deviceId: this.info.id,
        primaryConnection,
        fallbackConnection: secondaryConnection,
        reason: result.error || 'Connection failed',
        timestamp: new Date(),
        totalTimeMs: 0,
      }

      await this.fallbackHandlerManager.emit(fallbackEvent)

      if (secondaryConnection === 'ble') {
        result = await this.sendBLECommand(bleCommand)
      } else {
        result = await this.sendAPICommand(apiCommand, apiParameter)
      }
    }

    if (fallbackUsed) {
      result.usedFallback = true
    }

    return result
  }

  /**
   * Get device status via BLE
   */
  protected async getBLEStatus(): Promise<any> {
    if (!this.hasBLE()) {
      throw new BLENotAvailableError('BLE not available for this device')
    }

    try {
      this.logger.debug('Reading BLE status')
      const startTime = Date.now()
      const data = await this.bleConnection!.read(this.info.mac ?? `id:${this.info.bleId}`)
      const latencyMs = Date.now() - startTime

      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordSuccess('ble', latencyMs)
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerBLE.recordSuccess()
      }

      this.info.activeConnection = 'ble'
      return this.normalizeBLEStatusData(data)
    } catch (error) {
      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordFailure('ble')
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerBLE.recordFailure()
      }

      this.logger.error('Failed to read BLE status', error)
      throw error
    }
  }

  protected normalizeBLEStatusData(data: any): Record<string, unknown> {
    if (data && typeof data === 'object' && !Buffer.isBuffer(data)) {
      return data as Record<string, unknown>
    }

    return (this.info.bleServiceData ?? {}) as Record<string, unknown>
  }

  private async runWithBLELock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.bleOperationQueue
    let release: () => void = () => {}
    this.bleOperationQueue = new Promise<void>((resolve) => {
      release = resolve
    })

    await previous
    try {
      return await fn()
    } finally {
      release()
    }
  }

  /**
   * Get device status via OpenAPI
   */
  protected async getAPIStatus(): Promise<any> {
    if (!this.hasAPI()) {
      throw new APINotAvailableError('API not available for this device')
    }

    try {
      this.logger.debug('Reading API status')
      const startTime = Date.now()
      const data = await this.apiClient!.getStatus(this.info.id)
      const latencyMs = Date.now() - startTime

      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordSuccess('api', latencyMs)
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerAPI.recordSuccess()
      }

      this.info.activeConnection = 'api'
      return data
    } catch (error) {
      if (this.enableConnectionIntelligence) {
        this.connectionTracker.recordFailure('api')
      }

      if (this.enableCircuitBreaker) {
        this.circuitBreakerAPI.recordFailure()
      }

      this.logger.error('Failed to read API status', error)
      throw error
    }
  }

  /**
   * Get basic device info (universal settings retrieval)
   * Returns: battery, firmware, device-specific settings, etc.
   * Command: 0x57 0x02 (BLE), 'getBasicInfo' (API)
   *
   * Example usage:
   *   const info = await device.getBasicInfo();
   *   console.log(info);
   *
   * Returns a CommandResult object with device info fields.
   */
  async getBasicInfo(): Promise<CommandResult> {
    // Prefer BLE if available
    if (this.hasBLE()) {
      return this.sendBLECommand(DEVICE_COMMANDS.RELAY.GET_BASIC_INFO)
    }
    // Fallback to API if available
    if (this.hasAPI()) {
      return this.sendAPICommand('getBasicInfo')
    }
    throw new Error('No available connection for getBasicInfo')
  }

  /**
   * Universal mode setting command
   * BLE: 0x57 0x03 [modeByte]
   * API: 'setMode' (if available)
   * @param mode - Mode value (number or string, per-device enum recommended)
   *
   * Example usage:
   * await device.setMode('auto')
   * await device.setMode(1)
   *
   * Returns a CommandResult object indicating success and mode info.
   */
  async setMode(mode: number | string): Promise<CommandResult> {
    // TODO: Extend with per-device mode enums/types as needed
    if (this.hasBLE()) {
      // BLE expects [0x57, 0x03, modeByte]
      const modeByte = typeof mode === 'number' ? mode : Number.parseInt(mode as string, 10)
      return this.sendBLECommand([0x57, 0x03, modeByte])
    }
    if (this.hasAPI()) {
      // API expects 'setMode' command, parameter may be device-specific
      return this.sendAPICommand('setMode', { mode })
    }
    throw new Error('No available connection for setMode')
  }

  /**
   * Update device information
   */
  updateInfo(newInfo: Partial<DeviceInfo>): void {
    this.info = { ...this.info, ...newInfo }
    this.emit('info-updated', this.info)
  }

  /**
   * Set preferred connection type
   */
  setPreferredConnection(type: ConnectionType): void {
    this.preferredConnection = type
    this.logger.info(`Preferred connection set to ${type}`)
  }

  /**
   * Enable or disable fallback
   */
  setFallbackEnabled(enabled: boolean): void {
    this.enableFallback = enabled
    this.logger.info(`Fallback ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Enable or disable connection intelligence
   */
  setConnectionIntelligenceEnabled(enabled: boolean): void {
    this.enableConnectionIntelligence = enabled
    this.logger.info(`Connection intelligence ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Enable or disable circuit breaker
   */
  setCircuitBreakerEnabled(enabled: boolean): void {
    this.enableCircuitBreaker = enabled
    this.logger.info(`Circuit breaker ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Enable or disable retry logic
   */
  setRetryEnabled(enabled: boolean): void {
    this.enableRetry = enabled
    this.logger.info(`Retry logic ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Get connection tracker for this device
   */
  getConnectionTracker(): ConnectionTracker {
    return this.connectionTracker
  }

  /**
   * Get circuit breaker for BLE
   */
  getCircuitBreakerBLE() {
    return this.circuitBreakerBLE
  }

  /**
   * Get circuit breaker for API
   */
  getCircuitBreakerAPI() {
    return this.circuitBreakerAPI
  }

  /**
   * Register a custom fallback handler
   */
  registerFallbackHandler(
    handler: FallbackHandler,
    options?: FallbackHandlerOptions,
  ): string {
    return this.fallbackHandlerManager.register(handler, options)
  }

  /**
   * Unregister a fallback handler
   */
  unregisterFallbackHandler(id: string): boolean {
    return this.fallbackHandlerManager.unregister(id)
  }

  /**
   * Get fallback handler manager
   */
  getFallbackHandlerManager(): FallbackHandlerManager {
    return this.fallbackHandlerManager
  }
}

/**
 * Device Manager for managing multiple devices
 */
export class DeviceManager extends EventEmitter {
  private devices: Map<string, SwitchBotDevice> = new Map()
  private logger: Logger

  constructor(logLevel?: number) {
    super()
    this.logger = new Logger('DeviceManager', logLevel)
  }

  /**
   * Add a device to the manager
   */
  add(device: SwitchBotDevice): void {
    const id = device.getId()

    if (this.devices.has(id)) {
      this.logger.warn(`Device ${id} already exists, replacing`)
    }

    this.devices.set(id, device)
    this.emit('device-added', device)
    this.logger.info(`Added device: ${device.getName()} (${id})`)
  }

  /**
   * Remove a device from the manager
   */
  remove(deviceId: string): boolean {
    const device = this.devices.get(deviceId)

    if (device) {
      this.devices.delete(deviceId)
      this.emit('device-removed', device)
      this.logger.info(`Removed device: ${deviceId}`)
      return true
    }

    return false
  }

  /**
   * Get a device by ID
   */
  get(deviceId: string): SwitchBotDevice | undefined {
    return this.devices.get(deviceId)
  }

  /**
   * Get all devices
   */
  list(): SwitchBotDevice[] {
    return [...this.devices.values()]
  }

  /**
   * Get devices filtered by type
   */
  getByType(deviceType: string): SwitchBotDevice[] {
    return this.list().filter(device => device.getDeviceType() === deviceType)
  }

  /**
   * Get device by MAC address
   */
  getByMAC(mac: string): SwitchBotDevice | undefined {
    return this.list().find(device => device.getMAC() === mac)
  }

  /**
   * Check if device exists
   */
  has(deviceId: string): boolean {
    return this.devices.has(deviceId)
  }

  /**
   * Get device count
   */
  count(): number {
    return this.devices.size
  }

  /**
   * Clear all devices
   */
  clear(): void {
    this.devices.clear()
    this.emit('devices-cleared')
    this.logger.info('All devices cleared')
  }

  /**
   * Get all device IDs
   */
  getIds(): string[] {
    return [...this.devices.keys()]
  }

  /**
   * Get devices as an object keyed by ID
   */
  toObject(): Record<string, SwitchBotDevice> {
    return Object.fromEntries(this.devices.entries())
  }
}
