import type { LeakStatus } from '../types/device.js'
import { SwitchBotDevice } from './base.js'

export class WoWaterDetector extends SwitchBotDevice {
  /**
   * Get device status (BLE first, then API)
   */
  async getStatus(): Promise<LeakStatus> {
    try {
      // BLE first
      if (this.hasBLE()) {
        const bleData = await this.getBLEStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'ble',
          updatedAt: new Date(),
          waterLeakDetected: !!bleData.waterLeakDetected,
        }
      }
      // API fallback
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          updatedAt: new Date(),
          waterLeakDetected: !!apiStatus.waterLeakDetected,
        }
      }
      throw new Error('No connection method available')
    } catch (error) {
      this.logger?.error?.('Failed to get status', error)
      throw error
    }
  }
}
