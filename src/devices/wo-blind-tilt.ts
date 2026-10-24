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
   * Send one command over the best transport; sendCommand() falls back between BLE and OpenAPI.
   * OpenAPI commands follow the Blind Tilt docs: fullyOpen, closeUp, closeDown, and
   * setPosition with `direction;position`.
   */
  private async command(bleCommand: readonly number[], apiCommand: string, apiParameter?: string): Promise<boolean> {
    if (!this.hasBLE() && !this.hasAPI()) {
      throw new Error('No connection method available')
    }
    const result = await this.sendCommand(bleCommand, apiCommand, apiParameter)
    return result.success
  }

  /**
   * Open blind (position 50%)
   */
  async open(): Promise<boolean> {
    return this.command(DEVICE_COMMANDS.BLIND_TILT.OPEN, 'fullyOpen')
  }

  /**
   * Close blind up (position 100%)
   */
  async closeUp(): Promise<boolean> {
    return this.command(DEVICE_COMMANDS.BLIND_TILT.CLOSE_UP, 'closeUp')
  }

  /**
   * Close blind (closes up)
   */
  async close(): Promise<boolean> {
    return this.closeUp()
  }

  /**
   * Close blind down (position 0%)
   */
  async closeDown(): Promise<boolean> {
    return this.command(DEVICE_COMMANDS.BLIND_TILT.CLOSE_DOWN, 'closeDown')
  }

  /**
   * Stop movement. OpenAPI has no pause command for Blind Tilt, so this needs BLE.
   */
  async pause(): Promise<boolean> {
    return this.command(DEVICE_COMMANDS.BLIND_TILT.PAUSE, 'pause')
  }

  /**
   * Set tilt position: 0 = closed down, 50 = open, 100 = closed up (as in pySwitchbot).
   */
  async setPosition(position: number): Promise<boolean> {
    const pos = Math.round(clamp(position, 0, 100))
    // Copy the OPEN command and replace the last byte with the desired position
    const bleCommand = [...DEVICE_COMMANDS.BLIND_TILT.OPEN] as number[]
    bleCommand[bleCommand.length - 1] = pos
    return this.command(bleCommand, 'setPosition', WoBlindTilt.toAPIPosition(pos))
  }

  /**
   * Convert a 0-100 tilt position (50 = open) to the OpenAPI `direction;position` parameter,
   * where position runs from 0 (closed) to 100 (open) and must be even.
   */
  static toAPIPosition(position: number): string {
    const pos = Math.round(clamp(position, 0, 100))
    return pos <= 50 ? `down;${pos * 2}` : `up;${(100 - pos) * 2}`
  }

  private _lastPosition?: number

  async getStatus(): Promise<BlindTiltStatus> {
    return this.getStatusWithFallback<BlindTiltStatus>(
      (bleData) => {
        let direction: 'opening' | 'closing' | undefined
        const position = typeof bleData.position === 'number' ? bleData.position : 0
        let calibrated: boolean | undefined
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
      },
      (apiStatus) => {
        let direction: 'opening' | 'closing' | undefined
        const position = typeof apiStatus.slidePosition === 'number' ? apiStatus.slidePosition : 0
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
      },
    )
  }
}
