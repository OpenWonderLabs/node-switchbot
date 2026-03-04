/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/device-override-state-during-connection.ts: SwitchBot v4.0.0 - Device Override State During Connection Base Class
 */

import type { OpenAPIClient } from '../api.js'
import type { BLEConnection } from '../ble.js'
import type { ConnectionType, DeviceInfo } from '../types/index.js'
import type { CircuitBreakerConfig, RetryConfig } from '../utils/index.js'

import { SwitchBotDevice } from './base.js'

/**
 * Base class for devices that should ignore advertisement state while connected.
 * Prevents stale BLE advertisement data from overriding active connection state.
 */
export abstract class DeviceOverrideStateDuringConnection extends SwitchBotDevice {
  constructor(
    info: DeviceInfo,
    options: {
      bleConnection?: BLEConnection
      apiClient?: OpenAPIClient
      enableFallback?: boolean
      preferredConnection?: ConnectionType
      enableConnectionIntelligence?: boolean
      enableCircuitBreaker?: boolean
      enableRetry?: boolean
      retryConfig?: RetryConfig
      circuitBreakerConfig?: CircuitBreakerConfig
      logLevel?: number
    } = {},
  ) {
    super(info, options)
  }

  override updateInfo(newInfo: Partial<DeviceInfo>): void {
    if (!this.isBLEConnected()) {
      super.updateInfo(newInfo)
      return
    }

    const filtered: Partial<DeviceInfo> = { ...newInfo }
    delete filtered.bleServiceData
    delete filtered.battery
    delete filtered.rssi

    super.updateInfo(filtered)
  }

  protected override normalizeBLEStatusData(data: any): Record<string, unknown> {
    if (data && typeof data === 'object') {
      return super.normalizeBLEStatusData(data)
    }

    if (this.isBLEConnected()) {
      return {}
    }

    return super.normalizeBLEStatusData(data)
  }

  protected isBLEConnected(): boolean {
    if (!this.bleConnection?.isConnected) {
      return false
    }

    const macOrBleId = this.info.mac ?? (this.info.bleId ? `id:${this.info.bleId}` : undefined)
    if (!macOrBleId) {
      return false
    }

    return this.bleConnection.isConnected(macOrBleId)
  }
}
