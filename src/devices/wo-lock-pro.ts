/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-lock-pro.ts: SwitchBot v4.0.0 - Smart Lock Pro Device
 */

import type { Buffer } from 'node:buffer'

import type { LockCommands, LockStatus } from '../types/device.js'

import { WoSmartLockProCommands } from '../settings.js'
import { SequenceDevice } from './sequence-device.js'

/**
 * Smart Lock Pro Device (with unlatch support)
 */
export class WoSmartLockPro extends SequenceDevice implements LockCommands {
  private lockNotificationHandlers = new Set<(payload: Buffer) => void>()

  /**
   * Lock the lock
   */
  async lock(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      if (status.lockState === 'locked') {
        return true
      }
    } catch {
      // Best effort status check before command
    }

    const result = await this.sendCommand(
      WoSmartLockProCommands.LOCK,
      'lock',
    )
    return result.success
  }

  /**
   * Unlock the lock
   */
  async unlock(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      if (status.lockState === 'unlocked') {
        return true
      }
    } catch {
      // Best effort status check before command
    }

    const result = await this.sendCommand(
      WoSmartLockProCommands.UNLOCK,
      'unlock',
    )
    return result.success
  }

  /**
   * Unlock without unlatching the door
   */
  async unlockWithoutUnlatch(): Promise<boolean> {
    const result = await this.sendCommand(
      WoSmartLockProCommands.UNLOCK,
      'unlock',
      'withoutUnlatch',
    )
    return result.success
  }

  /**
   * Unlatch the lock (Lock Pro only)
   */
  async unlatch(): Promise<boolean> {
    const result = await this.sendCommand(
      WoSmartLockProCommands.UNLATCH,
      'unlock',
    )
    return result.success
  }

  async getLockInfo(): Promise<Record<string, unknown>> {
    if (this.hasAPI()) {
      const status = await this.getAPIStatus()
      return {
        lockState: status.lockState,
        doorState: status.doorState,
        calibrate: status.calibrate,
        battery: status.battery,
        version: status.version,
      }
    }

    const ble = await this.getBLEStatus().catch(() => this.normalizeBLEStatusData(undefined))
    return {
      lockState: ble.lockState,
      doorOpen: ble.doorOpen,
      calibration: ble.calibration,
      battery: ble.battery,
      sequenceNumber: ble.sequenceNumber,
    }
  }

  async onLockNotification(handler: (payload: Buffer) => void): Promise<void> {
    if (!this.hasBLE()) {
      throw new Error('BLE not available for lock notifications')
    }

    const mac = this.info.mac ?? `id:${this.info.bleId}`
    await this.bleConnection!.subscribeNotifications(mac, handler)
    this.lockNotificationHandlers.add(handler)
  }

  offLockNotification(handler: (payload: Buffer) => void): void {
    if (!this.hasBLE()) {
      return
    }

    const mac = this.info.mac ?? `id:${this.info.bleId}`
    this.bleConnection?.unsubscribeNotifications(mac, handler)
    this.lockNotificationHandlers.delete(handler)
  }

  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<LockStatus> {
    return this.getStatusWithFallback<LockStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        lockState: bleData.lockState || 'locked',
        doorState: bleData.doorOpen ? 'opened' : 'closed',
        calibrated: bleData.calibration,
        battery: bleData.battery,
        updatedAt: new Date(),
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        lockState: apiStatus.lockState || 'locked',
        doorState: apiStatus.doorState,
        calibrated: apiStatus.calibrate,
        battery: apiStatus.battery,
        version: apiStatus.version,
        updatedAt: new Date(),
      }),
    )
  }
}
