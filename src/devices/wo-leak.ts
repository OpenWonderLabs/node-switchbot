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
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<LeakStatus> {
    return this.getStatusWithFallback<LeakStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        waterLeakDetected: bleData.waterLeakDetected || false,
        battery: bleData.battery,
        updatedAt: new Date(),
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        waterLeakDetected: apiStatus.waterLeakDetected || false,
        battery: apiStatus.battery,
        version: apiStatus.version,
        updatedAt: new Date(),
      }),
    )
  }
}
