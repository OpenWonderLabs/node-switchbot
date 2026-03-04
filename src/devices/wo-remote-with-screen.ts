import type { DeviceStatus } from '../types/index.js'

import { SwitchBotDevice } from './base.js'

export class WoRemoteWithScreen extends SwitchBotDevice {
  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<DeviceStatus> {
    return this.getStatusWithFallback<DeviceStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        updatedAt: new Date(),
        battery: bleData.battery,
        version: bleData.version,
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        updatedAt: new Date(),
        battery: apiStatus.battery,
        version: apiStatus.version,
      }),
    )
  }
}
