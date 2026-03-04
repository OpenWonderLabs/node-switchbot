/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-contact.ts: SwitchBot v4.0.0 - Contact Sensor
 */

import type { ContactStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

/**
 * Contact Sensor (Door/Window Sensor)
 */
export class WoContact extends SwitchBotDevice {
  /**
   * Get device status
   */
  async getStatus(): Promise<ContactStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          openState: apiStatus.openState || 'closed',
          moveDetected: apiStatus.moveDetected,
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
          openState: bleData.position || 'closed',
          moveDetected: bleData.movement,
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
