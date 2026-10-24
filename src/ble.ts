/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * ble.ts: SwitchBot v4.0.0 - BLE Discovery and Communication
 */

import type { BLEAdvertisement, BLEScanOptions, BLEServiceData } from './types/ble.js'

import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv } from 'node:crypto'
import { EventEmitter } from 'node:events'

import { BLENotAvailableError, CommandFailedError, DeviceNotFoundError } from './errors.js'
import { BLE_COMMAND_TIMEOUT, BLE_CONNECT_TIMEOUT, BLE_NOTIFY_CHARACTERISTIC_UUID, BLE_SCAN_TIMEOUT, BLE_SERVICE_UUID, BLE_WRITE_CHARACTERISTIC_UUID, DEVICE_MODEL_MAP } from './settings.js'
import { extractMacFromManufacturerData, isValidMAC, Logger, macToDeviceId, mergeAdvertisement, normalizeMAC, withTimeout } from './utils/index.js'
// Move RegExp to module scope to avoid re-compilation
const CHARACTERISTIC_REGEX = /characteristic/i
const UUID_DASH_REGEX = /-/g

/**
 * Resolve a peripheral's MAC address in normalized (lowercase, colon) form.
 * macOS (CoreBluetooth) never exposes peripheral.address, so fall back to the
 * MAC embedded in SwitchBot manufacturer data.
 */
function resolvePeripheralMac(peripheral: any): string | undefined {
  const address = peripheral?.address
  if (typeof address === 'string' && isValidMAC(address)) {
    return normalizeMAC(address)
  }
  const manufacturerMac = extractMacFromManufacturerData(peripheral?.advertisement?.manufacturerData)
  return manufacturerMac ? normalizeMAC(manufacturerMac) : undefined
}

/**
 * BLE Scanner for discovering SwitchBot devices
 */
export class BLEScanner extends EventEmitter {
  private noble: any
  private logger: Logger
  private scanning = false
  private discoveredDevices: Map<string, BLEAdvertisement> = new Map()
  private discoveredModelCache: Map<string, string> = new Map()
  private nobleStateHandler?: (state: string) => void
  private nobleDiscoverHandler?: (peripheral: any) => void
  private nobleScanStartHandler?: () => void
  private nobleScanStopHandler?: () => void
  private noblePromise: Promise<any> | null = null

  constructor(options: { noble?: any, logLevel?: number } = {}) {
    super()
    this.logger = new Logger('BLEScanner', options.logLevel)
    this.noble = options.noble

    if (!this.noble) {
      this.initializeNoble().catch((error) => {
        this.logger.error('Failed to initialize Noble', error)
      })
    } else {
      this.setupNobleHandlers()
    }
  }

  /**
   * Initialize Noble lazily
   */
  private async initializeNoble(): Promise<void> {
    if (this.noble) {
      return
    }

    if (this.noblePromise) {
      // Wait for existing initialization to complete
      this.noble = await this.noblePromise
      return
    }

    this.noblePromise = (async () => {
      try {
        const module = await import('@stoprocent/noble')
        return module.default
      } catch (error) {
        throw new BLENotAvailableError('BLE not supported on this platform or @stoprocent/noble not installed')
      }
    })()

    try {
      this.noble = await this.noblePromise
      this.setupNobleHandlers()
    } catch (error) {
      throw new BLENotAvailableError('BLE not supported on this platform or @stoprocent/noble not installed')
    }
  }

  /**
   * Ensure Noble is loaded before operations
   */
  private async ensureNoble(): Promise<void> {
    if (!this.noble) {
      await this.initializeNoble()
    }

    if (!this.noble) {
      throw new BLENotAvailableError('BLE not available - noble failed to initialize')
    }
  }

  /**
   * Setup Noble event handlers
   */
  private setupNobleHandlers(): void {
    // Prevent duplicate listeners if handlers are re-initialized
    this.removeNobleHandlers()

    // Store handlers as properties for later cleanup
    this.nobleStateHandler = (state: string) => {
      this.logger.debug('Noble state changed:', state)
      this.emit('state-change', state)

      if (state === 'poweredOn') {
        this.emit('ready')
      }
    }

    this.nobleDiscoverHandler = (peripheral: any) => {
      this.handleDiscovery(peripheral)
    }

    this.nobleScanStartHandler = () => {
      this.scanning = true
      this.logger.info('BLE scan started')
      this.emit('scan-start')
    }

    this.nobleScanStopHandler = () => {
      this.scanning = false
      this.logger.info('BLE scan stopped')
      this.emit('scan-stop')
    }

    this.noble.on('stateChange', this.nobleStateHandler)
    this.noble.on('discover', this.nobleDiscoverHandler)
    this.noble.on('scanStart', this.nobleScanStartHandler)
    this.noble.on('scanStop', this.nobleScanStopHandler)
  }

  /**
   * Remove Noble event handlers
   */
  private removeNobleHandlers(): void {
    if (this.nobleStateHandler) {
      this.noble.off('stateChange', this.nobleStateHandler)
    }
    if (this.nobleDiscoverHandler) {
      this.noble.off('discover', this.nobleDiscoverHandler)
    }
    if (this.nobleScanStartHandler) {
      this.noble.off('scanStart', this.nobleScanStartHandler)
    }
    if (this.nobleScanStopHandler) {
      this.noble.off('scanStop', this.nobleScanStopHandler)
    }

    this.nobleStateHandler = undefined
    this.nobleDiscoverHandler = undefined
    this.nobleScanStartHandler = undefined
    this.nobleScanStopHandler = undefined
  }

