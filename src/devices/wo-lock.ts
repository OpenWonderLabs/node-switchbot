/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-lock.ts: SwitchBot v4.0.0 - Smart Lock Device
 */

import type { Buffer } from 'node:buffer'

import type { LockCommands, LockStatus } from '../types/device.js'

import { WoSmartLockCommands } from '../settings.js'
import { SequenceDevice } from './sequence-device.js'

/**
 * Smart Lock Device
 */
export class WoSmartLock extends SequenceDevice implements LockCommands {
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
      WoSmartLockCommands.LOCK,
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
      WoSmartLockCommands.UNLOCK,
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
   * Get device status
   */
  async getStatus(): Promise<LockStatus> {
    try {
      // Try API first if available
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          lockState: apiStatus.lockState || 'locked',
          doorState: apiStatus.doorState,
          calibrated: apiStatus.calibrate,
          battery: apiStatus.battery,
          version: apiStatus.version,
          updatedAt: new Date(),
        }
      }

      // Fallback to BLE
      if (this.hasBLE()) {
        const bleData = await this.getBLEStatus().catch(() => this.normalizeBLEStatusData(undefined))
        return {
          deviceId: this.info.id,
          connectionType: 'ble',
          lockState: bleData.lockState || 'locked',
          calibrated: bleData.calibration,
          battery: bleData.battery,
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
