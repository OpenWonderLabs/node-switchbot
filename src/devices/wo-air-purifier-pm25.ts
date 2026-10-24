import type { AirPurifierStatus } from '../types/device.js'

import { Buffer } from 'node:buffer'

import { airPurifierFanParameter, airPurifierModeParameter, airPurifierPresetParameter, resetAirPurifierFilterUsage } from './air-purifier-api.js'
import { SwitchBotDevice } from './base.js'

export class WoAirPurifierPM25 extends SwitchBotDevice {
  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<AirPurifierStatus> {
    return this.getStatusWithFallback<AirPurifierStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        power: bleData.state ? 'on' : 'off',
        fanSpeed: bleData.fanSpeed,
        mode: bleData.mode,
        pm25: bleData.pm25,
        updatedAt: new Date(),
      }),
      (apiStatus) => {
        let airQuality: 'excellent' | 'good' | 'fair' | 'poor' | undefined
        if (apiStatus.pm25 !== undefined) {
          if (apiStatus.pm25 <= 35) {
            airQuality = 'excellent'
          } else if (apiStatus.pm25 <= 75) {
            airQuality = 'good'
          } else if (apiStatus.pm25 <= 115) {
            airQuality = 'fair'
          } else {
            airQuality = 'poor'
          }
        }
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          power: apiStatus.power || 'off',
          fanSpeed: apiStatus.fanSpeed,
          mode: apiStatus.mode,
          pm25: apiStatus.pm25,
          airQuality,
          version: apiStatus.version,
          updatedAt: new Date(),
        }
      },
    )
  }

  /**
   * Turn on
   */
  async turnOn(): Promise<boolean> {
    if (this.hasBLE()) {
      const command = Buffer.from([0x57, 0x01, 0x01])
      const result = await this.sendCommand(command, 'turnOn')
      if (result.success) {
        return true
      }
    }
    if (this.hasAPI()) {
      const result = await this.sendAPICommand('turnOn')
      return result.success
    }
    throw new Error('No connection method available')
  }

  /**
   * Turn off
   */
  async turnOff(): Promise<boolean> {
    if (this.hasBLE()) {
      const command = Buffer.from([0x57, 0x01, 0x02])
      const result = await this.sendCommand(command, 'turnOff')
      if (result.success) {
        return true
      }
    }
    if (this.hasAPI()) {
      const result = await this.sendAPICommand('turnOff')
      return result.success
    }
    throw new Error('No connection method available')
  }

  /**
   * Set mode (auto/manual/sleep)
   */
  async setMode(mode: 'auto' | 'manual' | 'sleep'): Promise<import('../types/index.js').CommandResult> {
    const modeMap: Record<string, number> = { auto: 0, manual: 1, sleep: 2 }
    if (this.hasBLE()) {
      const bleCommand = Buffer.from([0x57, 0x02, modeMap[mode]])
      const result = await this.sendCommand(bleCommand, 'setMode', airPurifierModeParameter(mode))
      if (result.success) {
        return result
      }
    }
    if (this.hasAPI()) {
      return this.sendAPICommand('setMode', airPurifierModeParameter(mode))
    }
    throw new Error('No connection method available')
  }

  /**
   * Set fan speed (1-4)
   */
  async setFanSpeed(speed: number): Promise<boolean> {
    const clampedSpeed = Math.max(1, Math.min(4, speed))
    if (this.hasBLE()) {
      const bleCommand = Buffer.from([0x57, 0x03, clampedSpeed])
      const result = await this.sendCommand(bleCommand, 'setMode', airPurifierFanParameter(clampedSpeed))
      if (result.success) {
        return true
      }
    }
    if (this.hasAPI()) {
      const result = await this.sendAPICommand('setMode', airPurifierFanParameter(clampedSpeed))
      return result.success
    }
    throw new Error('No connection method available')
  }

  /**
   * Reset filter usage and confirm the device reads 0 hours afterwards (BLE only).
   * Throws if the reset is rejected or cannot be verified. See resetAirPurifierFilterUsage.
   */
  async resetFilterUsage(): Promise<boolean> {
    return resetAirPurifierFilterUsage({
      // Encrypted replies are only readable with a key id (pySwitchbot protocol)
      encrypted: !!this.info.encryptionKey && !this.info.keyId,
      hasBLE: this.hasBLE(),
      send: (command, options) => this.sendBLECommand(command, false, options),
    })
  }

  /**
   * Set preset mode (level_1, level_2, level_3, auto, sleep, pet)
   */
  async setPresetMode(mode: 'level_1' | 'level_2' | 'level_3' | 'auto' | 'sleep' | 'pet'): Promise<boolean> {
    const modeMap: Record<string, number> = {
      level_1: 1,
      level_2: 2,
      level_3: 3,
      auto: 4,
      sleep: 5,
      pet: 6,
    }
    const modeId = modeMap[mode]
    if (modeId === undefined) {
      throw new Error(`Unsupported preset mode: ${mode}`)
    }
    if (this.hasBLE()) {
      const bleCommand = Buffer.from([0x57, 0x02, modeId])
      const result = await this.sendCommand(bleCommand, 'setMode', airPurifierPresetParameter(mode))
      if (result.success) {
        return true
      }
    }
    if (this.hasAPI()) {
      const result = await this.sendAPICommand('setMode', airPurifierPresetParameter(mode))
      return result.success
    }
    throw new Error('No connection method available')
  }
}