  /**
   * Handle device discovery
   */
  private handleDiscovery(peripheral: any): void {
    try {
      // Validate peripheral has required properties
      if (!peripheral || typeof peripheral !== 'object') {
        return
      }

      const { advertisement, rssi, connectable } = peripheral

      // Skip non-connectable devices
      if (connectable === false) {
        return
      }

      // Skip devices with invalid RSSI (typical range: -120 to 0 dBm)
      if (typeof rssi !== 'number' || rssi < -120 || rssi > 0) {
        return
      }

      // Validate advertisement object exists and has service data
      if (!advertisement || typeof advertisement !== 'object') {
        return
      }

      if (!Array.isArray(advertisement.serviceData) || advertisement.serviceData.length === 0) {
        return
      }

      for (const serviceDataItem of advertisement.serviceData) {
        // Validate service data item has required properties
        if (!serviceDataItem || typeof serviceDataItem !== 'object') {
          continue
        }

        // SwitchBot service UUID (current: fd3d, legacy: 000d)
        const uuid = typeof serviceDataItem.uuid === 'string' ? serviceDataItem.uuid.toLowerCase() : ''
        const isSwitchBotUUID = uuid === 'fd3d'
          || uuid === '0000fd3d-0000-1000-8000-00805f9b34fb'
          || uuid === '000d'
          || uuid === '0000000d-0000-1000-8000-00805f9b34fb'

        if (!isSwitchBotUUID) {
          continue
        }

        const serviceData = this.parseServiceData(serviceDataItem.data)

        if (!serviceData) {
          continue
        }

        const normalizedAddress = resolvePeripheralMac(peripheral)

        const fallbackId = typeof peripheral.id === 'string' && peripheral.id.length > 0
          ? peripheral.id
          : (normalizedAddress ? macToDeviceId(normalizedAddress) : undefined)

        if (!fallbackId) {
          this.logger.debug('Skipping BLE discovery with no address and no peripheral id')
          continue
        }

        // Determine if advertisement is encrypted (simple heuristic: check for known encrypted models or data length)
        // This can be refined as needed
        const isEncrypted = !!(serviceData && typeof serviceData.model === 'string' && serviceData.model.startsWith('!'))

        // Try to get a friendly model name (from serviceData or fallback to model code)
        const modelFriendlyName = serviceData?.modelName || serviceData?.model || undefined

        // Attempt to get the raw advertisement data (from serviceDataItem.data or peripheral.advertisement)
        const rawAdvData = serviceDataItem?.data || peripheral.advertisement?.serviceData?.[0]?.data || undefined

        const advertisement: BLEAdvertisement = {
          id: fallbackId,
          address: normalizedAddress,
          isAddressable: normalizedAddress !== undefined,
          rssi,
          serviceData,
          rawAdvData,
          isEncrypted,
          modelFriendlyName,
        }

        const discoveryKey = normalizedAddress ?? `id:${fallbackId}`
        // Merge with previous advertisement if present
        const prev = this.discoveredDevices.get(discoveryKey)
        if (prev) {
          const merged = mergeAdvertisement(prev, advertisement)
          this.discoveredDevices.set(discoveryKey, merged)
        } else {
          this.discoveredDevices.set(discoveryKey, advertisement)
        }
        this.discoveredModelCache.set(discoveryKey, serviceData.model)
        this.emit('discover', advertisement)
        this.logger.debug(`Discovered ${serviceData.modelName} at ${normalizedAddress ?? fallbackId}`)
      }
    } catch (error) {
      this.logger.error('Error handling discovery', error)
    }
  }

  /**
   * Parse service data from BLE advertisement
   */
  private parseServiceData(data: Buffer): BLEServiceData | null {
    if (!data || data.length < 1) {
      return null
    }

    try {
      const model = String.fromCharCode(data[0] & 0x7F)
      const modelName = DEVICE_MODEL_MAP[model]

      if (!modelName) {
        this.logger.debug(`Unknown device model: ${model} (0x${data[0].toString(16)})`)
        return null
      }

      // Basic service data structure
      const serviceData: BLEServiceData = {
        model,
        modelName,
        rawData: data,
      }

      // Parse battery if available (common across most devices)
      if (data.length > 2) {
        serviceData.battery = data[2] & 0x7F
      }

      // Model-specific advertisement parsing for status without active connection
      if (model === 'H' && data.length > 1) {
        // Bot (WoHand): infer mode/state from status bits
        serviceData.mode = (data[1] & 0x80) ? 'switch' : 'press'
        serviceData.state = (data[1] & 0x40) !== 0
      }

      if ((model === 'c' || model === 'C' || model === '{' || model === '[') && data.length > 4) {
        // Curtain/Curtain3
        serviceData.inMotion = (data[1] & 0x40) !== 0
        serviceData.position = Math.min(100, Math.max(0, data[3] & 0x7F))
        serviceData.lightLevel = data[4] & 0x7F
        serviceData.calibration = (data[1] & 0x20) !== 0
        if (data.length > 5) {
          serviceData.deviceChain = data[5] & 0x03
        }
      }

      if ((model === 'o' || model === 'O' || model === '\x11') && data.length > 1) {
        // Lock / Lock Pro
        const lockStatus = data[1] & 0x0F
        serviceData.status = lockStatus
        serviceData.doorOpen = (data[1] & 0x10) !== 0
        serviceData.calibration = (data[1] & 0x80) !== 0
        serviceData.lockState = lockStatus === 1
          ? 'unlocked'
          : lockStatus === 2
            ? 'jammed'
            : 'locked'
        if (data.length > 3) {
          serviceData.sequenceNumber = data[3]
        }
      }

      if ([';', '<', '\x1B', '\x1C', '\x0E'].includes(model) && data.length > 1) {
        // Relay Switch 1PM / Relay Switch 1
        serviceData.state = (data[1] & 0x01) === 0x01
        serviceData.channel2State = (data[1] & 0x02) === 0x02
        if (data.length > 3) {
          serviceData.sequenceNumber = data[3]
        }
      }

      return serviceData
    } catch (error) {
      this.logger.error('Error parsing service data', error)
      return null
    }
  }

