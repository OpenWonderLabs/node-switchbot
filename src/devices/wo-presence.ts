/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-presence.ts: SwitchBot v4.0.0 - Motion/Presence Sensor
 */

import type { MotionStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

/**
 * Motion/Presence Sensor
 */
export class WoPresence extends SwitchBotDevice {
  /**
   * Get device status
   */
  async getStatus(): Promise<MotionStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          moveDetected: apiStatus.moveDetected || false,
          brightness: apiStatus.brightness,
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
          moveDetected: bleData.movement || false,
          brightness: bleData.lightLevel,
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
