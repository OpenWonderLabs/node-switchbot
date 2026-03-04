import type { LeakStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

export class WoWaterDetector extends SwitchBotDevice {
  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<LeakStatus> {
    return this.getStatusWithFallback<LeakStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        updatedAt: new Date(),
        waterLeakDetected: !!bleData.waterLeakDetected,
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        updatedAt: new Date(),
        waterLeakDetected: !!apiStatus.waterLeakDetected,
      }),
    )
  }
}
