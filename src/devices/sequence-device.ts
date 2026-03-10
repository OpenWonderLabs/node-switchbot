/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/sequence-device.ts: SwitchBot v4.0.0 - Sequence Aware Device Base Class
 */

import type { OpenAPIClient } from '../api.js'
import type { BLEConnection } from '../ble.js'
import type { ConnectionType, DeviceInfo, DeviceStatus } from '../types/index.js'
import type { CircuitBreakerConfig, RetryConfig } from '../utils/index.js'

import { SwitchBotDevice } from './base.js'

/**
 * Base class for devices that expose an advertisement sequence number.
 * Automatically triggers a status refresh when the sequence number changes.
 *
 * ## BLE-first, API-fallback Status Pattern
 *
 * Subclasses should implement their `getStatus()` using the centralized
 * `getStatusWithFallback()` method from SwitchBotDevice for robust BLE-first,
 * API-fallback logic. See SwitchBotDevice for details.
 *
 * Example:
 * ```typescript
 * async getStatus(): Promise<DeviceStatus> {
 *   return this.getStatusWithFallback(
 *     bleData => ({ ... }),
 *     apiData => ({ ... })
 *   )
 * }
 * ```
 */
export abstract class SequenceDevice extends SwitchBotDevice {
  private lastSequenceNumber: number | undefined
  private sequenceUpdateInFlight = false

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
    this.lastSequenceNumber = this.getSequenceNumberFromInfo(info)
  }

  /**
   * Refresh status for this device. Called automatically after sequence changes.
   */
  async update(): Promise<DeviceStatus> {
    return this.getStatus()
  }

  /**
   * Update device information and react to sequence number changes.
   */
  override updateInfo(newInfo: Partial<DeviceInfo>): void {
    const previousSequenceNumber = this.lastSequenceNumber
    super.updateInfo(newInfo)

    const nextSequenceNumber = this.getSequenceNumberFromInfo(this.info)
    if (nextSequenceNumber === undefined) {
      return
    }

    if (previousSequenceNumber === undefined) {
      this.lastSequenceNumber = nextSequenceNumber
      return
    }

    if (nextSequenceNumber === previousSequenceNumber) {
      return
    }

    this.lastSequenceNumber = nextSequenceNumber
    this.emit('sequence-changed', {
      deviceId: this.info.id,
      previousSequenceNumber,
      sequenceNumber: nextSequenceNumber,
      updatedAt: new Date(),
    })

    void this.triggerSequenceUpdate()
  }

  private getSequenceNumberFromInfo(info: DeviceInfo): number | undefined {
    const raw = (info.bleServiceData ?? {}) as Record<string, unknown>
    const sequenceNumber = raw.sequenceNumber
    return typeof sequenceNumber === 'number' ? sequenceNumber : undefined
  }

  private async triggerSequenceUpdate(): Promise<void> {
    if (this.sequenceUpdateInFlight) {
      return
    }

    this.sequenceUpdateInFlight = true
    try {
      const status = await this.update()
      this.emit('status-updated', {
        deviceId: this.info.id,
        status,
        updatedAt: new Date(),
      })
    } catch (error) {
      this.logger.debug('Sequence-triggered update failed', error)
    } finally {
      this.sequenceUpdateInFlight = false
    }
  }
}