  /**
   * Start scanning for devices
   */
  async startScan(options: BLEScanOptions = {}): Promise<void> {
    await this.ensureNoble()
    const { duration = BLE_SCAN_TIMEOUT, active = true } = options

    this.logger.info('Starting BLE scan', { duration, active })

    if (!this.noble) {
      throw new BLENotAvailableError('BLE not available - noble failed to initialize')
    }

    if (this.noble.state !== 'poweredOn') {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('BLE adapter not ready'))
        }, 5000)

        this.once('ready', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }

    // Clear previous discoveries if starting fresh
    this.discoveredDevices.clear()
    this.discoveredModelCache.clear()

    // Start scanning
    this.noble.startScanning([], active)

    // Auto-stop after duration
    if (duration > 0) {
      setTimeout(() => {
        if (this.scanning) {
          this.stopScan()
        }
      }, duration)
    }
  }

  /**
   * Stop scanning
   */
  stopScan(): void {
    if (this.scanning) {
      this.noble.stopScanning()
    }
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.stopScan()
    this.removeNobleHandlers()
    this.discoveredDevices.clear()
    this.discoveredModelCache.clear()
  }

  /**
   * Get all discovered devices
   */
  getDiscoveredDevices(): BLEAdvertisement[] {
    return [...this.discoveredDevices.values()]
  }

  /**
   * Get discovered device by MAC or BLE ID
   */
  getDevice(mac: string, bleId?: string): BLEAdvertisement | undefined {
    // Try MAC lookup first
    const byMac = this.discoveredDevices.get(normalizeMAC(mac))
    if (byMac) {
      return byMac
    }

    // Fall back to ID-based lookup
    if (bleId) {
      return this.discoveredDevices.get(`id:${bleId}`)
    }

    return undefined
  }

  /**
   * Check if currently scanning
   */
  isScanning(): boolean {
    return this.scanning
  }

  /**
   * Wait for specific device
   */
  async waitForDevice(mac: string, timeoutMs = BLE_SCAN_TIMEOUT, bleId?: string): Promise<BLEAdvertisement> {
    const normalizedMac = normalizeMAC(mac)

    // Check if already discovered (try MAC first, then ID)
    const existing = this.discoveredDevices.get(normalizedMac) || (bleId ? this.discoveredDevices.get(`id:${bleId}`) : undefined)
    if (existing) {
      return existing
    }

    // Wait for discovery
    return withTimeout(
      new Promise<BLEAdvertisement>((resolve) => {
        const handler = (advertisement: BLEAdvertisement) => {
          // Match by address (if available) or by ID
          const matches = (advertisement.address && normalizeMAC(advertisement.address) === normalizedMac)
            || (bleId && advertisement.id === bleId)
          if (matches) {
            this.off('discover', handler)
            resolve(advertisement)
          }
        }
        this.on('discover', handler)
      }),
      timeoutMs,
      `Device ${mac} not found within ${timeoutMs}ms`,
    )
  }
}

interface EncryptedSession {
  mode: 'ctr' | 'gcm'
  iv: Buffer
}

/** Parse the reply to the encryption init command (pySwitchbot _ensure_encryption_initialized) */
export function parseEncryptionInit(reply: Buffer | undefined, mac: string): EncryptedSession {
  if (!reply || reply[0] !== 0x01) {
    throw new CommandFailedError(`Encryption init rejected by ${mac}${reply?.length ? `: ${reply.toString('hex')}` : ''}`, 'ble')
  }
  const modeByte = reply[2]
  if (modeByte !== 0 && modeByte !== 1) {
    throw new CommandFailedError(`Unsupported encryption mode ${modeByte} from ${mac}`, 'ble')
  }
  const mode = modeByte === 1 ? 'gcm' : 'ctr'
  const iv = mode === 'gcm' ? reply.subarray(4, reply.length - 4) : reply.subarray(4)
  const expected = mode === 'gcm' ? 12 : 16
  if (iv.length !== expected) {
    throw new CommandFailedError(`Invalid IV length ${iv.length} for ${mode.toUpperCase()} from ${mac} (expected ${expected})`, 'ble')
  }
  return { mode, iv: Buffer.from(iv) }
}

/** Encrypt a command body; returns the ciphertext and the 2-byte packet header */
export function encryptPayload(key: Buffer, session: EncryptedSession, data: Buffer): { ciphertext: Buffer, header: Buffer } {
  if (data.length === 0) {
    return { ciphertext: Buffer.alloc(0), header: Buffer.alloc(0) }
  }
  if (session.mode === 'gcm') {
    const cipher = createCipheriv('aes-128-gcm', key, session.iv)
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()])
    return { ciphertext, header: cipher.getAuthTag().subarray(0, 2) }
  }
  const cipher = createCipheriv('aes-128-ctr', key, session.iv)
  return { ciphertext: Buffer.concat([cipher.update(data), cipher.final()]), header: session.iv.subarray(0, 2) }
}

/** Decrypt a reply payload. GCM replies carry only a partial tag, so the tag is not checked. */
export function decryptPayload(key: Buffer, session: EncryptedSession, data: Buffer): Buffer {
  if (data.length === 0) {
    return Buffer.alloc(0)
  }
  if (session.mode === 'gcm') {
    const decipher = createDecipheriv('aes-128-gcm', key, session.iv)
    decipher.setAuthTag(Buffer.alloc(16))
    return decipher.update(data)
  }
  const decipher = createDecipheriv('aes-128-ctr', key, session.iv)
  return Buffer.concat([decipher.update(data), decipher.final()])
}

