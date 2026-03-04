import type { HubStatus } from '../types/device.js'
import { SwitchBotDevice } from './base.js'

export class WoAIHub extends SwitchBotDevice {
  /**
   * Get device status (BLE first, then API)
   */
  async getStatus(): Promise<HubStatus> {
    try {
      // Try BLE first
      if (this.hasBLE()) {
        const bleData = await this.getBLEStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'ble',
          temperature: bleData.temperature,
          humidity: bleData.humidity,
          lightLevel: bleData.lightLevel,
          updatedAt: new Date(),
        }
      }

      // Fallback to API
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          temperature: apiStatus.temperature,
          humidity: apiStatus.humidity,
          lightLevel: apiStatus.lightLevel,
          version: apiStatus.version,
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
