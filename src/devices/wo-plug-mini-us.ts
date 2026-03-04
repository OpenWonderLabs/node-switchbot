/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-plug-mini-us.ts: SwitchBot v4.0.0 - Plug Mini (US)
 */

import type { PlugCommands, PlugStatus } from '../types/device.js'

import { DEVICE_COMMANDS } from '../settings.js'
import { DeviceOverrideStateDuringConnection } from './device-override-state-during-connection.js'

/**
 * Plug Mini (US) Device
 */
export class WoPlugMiniUS extends DeviceOverrideStateDuringConnection implements PlugCommands {
  /**
   * Turn on
   */
  async turnOn(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.PLUG.TURN_ON,
      'turnOn',
    )
    return result.success
  }

  /**
   * Turn off
   */
  async turnOff(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.PLUG.TURN_OFF,
      'turnOff',
    )
    return result.success
  }

  /**
   * Toggle power
   */
  async toggle(): Promise<boolean> {
    const result = await this.sendCommand(
      DEVICE_COMMANDS.PLUG.TOGGLE,
      'toggle',
    )
    return result.success
  }

  /**
   * Get device status
   */
  async getStatus(): Promise<PlugStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          power: apiStatus.power || 'off',
          voltage: apiStatus.voltage,
          electricCurrent: apiStatus.electricCurrent,
          electricityOfDay: apiStatus.electricityOfDay,
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
          power: bleData.state ? 'on' : 'off',
          voltage: bleData.voltage,
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
