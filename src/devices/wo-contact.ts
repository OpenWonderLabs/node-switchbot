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
  /** Read from BLE advertisements, without connecting (pySwitchbot) */
  protected override readonly passiveBLE = true

  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<ContactStatus> {
    return this.getStatusWithFallback<ContactStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        openState: bleData.openState ?? 'closed',
        moveDetected: bleData.movement,
        brightness: bleData.brightness,
        battery: bleData.battery,
        updatedAt: new Date(),
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        openState: apiStatus.openState || 'closed',
        moveDetected: apiStatus.moveDetected,
        brightness: apiStatus.brightness,
        battery: apiStatus.battery,
        version: apiStatus.version,
        updatedAt: new Date(),
      }),
    )
  }
}
