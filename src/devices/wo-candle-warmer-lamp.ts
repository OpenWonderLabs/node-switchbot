import type { DeviceStatus } from '../types/index.js'

import { Buffer } from 'node:buffer'

import { SwitchBotDevice } from './base.js'

export interface CandleWarmerLampStatus extends DeviceStatus {
  power?: 'on' | 'off'
  brightness?: number
}

export class WoCandleWarmerLamp extends SwitchBotDevice {
  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<CandleWarmerLampStatus> {
    return this.getStatusWithFallback<CandleWarmerLampStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        updatedAt: new Date(),
        power: bleData.state ? 'on' : 'off',
        brightness: typeof bleData.brightness === 'number' ? bleData.brightness : undefined,
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        updatedAt: new Date(),
        power: apiStatus.power,
        brightness: typeof apiStatus.brightness === 'number' ? apiStatus.brightness : undefined,
      }),
    )
  }

  /**
   * Turn on the candle warmer lamp
   */
  async turnOn(): Promise<boolean> {
    // BLE first
    if (this.hasBLE()) {
      const command = Buffer.from([0x57, 0x01, 0x01])
      const result = await this.sendCommand(command, 'turnOn')

      if (result.success) {
        return true
      }
    }

    // API fallback
    if (this.hasAPI()) {
      const result = await this.sendAPICommand('turnOn')
      return result.success
    }
    throw new Error('No connection method available')
  }

  /**
   * Turn off the candle warmer lamp
   */
  async turnOff(): Promise<boolean> {
    // BLE first
    if (this.hasBLE()) {
      const command = Buffer.from([0x57, 0x01, 0x02])
      const result = await this.sendCommand(command, 'turnOff')

      if (result.success) {
        return true
      }
    }

    // API fallback
    if (this.hasAPI()) {
      const result = await this.sendAPICommand('turnOff')
      return result.success
    }
    throw new Error('No connection method available')
  }

  /**
   * Set brightness (1-100)
   */
  async setBrightness(level: number): Promise<boolean> {
    const clamped = Math.max(1, Math.min(100, level))
    // BLE first
    if (this.hasBLE()) {
      const command = Buffer.from([0x57, 0x02, clamped])
      const result = await this.sendCommand(command, 'setBrightness', clamped)

      if (result.success) {
        return true
      }
    }

    // API fallback
    if (this.hasAPI()) {
      const result = await this.sendAPICommand('setBrightness', clamped)
      return result.success
    }
    throw new Error('No connection method available')
  }
}
