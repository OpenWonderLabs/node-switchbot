/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-vacuum.ts: SwitchBot v4.0.0 - Vacuum Device
 */

import type { VacuumCommands, VacuumStatus } from '../types/device.js'

import { DEVICE_COMMANDS } from '../settings.js'
import { SequenceDevice } from './sequence-device.js'

/**
 * Vacuum Device
 */
export class WoVacuum extends SequenceDevice implements VacuumCommands {
  /**
   * Start cleaning
   */
  async cleanUp(protocolVersion: number): Promise<boolean> {
    const command = this.getCommandForProtocol(DEVICE_COMMANDS.VACUUM.CLEAN_UP, protocolVersion)
    const result = await this.sendCommand(command, 'start', { protocolVersion })
    return result.success
  }

  /**
   * Return to dock
   */
  async returnToDock(protocolVersion: number): Promise<boolean> {
    const command = this.getCommandForProtocol(DEVICE_COMMANDS.VACUUM.RETURN_TO_DOCK, protocolVersion)
    const result = await this.sendCommand(command, 'dock', { protocolVersion })
    return result.success
  }

  /**
   * Return advertised battery value
   */
  getBattery(): number | undefined {
    const data = this.getAdvertisementStatusData()
    return this.asNumber(data.battery)
  }

  /**
   * Return advertised work status value
   */
  getWorkStatus(): number | undefined {
    const data = this.getAdvertisementStatusData()
    return this.asNumber(data.workStatus ?? data.work_status)
  }

  /**
   * Return advertised dustbin bound state
   */
  getDustbinBoundStatus(): boolean | undefined {
    const data = this.getAdvertisementStatusData()
    return this.asBoolean(data.dustbinBound ?? data.dustbin_bound)
  }

  /**
   * Return advertised dustbin connected state
   */
  getDustbinConnectedStatus(): boolean | undefined {
    const data = this.getAdvertisementStatusData()
    return this.asBoolean(data.dustbinConnected ?? data.dusbin_connected)
  }

  /**
   * Return advertised network connected state
   */
  getNetworkConnectedStatus(): boolean | undefined {
    const data = this.getAdvertisementStatusData()
    return this.asBoolean(data.networkConnected ?? data.network_connected)
  }

  /**
   * Get device status
   */
  async getStatus(): Promise<VacuumStatus> {
    try {
      if (this.hasAPI()) {
        const apiStatus = await this.getAPIStatus()
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          battery: apiStatus.battery,
          workStatus: apiStatus.workStatus ?? apiStatus.work_status,
          dustbinBound: apiStatus.dustbinBound ?? apiStatus.dustbin_bound,
          dustbinConnected: apiStatus.dustbinConnected ?? apiStatus.dusbin_connected,
          networkConnected: apiStatus.networkConnected ?? apiStatus.network_connected,
          version: apiStatus.version,
          updatedAt: new Date(),
        }
      }

      if (this.hasBLE()) {
        const bleData = await this.getBLEStatus().catch(() => this.normalizeBLEStatusData(undefined))
        return {
          deviceId: this.info.id,
          connectionType: 'ble',
          battery: this.asNumber(bleData.battery),
          workStatus: this.asNumber(bleData.workStatus ?? bleData.work_status),
          dustbinBound: this.asBoolean(bleData.dustbinBound ?? bleData.dustbin_bound),
          dustbinConnected: this.asBoolean(bleData.dustbinConnected ?? bleData.dusbin_connected),
          networkConnected: this.asBoolean(bleData.networkConnected ?? bleData.network_connected),
          updatedAt: new Date(),
        }
      }

      throw new Error('No connection method available')
    } catch (error) {
      this.logger.error('Failed to get status', error)
      throw error
    }
  }

  private getCommandForProtocol(
    commands: { 1: readonly number[], 2: readonly number[] },
    protocolVersion: number,
  ): readonly number[] {
    if (protocolVersion !== 1 && protocolVersion !== 2) {
      throw new Error(`Unsupported vacuum protocol version: ${protocolVersion}`)
    }

    return commands[protocolVersion as 1 | 2]
  }

  private getAdvertisementStatusData(): Record<string, unknown> {
    return this.normalizeBLEStatusData(undefined)
  }

  private asNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined
  }

  private asBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined
  }
}
