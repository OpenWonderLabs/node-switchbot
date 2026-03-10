/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-hub2.ts: SwitchBot v4.0.0 - Hub 2 Device
 */

import type { HubStatus } from '../types/device.js'

import { SwitchBotDevice } from './base.js'

/**
 * Hub 2 Device (Hub Mini/Hub Plus also use this)
 */
export class WoHub2 extends SwitchBotDevice {
  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<HubStatus> {
    return this.getStatusWithFallback<HubStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        temperature: bleData.temperature,
        humidity: bleData.humidity,
        lightLevel: bleData.lightLevel,
        updatedAt: new Date(),
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        temperature: apiStatus.temperature,
        humidity: apiStatus.humidity,
        lightLevel: apiStatus.lightLevel,
        version: apiStatus.version,
        updatedAt: new Date(),
      }),
    )
  }
}
