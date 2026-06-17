/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-hand.ts: SwitchBot v4.0.0 - Bot (WoHand) Device
 */

import type { OpenAPIClient } from '../api.js'
import type { BLEConnection } from '../ble.js'
import type { BotCommands, BotStatus } from '../types/device.js'
import type { DeviceInfo } from '../types/index.js'

import { DEVICE_COMMANDS } from '../settings.js'
import { BOT_BLE_ACTIONS, buildBotBleCommand, parseBotBleResponse, validateBotPassword } from '../utils/index.js'
import { DeviceOverrideStateDuringConnection } from './device-override-state-during-connection.js'

const BOT_BLE_COMMAND_WRITE_ONLY = true

/**
 * Bot (WoHand) Device - Press or switch button device
 * Supports optional BLE password protection
 */
export class WoHand extends DeviceOverrideStateDuringConnection implements BotCommands {
  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<BotStatus> {
    return this.getStatusWithFallback<BotStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        power: bleData.state ? 'on' : 'off',
        state: bleData.state,
        mode: bleData.mode,
        battery: bleData.battery,
        version: bleData.version,
        updatedAt: new Date(),
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        power: apiStatus.power || 'off',
        state: apiStatus.state,
        mode: apiStatus.mode,
        battery: apiStatus.battery,
        version: apiStatus.version,
        updatedAt: new Date(),
      }),
    )
  }

  private password?: string

  constructor(
    info: DeviceInfo,
    options: {
      bleConnection?: BLEConnection
      apiClient?: OpenAPIClient
      enableFallback?: boolean
      preferredConnection?: 'ble' | 'api'
      enableConnectionIntelligence?: boolean
      enableCircuitBreaker?: boolean
      enableRetry?: boolean
      password?: string
      logLevel?: number
    } = {},
  ) {
    super(info, options)

    // Validate and store password if provided
    if (options.password) {
      try {
        validateBotPassword(options.password)
        this.password = options.password
        this.logger.info('Bot password configured')
      } catch (error) {
        this.logger.error('Invalid password format', error)
        throw error
      }
    }
  }

  /**
   * Turn on (switch mode)
   */
  async turnOn(): Promise<boolean> {
    // Use password-protected command if password is configured
    if (this.password) {
      return await this.executePasswordCommand(BOT_BLE_ACTIONS.TURN_ON)
    }

    // Standard command
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BOT.TURN_ON,
      'turnOn',
      undefined,
      BOT_BLE_COMMAND_WRITE_ONLY,
    )
    return result.success
  }

  /**
   * Turn off (switch mode)
   */
  async turnOff(): Promise<boolean> {
    // Use password-protected command if password is configured
    if (this.password) {
      return await this.executePasswordCommand(BOT_BLE_ACTIONS.TURN_OFF)
    }

    // Standard command
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BOT.TURN_OFF,
      'turnOff',
      undefined,
      BOT_BLE_COMMAND_WRITE_ONLY,
    )
    return result.success
  }

  /**
   * Press (press mode)
   */
  async press(): Promise<boolean> {
    // Use password-protected command if password is configured
    if (this.password) {
      return await this.executePasswordCommand(BOT_BLE_ACTIONS.PRESS)
    }

    // Standard command
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BOT.PRESS,
      'press',
      undefined,
      BOT_BLE_COMMAND_WRITE_ONLY,
    )
    return result.success
  }

  /**
   * Set Bot mode
   */
  async setMode(mode: 'press' | 'switch'): Promise<import('../types/index.js').CommandResult> {
    const modeByte = mode === 'switch' ? 0x01 : 0x00
    return this.sendCommand(
      [...DEVICE_COMMANDS.BOT.SET_MODE, modeByte],
      'setMode',
      mode,
    )
  }

  /**
   * Set Bot long-press duration (1-255 deciseconds)
   */
  async setLongPress(duration: number): Promise<boolean> {
    const clampedDuration = Math.min(255, Math.max(1, Math.trunc(duration)))
    const result = await this.sendCommand(
      [...DEVICE_COMMANDS.BOT.SET_LONG_PRESS, clampedDuration],
      'setLongPress',
      clampedDuration,
    )
    return result.success
  }

  /**
   * Raise Bot arm
   */
  async handUp(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BOT.UP,
      'turnOff',
      undefined,
      BOT_BLE_COMMAND_WRITE_ONLY,
    )
    return result.success
  }

  /**
   * Lower Bot arm
   */
  async handDown(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BOT.DOWN,
      'turnOn',
      undefined,
      BOT_BLE_COMMAND_WRITE_ONLY,
    )
    return result.success
  }

  /**
   * Execute password-protected Bot command
   * @param action - Bot action to perform
   * @returns True if command was successful
   */
  private async executePasswordCommand(action: 0x00 | 0x01 | 0x02): Promise<boolean> {
    if (!this.password) {
      throw new Error('Password not configured for this Bot device')
    }

    if (!this.hasBLE()) {
      throw new Error('BLE not available - password-protected commands require BLE connection')
    }

    try {
      // Build encrypted command
      const command = buildBotBleCommand(action, this.password)
      this.logger.debug('Sending password-protected command', { action })

      // Send command via BLE
      const mac = this.info.mac ?? `id:${this.info.bleId}`
      await this.bleConnection!.write(mac, command)

      // Read response
      const responseBuffer = await this.bleConnection!.read(mac)

      // Parse and validate response
      parseBotBleResponse(responseBuffer)

      this.info.activeConnection = 'ble'
      this.emit('command', { type: 'ble', success: true, encrypted: true })

      return true
    } catch (error) {
      this.logger.error('Password-protected command failed', error)
      this.emitError({ type: 'ble', error, encrypted: true })
      throw error
    }
  }

  /**
   * Set or update Bot password
   * @param password - 4-character alphanumeric password (case-sensitive)
   */
  setPassword(password: string): void {
    validateBotPassword(password)
    this.password = password
    this.logger.info('Bot password updated')
  }

  /**
   * Clear Bot password
   */
  clearPassword(): void {
    this.password = undefined
    this.logger.info('Bot password cleared')
  }

  /**
   * Check if password is configured
   */
  hasPassword(): boolean {
    return !!this.password
  }

  /**
   * Get device status
   */
}
