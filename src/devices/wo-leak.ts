/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-leak.ts: SwitchBot v4.0.0 - Water Leak Detector Device
 */

import type { LeakStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

/**
 * Water Leak Detector Device
 */
export class WoLeak extends SwitchBotDevice {
  /**
   * Get device status
   */
  async getStatus(): Promise<LeakStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          waterLeakDetected: apiStatus.waterLeakDetected || false,
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
          waterLeakDetected: bleData.waterLeakDetected || false,
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
