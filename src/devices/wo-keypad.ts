/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-keypad.ts: SwitchBot v4.0.0 - Keypad Device
 */

import type { KeypadStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

/**
 * Keypad Device (Touch/Physical)
 * Note: Keypad is primarily for lock control, read-only for status
 */
export class WoKeypad extends SwitchBotDevice {
  /**
   * Get device status
   */
  async getStatus(): Promise<KeypadStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          lockState: apiStatus.lockState,
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