/** Increment an IV as a big-endian integer */
function incrementIv(iv: Buffer): Buffer {
  const next = Buffer.from(iv)
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i] === 0xFF) {
      next[i] = 0
    } else {
      next[i]++
      break
    }
  }
  return next
}

/**
 * BLE Connection for communicating with SwitchBot devices
 */
export class BLEConnection {
  private noble: any
  private logger: Logger
  private connections: Map<string, any> = new Map() // Map of MAC -> Peripheral
  private characteristics: Map<string, { write: any, notify: any }> = new Map()
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private operationLocks: Map<string, Promise<void>> = new Map()
  private encryptionConfig: Map<string, { key: Buffer, iv: Buffer, mode: 'ctr' | 'gcm' }> = new Map()
  // pySwitchbot-style encrypted sessions (IV and mode reported by the device), reset on disconnect
  private encryptedSessions: Map<string, EncryptedSession> = new Map()
  private notificationHandlers: Map<string, Set<(payload: Buffer) => void>> = new Map()
  // noble keeps only the latest pending subscribe callback per characteristic, so share in-flight subscribes
  private pendingSubscriptions: WeakMap<object, Promise<void>> = new WeakMap()
  private persistentConnectionMs = 8500
  private noblePromise: Promise<any> | null = null

  // Notification handling
  private notificationFutures: Map<string, { resolve: (payload: Buffer) => void, reject: (err: Error) => void, timer: NodeJS.Timeout }> = new Map()
  // Notify characteristics that already have our 'data' listener (rediscovery yields new objects)
  private notifyListeners: WeakSet<object> = new WeakSet()

  // Expected disconnect tracking
  private expectedDisconnects: Set<string> = new Set()
  /**
   * Mark the next disconnect started by the device as expected (for example after a command that
   * restarts it), so it is not logged as unexpected
   */
  markExpectedDisconnect(mac: string): void {
    this.expectedDisconnects.add(normalizeMAC(mac))
  }

  constructor(options: { noble?: any, logLevel?: number, logger?: Logger } = {}) {
    this.logger = options.logger ?? new Logger('BLEConnection', options.logLevel)
    this.noble = options.noble

    if (!this.noble) {
      this.initializeNoble().catch((error) => {
        this.logger.error('Failed to initialize Noble', error)
      })
    }
  }

  /**
   * Initialize Noble lazily
   */
  private async initializeNoble(): Promise<void> {
    if (this.noble) {
      return
    }

    if (this.noblePromise) {
      // Wait for existing initialization to complete
      this.noble = await this.noblePromise
      return
    }

    this.noblePromise = (async () => {
      try {
        const module = await import('@stoprocent/noble')
        return module.default
      } catch (error) {
        throw new BLENotAvailableError('BLE not supported on this platform or @stoprocent/noble not installed')
      }
    })()

    try {
      this.noble = await this.noblePromise
    } catch (error) {
      throw new BLENotAvailableError('BLE not supported on this platform or @stoprocent/noble not installed')
    }
  }

  /**
   * Ensure Noble is loaded before operations
   */
  private async ensureNoble(): Promise<void> {
    if (!this.noble) {
      await this.initializeNoble()
    }

    if (!this.noble) {
      throw new BLENotAvailableError('BLE not available - noble failed to initialize')
    }
  }

  private async withMacLock<T>(mac: string, fn: () => Promise<T>): Promise<T> {
    const normalizedMac = normalizeMAC(mac)
    const previousLock = this.operationLocks.get(normalizedMac) ?? Promise.resolve()
    let releaseCurrent: () => void = () => {}
    const currentLock = new Promise<void>((resolve) => {
      releaseCurrent = resolve
    })

    const chainedLock = previousLock.then(() => currentLock)
    this.operationLocks.set(normalizedMac, chainedLock)
    await previousLock

    try {
      return await fn()
    } finally {
      releaseCurrent()
      if (this.operationLocks.get(normalizedMac) === chainedLock) {
        this.operationLocks.delete(normalizedMac)
      }
    }
  }

  private clearDisconnectTimer(mac: string): void {
    const existingTimer = this.disconnectTimers.get(mac)
    if (existingTimer) {
      clearTimeout(existingTimer)
      this.disconnectTimers.delete(mac)
    }
  }

  private scheduleDisconnect(mac: string): void {
    this.clearDisconnectTimer(mac)
    const timer = setTimeout(() => {
      this.disconnect(mac).catch((error) => {
        this.logger.debug(`Auto-disconnect failed for ${mac}`, error)
      })
    }, this.persistentConnectionMs)
    this.disconnectTimers.set(mac, timer)
  }

  setPersistentConnectionTimeout(timeoutMs: number): void {
    this.persistentConnectionMs = Math.max(1000, timeoutMs)
  }

