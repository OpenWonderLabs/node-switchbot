/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-remote.ts: SwitchBot v4.0.0 - Remote Device
 */

import type { RemoteStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

/**
 * Remote Device (IR remote control)
 * Note: Remote is read-only for battery status
 */
export class WoRemote extends SwitchBotDevice {
  /**
   * Get device status
   */
  async getStatus(): Promise<RemoteStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
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
