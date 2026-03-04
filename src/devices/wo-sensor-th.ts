/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-sensor-th.ts: SwitchBot v4.0.0 - Meter (Temp/Humidity Sensor)
 */

import type { MeterStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

/**
 * Meter (Temperature/Humidity Sensor)
 */
export class WoSensorTH extends SwitchBotDevice {
  /**
   * Get device status
   */
  async getStatus(): Promise<MeterStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          temperature: apiStatus.temperature || 0,
          humidity: apiStatus.humidity || 0,
          battery: apiStatus.battery,
          version: apiStatus.version,
          updatedAt: new Date(),
        }
      }

      // Fallback to BLE
      if (this.hasBLE()) {
        const bleData = await this.getBLEStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'ble',
          temperature: bleData.temperature || 0,
          humidity: bleData.humidity || 0,
          temperatureScale: bleData.fahrenheit ? 'f' : 'c',
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