  setEncryption(mac: string, keyHex: string, ivHex: string, mode: 'auto' | 'ctr' | 'gcm' = 'auto'): void {
    const normalizedMac = normalizeMAC(mac)
    const key = Buffer.from(keyHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')

    if (key.length !== 16) {
      throw new CommandFailedError('Invalid BLE encryption key length (expected 16 bytes)', 'ble')
    }

    const resolvedMode: 'ctr' | 'gcm' = mode === 'auto'
      ? (iv.length === 12 ? 'gcm' : 'ctr')
      : mode

    const expectedIvLength = resolvedMode === 'gcm' ? 12 : 16
    if (iv.length !== expectedIvLength) {
      throw new CommandFailedError(`Invalid IV length for ${resolvedMode.toUpperCase()} mode`, 'ble')
    }

    this.encryptionConfig.set(normalizedMac, { key, iv: Buffer.from(iv), mode: resolvedMode })
  }

  clearEncryption(mac: string): void {
    this.encryptionConfig.delete(normalizeMAC(mac))
  }

  private getKnownPeripherals(): any[] {
    const candidates = [this.noble?.peripherals, this.noble?._peripherals]

    for (const peripherals of candidates) {
      if (Array.isArray(peripherals)) {
        return peripherals
      }
      if (peripherals instanceof Map) {
        return [...peripherals.values()]
      }
      if (peripherals && typeof peripherals === 'object') {
        return Object.values(peripherals)
      }
    }

    return []
  }

  private incrementIv(iv: Buffer): Buffer {
    const nextIv = Buffer.from(iv)
    for (let i = nextIv.length - 1; i >= 0; i--) {
      if ((nextIv[i] ?? 0) === 0xFF) {
        nextIv[i] = 0x00
      } else {
        nextIv[i] = (nextIv[i] ?? 0) + 1
        break
      }
    }
    return nextIv
  }

  private encryptIfConfigured(mac: string, data: Buffer): Buffer {
    const normalizedMac = normalizeMAC(mac)
    const config = this.encryptionConfig.get(normalizedMac)

    if (!config) {
      return data
    }

    if (config.mode === 'gcm') {
      const cipher = createCipheriv('aes-128-gcm', config.key, config.iv)
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
      const tag = cipher.getAuthTag().subarray(0, 2)
      this.encryptionConfig.set(normalizedMac, {
        ...config,
        iv: this.incrementIv(config.iv),
      })
      return Buffer.concat([encrypted, tag])
    }

    const cipher = createCipheriv('aes-128-ctr', config.key, config.iv)
    return Buffer.concat([cipher.update(data), cipher.final()])
  }

  private validateCommandResult(response: Buffer, mac: string): void {
    if (!response || response.length === 0) {
      throw new CommandFailedError(`Empty BLE response from ${mac}`, 'ble')
    }

    // Byte 0 is the status; anything after it is payload (battery, firmware, position...), so it
    // must not be read as a status code. Matches pySwitchbot's _check_command_result.
    const status = response[0]

    if (status === 0x07) {
      throw new CommandFailedError(`BLE command rejected by ${mac}: password required`, 'ble')
    }

    if (status === 0x09) {
      throw new CommandFailedError(`BLE command rejected by ${mac}: password incorrect`, 'ble')
    }

    // 0x01 OK, 0x05 command not supported in the current mode (a Bot in add-on mode), 0x06 low battery
    const acknowledged = status === 0x01 || status === 0x05 || status === 0x06
    if (!acknowledged) {
      throw new CommandFailedError(`Unexpected BLE response from ${mac}: ${response.toString('hex')}`, 'ble')
    }
  }

  async sendCommand(
    mac: string,
    data: Buffer,
    options: {
      expectResponse?: boolean
      validateResponse?: boolean
      responseTimeoutMs?: number
      expectNotification?: boolean
      notificationTimeoutMs?: number
    } = {},
  ): Promise<Buffer | undefined> {
    const normalizedMac = normalizeMAC(mac)
    const {
      expectResponse = true,
      validateResponse = true,
      responseTimeoutMs = 5000,
      expectNotification = false,
      notificationTimeoutMs = 5000,
    } = options

    return this.withMacLock(normalizedMac, async () => {
      const payload = this.encryptIfConfigured(normalizedMac, data)
      return this.exchangeLocked(normalizedMac, payload, { expectResponse, validateResponse, responseTimeoutMs, expectNotification, notificationTimeoutMs })
    })
  }

  /**
   * Write a packet and return the device's reply. The caller holds the MAC lock.
   */
  private async exchangeLocked(
    normalizedMac: string,
    payload: Buffer,
    options: { expectResponse: boolean, validateResponse: boolean, responseTimeoutMs: number, expectNotification: boolean, notificationTimeoutMs: number },
  ): Promise<Buffer | undefined> {
    const { expectResponse, validateResponse, responseTimeoutMs, expectNotification, notificationTimeoutMs } = options
    if (!expectNotification && !expectResponse && !validateResponse) {
      await this.write(normalizedMac, payload)
      return undefined
    }

    // A SwitchBot device answers a command with a notification on the notify characteristic
    // (pySwitchbot _execute_command_locked). Start waiting before writing, so a fast reply is
    // not missed. Backends without notification events fall back to reading the characteristic.
    const reply = await this.prepareReply(normalizedMac, expectNotification ? notificationTimeoutMs : responseTimeoutMs)
    try {
      await this.write(normalizedMac, payload)
    } catch (error) {
      reply?.cancel()
      throw error
    }

    const response = reply
      ? await reply.promise
      : await withTimeout(this.read(normalizedMac), responseTimeoutMs, `BLE response timeout from ${normalizedMac}`)

    if (validateResponse && !expectNotification) {
      this.validateCommandResult(response, normalizedMac)
    }

    return response
  }

  /**
   * Send a command to an encrypted device and return its decrypted reply, using the protocol in
   * pySwitchbot's SwitchbotEncryptedDevice:
   *
   * - Session setup, once per connection: send `57 000000 0F2103 <keyId>` unencrypted. The reply is
   *   status (0x01), byte 2 the AES mode (0 CTR, 1 GCM), then the IV (CTR: bytes 4..; GCM: 12 bytes
   *   from byte 4).
   * - Command `57 <rest>` is sent as `57 <keyId> <2-byte header> <AES(rest)>`, where the header is
   *   IV[0..2] for CTR or the first 2 bytes of the GCM tag.
   * - The reply is `<status> <3 bytes> <AES(payload)>`; this returns `<status> <payload>`. In GCM
   *   mode the IV is incremented after every command.
   */
  async sendEncryptedCommand(
    mac: string,
    command: Buffer,
    options: {
      keyId: string
      encryptionKey: string
      validateResponse?: boolean
      responseTimeoutMs?: number
    },
  ): Promise<Buffer> {
    const normalizedMac = normalizeMAC(mac)
    const key = Buffer.from(options.encryptionKey, 'hex')
    const keyId = Buffer.from(options.keyId, 'hex')
    if (key.length !== 16) {
      throw new CommandFailedError('Invalid BLE encryption key (expected 32 hex characters)', 'ble')
    }
    if (keyId.length !== 1 || options.keyId.length !== 2) {
      throw new CommandFailedError('Invalid BLE key id (expected 2 hex characters)', 'ble')
    }
    if (command.length < 1) {
      throw new CommandFailedError('Empty BLE command', 'ble')
    }
    const exchange = {
      expectResponse: true,
      validateResponse: options.validateResponse ?? true,
      responseTimeoutMs: options.responseTimeoutMs ?? 5000,
      expectNotification: false,
      notificationTimeoutMs: 5000,
    }

    return this.withMacLock(normalizedMac, async () => {
      let session = this.encryptedSessions.get(normalizedMac)
      if (!session) {
        const init = await this.exchangeLocked(
          normalizedMac,
          Buffer.from([0x57, 0x00, 0x00, 0x00, 0x0F, 0x21, 0x03, keyId[0]]),
          { ...exchange, validateResponse: false },
        )
        session = parseEncryptionInit(init, normalizedMac)
        this.encryptedSessions.set(normalizedMac, session)
      }

      const { ciphertext, header } = encryptPayload(key, session, command.subarray(1))
      const packet = Buffer.concat([command.subarray(0, 1), keyId, header, ciphertext])
      const reply = await this.exchangeLocked(normalizedMac, packet, exchange)
      if (!reply || reply.length === 0) {
        throw new CommandFailedError(`Empty BLE response from ${normalizedMac}`, 'ble')
      }
      const decrypted = Buffer.concat([reply.subarray(0, 1), decryptPayload(key, session, reply.subarray(4))])
      if (session.mode === 'gcm') {
        session.iv = incrementIv(session.iv)
      }
      return decrypted
    })
  }

  /**
   * Register a wait for the next notification from a device, before the command is written.
   * Returns undefined when the notify characteristic emits no events (then the caller reads it).
   */
  private async prepareReply(mac: string, timeoutMs: number): Promise<{ promise: Promise<Buffer>, cancel: () => void } | undefined> {
    if (!this.connections.has(mac)) {
      await this.connect(mac)
    }
    let chars = this.characteristics.get(mac)
    if (!chars) {
      await this.discoverCharacteristics(mac, this.connections.get(mac))
      chars = this.characteristics.get(mac)
    }
    if (!chars?.notify || typeof chars.notify.on !== 'function') {
      return undefined
    }
    this.ensureNotifyListener(mac, chars.notify)

    const previous = this.notificationFutures.get(mac)
    if (previous) {
      clearTimeout(previous.timer)
      previous.reject(new Error(`Superseded by a newer command for ${mac}`))
    }

    let future!: { resolve: (payload: Buffer) => void, reject: (err: Error) => void, timer: NodeJS.Timeout }
    const promise = new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.notificationFutures.get(mac) === future) {
          this.notificationFutures.delete(mac)
        }
        reject(new Error(`Notification timeout (${timeoutMs}ms) for ${mac}`))
      }, timeoutMs)
      future = { resolve, reject, timer }
    })
    // Avoid an unhandled rejection if the caller stops waiting (e.g. the write failed)
    promise.catch(() => {})
    this.notificationFutures.set(mac, future)
    // TEST HOOK: Notify when the notification future is set
    if (typeof (this as any)._onNotificationFutureSet === 'function') {
      (this as any)._onNotificationFutureSet(mac)
    }

    const cancel = () => {
      clearTimeout(future.timer)
      if (this.notificationFutures.get(mac) === future) {
        this.notificationFutures.delete(mac)
      }
    }
    return { promise, cancel }
  }

  /**
   * Attach one 'data' listener per notify characteristic: a notification answers the pending
   * command if there is one, otherwise it goes to subscribeNotifications() handlers.
   */
  private ensureNotifyListener(mac: string, notifyChar: any): void {
    if (this.notifyListeners.has(notifyChar)) {
      return
    }
    this.notifyListeners.add(notifyChar)
    notifyChar.on('data', (payload: Buffer) => {
      const future = this.notificationFutures.get(mac)
      if (future) {
        clearTimeout(future.timer)
        this.notificationFutures.delete(mac)
        future.resolve(payload)
        return
      }
      this.logger.debug(`Unsolicited notification from ${mac}: ${payload.toString('hex')}`)
      for (const listener of this.notificationHandlers.get(mac) ?? []) {
        listener(payload)
      }
    })
  }

  async subscribeNotifications(mac: string, handler: (payload: Buffer) => void): Promise<void> {
    const normalizedMac = normalizeMAC(mac)

    if (!this.connections.has(normalizedMac)) {
      await this.connect(normalizedMac)
    }

    const chars = this.characteristics.get(normalizedMac)
    if (!chars?.notify) {
      throw new CommandFailedError(`Notify characteristic not available for ${normalizedMac}`, 'ble')
    }

    if (!this.notificationHandlers.has(normalizedMac)) {
      this.notificationHandlers.set(normalizedMac, new Set())
    }
    if (typeof chars.notify.on === 'function') {
      this.ensureNotifyListener(normalizedMac, chars.notify)
    }

    // Register first so notifications arriving as soon as the CCCD is enabled are delivered.
    // noble treats subscribing an already-notifying characteristic as a no-op.
    const handlers = this.notificationHandlers.get(normalizedMac)!
    const addedHandler = !handlers.has(handler)
    handlers.add(handler)
    try {
      await this.subscribeToNotify(chars.notify)
    } catch (error) {
      // Only roll back our own registration; keep the set, it marks the 'data' listener as attached
      if (addedHandler) {
        handlers.delete(handler)
      }
      throw error
    }
  }

  /**
   * Enable notifications on the notify characteristic (no-op if the backend has no subscribe)
   */
  private async subscribeToNotify(notifyChar: any): Promise<void> {
    if (typeof notifyChar?.subscribe !== 'function') {
      return
    }
    const pending = this.pendingSubscriptions.get(notifyChar)
    if (pending) {
      return pending
    }
    const subscription = withTimeout(
      new Promise<void>((resolve, reject) => {
        notifyChar.subscribe((error: Error | null) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      }),
      BLE_COMMAND_TIMEOUT,
      'Notify subscription timed out',
    ).finally(() => this.pendingSubscriptions.delete(notifyChar))
    this.pendingSubscriptions.set(notifyChar, subscription)
    return subscription
  }

  unsubscribeNotifications(mac: string, handler: (payload: Buffer) => void): void {
    const normalizedMac = normalizeMAC(mac)
    const handlers = this.notificationHandlers.get(normalizedMac)
    if (!handlers) {
      return
    }

    handlers.delete(handler)
    if (handlers.size === 0) {
      this.notificationHandlers.delete(normalizedMac)
    }
  }

  /**
   * Connect to a device
   */
  async connect(mac: string): Promise<void> {
    await this.ensureNoble()
    const normalizedMac = normalizeMAC(mac)

    // Already connected?
    if (this.connections.has(normalizedMac)) {
      this.clearDisconnectTimer(normalizedMac)
      this.logger.debug(`Already connected to ${mac}`)
      return
    }

    this.logger.info(`Connecting to ${mac}`)

    // Find peripheral (by address or ID)
    const peripherals = this.getKnownPeripherals()
    let peripheral: any

    // Try to find by normalized MAC first
    if (mac.startsWith('id:')) {
      // ID-based lookup: extract the ID and find by peripheral.id
      const bleId = mac.substring(3)
      // Look through peripherals to find matching ID
      peripheral = peripherals.find((p: any) => p.id === bleId)
    } else {
      // MAC-based lookup (falls back to manufacturer data on macOS, see resolvePeripheralMac)
      peripheral = peripherals.find((p: any) => resolvePeripheralMac(p) === normalizedMac)
    }

    if (!peripheral) {
      throw new DeviceNotFoundError(mac)
    }

    // Connect
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        peripheral.connect((error: Error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      }),
      BLE_CONNECT_TIMEOUT,
      `Connection to ${mac} timed out`,
    )

    this.connections.set(normalizedMac, peripheral)
    this.clearDisconnectTimer(normalizedMac)
    this.expectedDisconnects.delete(normalizedMac)
    this.watchForDisconnect(normalizedMac, mac, peripheral)
    this.logger.info(`Connected to ${mac}`)

    // Discover characteristics (may throw)
    try {
      await this.discoverCharacteristics(normalizedMac, peripheral)
    } catch (error) {
      // Clean up the partial connection, and disconnect to avoid leaking an active BLE link
      await this.disconnect(normalizedMac)

      throw error
    }
  }

  /**
   * Discover service characteristics
   */
  private async discoverCharacteristics(mac: string, peripheral: any): Promise<void> {
    const { characteristics } = await withTimeout(
      new Promise<any>((resolve, reject) => {
        peripheral.discoverSomeServicesAndCharacteristics(
          [BLE_SERVICE_UUID],
          [BLE_WRITE_CHARACTERISTIC_UUID, BLE_NOTIFY_CHARACTERISTIC_UUID],
          (error: Error, services: any[], chars: any[]) => {
            if (error) {
              reject(error)
            } else {
              resolve({ services, characteristics: chars })
            }
          },
        )
      }),
      BLE_CONNECT_TIMEOUT,
      'Characteristic discovery timed out',
    )

    const writeChar = characteristics.find((c: any) => c.uuid === BLE_WRITE_CHARACTERISTIC_UUID.replace(UUID_DASH_REGEX, ''))
    const notifyChar = characteristics.find((c: any) => c.uuid === BLE_NOTIFY_CHARACTERISTIC_UUID.replace(UUID_DASH_REGEX, ''))

    if (!writeChar || !notifyChar) {
      throw new Error('Required characteristics not found')
    }

    // SwitchBot devices ignore writes until notifications are enabled on the notify characteristic.
    // Best effort: a backend that rejects the subscription keeps the previous (unsubscribed) behavior.
    try {
      await this.subscribeToNotify(notifyChar)
    } catch (error) {
      this.logger.warn(`Failed to enable notifications for ${mac}; commands may be ignored by the device`, error)
    }

    this.characteristics.set(mac, { write: writeChar, notify: notifyChar })
    this.logger.debug(`Characteristics discovered for ${mac}`)
  }

  /**
   * Forget the connection state for a device: characteristics, encryption session, notification
   * handlers and any pending reply.
   */
  private dropConnectionState(normalizedMac: string, reason: string): void {
    this.connections.delete(normalizedMac)
    this.characteristics.delete(normalizedMac)
    this.clearDisconnectTimer(normalizedMac)
    // Reset encryption state (IV, cipher, mode) for this device
    this.clearEncryption(normalizedMac)
    this.encryptedSessions.delete(normalizedMac)
    this.notificationHandlers.delete(normalizedMac)
    const pending = this.notificationFutures.get(normalizedMac)
    if (pending) {
      clearTimeout(pending.timer)
      this.notificationFutures.delete(normalizedMac)
      pending.reject(new Error(reason))
    }
  }

  /**
   * Watch for the device dropping the link (out of range, powered off, rebooted). Without this the
   * stale peripheral stays in `connections` and the next command is sent over a dead link.
   */
  private watchForDisconnect(normalizedMac: string, mac: string, peripheral: any): void {
    if (typeof peripheral?.once !== 'function') {
      return
    }
    peripheral.once('disconnect', () => {
      const expected = this.expectedDisconnects.delete(normalizedMac)
      if (this.connections.get(normalizedMac) !== peripheral) {
        return
      }
      if (expected) {
        this.logger.debug(`${mac} disconnected`)
      } else {
        this.logger.warn(`Unexpected disconnect from ${mac}`)
      }
      this.dropConnectionState(normalizedMac, `${mac} disconnected while waiting for a reply`)
    })
  }

  /**
   * Disconnect from a device. Disconnects started here (idle timeout, disconnectAll, a failed
   * connection) are expected and logged at debug level; only a disconnect the device starts is
   * reported as unexpected.
   */
  async disconnect(mac: string): Promise<void> {
    const normalizedMac = normalizeMAC(mac)
    const peripheral = this.connections.get(normalizedMac)
    this.dropConnectionState(normalizedMac, `Disconnected from ${mac} while waiting for a reply`)

    if (!peripheral) {
      this.expectedDisconnects.delete(normalizedMac)
      this.logger.debug(`Not connected to ${mac}`)
      return
    }

    // Consumed by the 'disconnect' listener from watchForDisconnect
    this.expectedDisconnects.add(normalizedMac)
    await new Promise<void>((resolve) => {
      peripheral.disconnect(() => {
        this.logger.debug(`Disconnected from ${mac}`)
        resolve()
      })
    })
    if (typeof peripheral.once !== 'function') {
      this.expectedDisconnects.delete(normalizedMac)
    }
  }


  /**
   * Write data to device
   */
  async write(mac: string, data: Buffer): Promise<void> {
    const normalizedMac = normalizeMAC(mac)

    // Ensure connected
    if (!this.connections.has(normalizedMac)) {
      await this.connect(mac)
    }

    let chars = this.characteristics.get(normalizedMac)
    if (!chars) {
      await this.discoverCharacteristics(normalizedMac, this.connections.get(normalizedMac))
      chars = this.characteristics.get(normalizedMac)
      if (!chars) {
        throw new Error(`Characteristics not available for ${mac}`)
      }
    }

    this.logger.debug(`Writing to ${mac}:`, data.toString('hex'))

    try {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          (chars!.write).write(data, false, (error: Error | null) => {
            if (error) {
              reject(error)
            } else {
              this.scheduleDisconnect(normalizedMac)
              resolve()
            }
          })
        }),
        BLE_COMMAND_TIMEOUT,
        'Write operation timed out',
      )
    } catch (err: any) {
      // If error is characteristic-related, clear cache and retry once
      if (CHARACTERISTIC_REGEX.test(err?.message || '')) {
        this.characteristics.delete(normalizedMac)
        await this.discoverCharacteristics(normalizedMac, this.connections.get(normalizedMac))
        chars = this.characteristics.get(normalizedMac)
        if (!chars) {
          throw err
        }
        // Retry once
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            (chars!.write).write(data, false, (error: Error | null) => {
              if (error) {
                reject(error)
              } else {
                this.scheduleDisconnect(normalizedMac)
                resolve()
              }
            })
          }),
          BLE_COMMAND_TIMEOUT,
          'Write operation timed out',
        )
      } else {
        throw err
      }
    }
  }

  /**
   * Read data from device
   */
  async read(mac: string): Promise<Buffer> {
    const normalizedMac = normalizeMAC(mac)

    // Ensure connected
    if (!this.connections.has(normalizedMac)) {
      await this.connect(mac)
    }

    let chars = this.characteristics.get(normalizedMac)
    if (!chars) {
      await this.discoverCharacteristics(normalizedMac, this.connections.get(normalizedMac))
      chars = this.characteristics.get(normalizedMac)
      if (!chars) {
        throw new Error(`Characteristics not available for ${mac}`)
      }
    }

    this.logger.debug(`Reading from ${mac}`)

    try {
      return await withTimeout(
        new Promise<Buffer>((resolve, reject) => {
          (chars!.notify).read((error: Error, data: Buffer) => {
            if (error) {
              reject(error)
            } else {
              this.scheduleDisconnect(normalizedMac)
              resolve(data)
            }
          })
        }),
        BLE_COMMAND_TIMEOUT,
        'Read operation timed out',
      )
    } catch (err: any) {
      // If error is characteristic-related, clear cache and retry once
      if (CHARACTERISTIC_REGEX.test(err?.message || '')) {
        this.characteristics.delete(normalizedMac)
        await this.discoverCharacteristics(normalizedMac, this.connections.get(normalizedMac))
        chars = this.characteristics.get(normalizedMac)
        if (!chars) {
          throw err
        }
        // Retry once
        return await withTimeout(
          new Promise<Buffer>((resolve, reject) => {
            (chars!.notify).read((error: Error, data: Buffer) => {
              if (error) {
                reject(error)
              } else {
                this.scheduleDisconnect(normalizedMac)
                resolve(data)
              }
            })
          }),
          BLE_COMMAND_TIMEOUT,
          'Read operation timed out',
        )
      } else {
        throw err
      }
    }
  }

  /**
   * Check if connected to device
   */
  isConnected(mac: string): boolean {
    return this.connections.has(normalizeMAC(mac))
  }

  /**
   * Disconnect all devices
   */
  async disconnectAll(): Promise<void> {
    const macs = [...this.connections.keys()]
    await Promise.all(macs.map(mac => this.disconnect(mac)))
  }

  /**
   * Get connected device count
   */
  getConnectionCount(): number {
    return this.connections.size
  }
}
