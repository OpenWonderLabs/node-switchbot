import type { BlindTiltCommands, BlindTiltStatus } from '../types/device.js'
/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-blind-tilt.ts: SwitchBot v4.0.0 - Blind Tilt Device
 */
import { Buffer } from 'node:buffer'

import { DEVICE_COMMANDS } from '../settings.js'
import { clamp } from '../utils/index.js'
import { SwitchBotDevice } from './base.js'

/**
 * Blind Tilt Device
 */
export class WoBlindTilt extends SwitchBotDevice implements BlindTiltCommands {
  /**
   * Open blind (position 50%)
   */
  async open(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BLIND_TILT.OPEN,
      'turnOn',
    )
    return result.success
  }

  /**
   * Close blind up (position 100%)
   */
  async closeUp(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BLIND_TILT.CLOSE_UP,
      'setPosition',
      '0,ff,100',
    )
    return result.success
  }

  /**
   * Close blind down (position 0%)
   */
  async closeDown(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BLIND_TILT.CLOSE_DOWN,
      'setPosition',
      '0,ff,0',
    )
    return result.success
  }

  /**
   * Close (default to close down)
   */
  async close(): Promise<boolean> {
    return this.closeDown()
  }

  /**
   * Pause blind movement
   */
  async pause(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.BLIND_TILT.PAUSE,
      'pause',
    )
    return result.success
  }

  /**
   * Set blind position (0-100%)
   */
  async setPosition(position: number): Promise<boolean> {
    const clampedPosition = clamp(position, 0, 100)

    // Calculate tilt angle for BLE (0-100 maps to 0-180 degrees)
    const angle = Math.round((clampedPosition / 100) * 180)
    const bleCommand = [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, angle]

    const result = await this.sendCommand(
      bleCommand,
      'setPosition',
      `0,ff,${clampedPosition}`,
    )
    return result.success
  }

  /**
   * Get device status
   */
  _lastPosition?: number

  async getStatus(): Promise<BlindTiltStatus> {
    try {
      let direction: 'opening' | 'closing' | undefined
      let position: number = 0
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        position = typeof apiStatus.slidePosition === 'number' ? apiStatus.slidePosition : 0
        if (typeof this._lastPosition === 'number') {
          if (position > this._lastPosition) {
            direction = 'opening'
          } else if (position < this._lastPosition) {
            direction = 'closing'
          }
        }
        this._lastPosition = position
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          position,
          direction,
          moving: apiStatus.moving,
          calibrated: apiStatus.calibrate ?? undefined,
          battery: apiStatus.battery,
          version: apiStatus.version,
          updatedAt: new Date(),
        }
      }

      // Fallback to BLE
      if (this.hasBLE()) {
        const bleData = await this.getBLEStatus()
        // Calibration bit: usually in a status byte, e.g., bit 6 of 4th byte (like Curtain)
        let calibrated: boolean | undefined
        position = typeof bleData.position === 'number' ? bleData.position : 0
        if (bleData.rawData && Buffer.isBuffer(bleData.rawData) && bleData.rawData.length > 3) {
          calibrated = (bleData.rawData[3] & 0x40) !== 0
        } else if (typeof bleData.calibration === 'boolean') {
          calibrated = bleData.calibration
        }
        if (typeof this._lastPosition === 'number') {
          if (position > this._lastPosition) {
            direction = 'opening'
          } else if (position < this._lastPosition) {
            direction = 'closing'
          }
        }
        this._lastPosition = position
        if (calibrated === false) {
          this.logger.warn('Blind Tilt not calibrated!')
        }
        return {
          deviceId: this.info.id,
          connectionType: 'ble',
          position,
          direction,
          moving: bleData.inMotion,
          calibrated,
          battery: bleData.battery,
          updatedAt: new Date(),
        }
      }

      throw new Error('No connection method available')
    } catch (error) {
      this.logger.error('Failed to get status', error)
      throw error
    }
  }
}
