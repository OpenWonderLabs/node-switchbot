import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoRemoteWithScreen extends SwitchBotDevice {
  /**
   * Get device status (BLE first, then API)
   */
  async getStatus(): Promise<DeviceStatus> {
    try {
      // Try BLE first
      if (this.hasBLE()) {
        const bleData = await this.getBLEStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'ble',
          updatedAt: new Date(),
          battery: bleData.battery,
          version: bleData.version,
        }
      }

      // Fallback to API
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          updatedAt: new Date(),
          battery: apiStatus.battery,
          version: apiStatus.version,
        }
      }
      throw new Error('No connection method available')
    } catch (error) {
      this.logger?.error?.('Failed to get status', error)
      throw error
    }
  }
}
