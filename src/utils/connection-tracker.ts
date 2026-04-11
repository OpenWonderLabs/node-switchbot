/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils/connection-tracker.ts: SwitchBot v4.0.0 - Connection Success Tracking
 */

import type { ConnectionType } from '../types/index.js'

import { Logger } from './index.js'

/**
 * Statistics for a single connection type
 */
export interface ConnectionStats {
  connectionType: ConnectionType
  successCount: number
  failureCount: number
  totalAttempts: number
  successRate: number
  averageLatencyMs: number
  lastAttemptTime?: Date
  lastSuccessTime?: Date
  lastFailureTime?: Date
}

/**
 * Tracks connection success/failure statistics per device per connection type
 */
export class ConnectionTracker {
  private stats: Map<ConnectionType, ConnectionStats> = new Map()
  private logger: Logger

  constructor(
    private deviceId: string,
    logLevel?: number,
  ) {
    this.logger = new Logger(`ConnectionTracker:${deviceId}`, logLevel)

    // Initialize stats for all connection types
    const connectionTypes: ConnectionType[] = ['ble', 'api']
    for (const type of connectionTypes) {
      this.stats.set(type, {
        connectionType: type,
        successCount: 0,
        failureCount: 0,
        totalAttempts: 0,
        successRate: 1, // Start optimistic
        averageLatencyMs: 0,
        lastAttemptTime: undefined,
        lastSuccessTime: undefined,
        lastFailureTime: undefined,
      })
    }
  }

  /**
   * Record a successful attempt
   */
  recordSuccess(connectionType: ConnectionType, latencyMs: number = 0): void {
    const stat = this.stats.get(connectionType)
    if (!stat) {
      return
    }

    stat.successCount++
    stat.totalAttempts++
    stat.lastAttemptTime = new Date()
    stat.lastSuccessTime = new Date()

    // Update average latency (exponential moving average)
    const alpha = 0.3
    stat.averageLatencyMs = stat.averageLatencyMs * (1 - alpha) + latencyMs * alpha

    // Update success rate
    stat.successRate = stat.totalAttempts === 0 ? 1 : stat.successCount / stat.totalAttempts

    this.logger.debug(`${connectionType}: success recorded`, {
      successRate: stat.successRate.toFixed(2),
      latency: latencyMs,
    })
  }

  /**
   * Record a failed attempt
   */
  recordFailure(connectionType: ConnectionType): void {
    const stat = this.stats.get(connectionType)
    if (!stat) {
      return
    }

    stat.failureCount++
    stat.totalAttempts++
    stat.lastAttemptTime = new Date()
    stat.lastFailureTime = new Date()

    // Update success rate
    stat.successRate = stat.totalAttempts === 0 ? 1 : stat.successCount / stat.totalAttempts

    this.logger.debug(`${connectionType}: failure recorded`, {
      successRate: stat.successRate.toFixed(2),
    })
  }

  /**
   * Get statistics for a connection type
   */
  getStats(connectionType: ConnectionType): ConnectionStats | undefined {
    return this.stats.get(connectionType)
  }

  /**
   * Get all statistics
   */
  getAllStats(): ConnectionStats[] {
    return [...this.stats.values()]
  }

  /**
   * Get the best connection type (highest success rate)
   */
  getBestConnection(availableTypes: ConnectionType[] = ['ble', 'api']): ConnectionType | undefined {
    let bestType: ConnectionType | undefined
    let bestRate = -1

    for (const type of availableTypes) {
      const stat = this.stats.get(type)
      if (stat && stat.successRate > bestRate) {
        bestRate = stat.successRate
        bestType = type
      }
    }

    if (bestType) {
      const stat = this.stats.get(bestType)!
      if (stat.totalAttempts > 0) {
        this.logger.debug(`Best connection: ${bestType} (success rate: ${stat.successRate.toFixed(2)})`)
      }
    }

    return bestType
  }

  /**
   * Get the most recent successful connection type
   */
  getMostRecentSuccessful(availableTypes: ConnectionType[] = ['ble', 'api']): ConnectionType | undefined {
    let mostRecentType: ConnectionType | undefined
    let mostRecentTime: Date | undefined

    for (const type of availableTypes) {
      const stat = this.stats.get(type)
      if (stat?.lastSuccessTime) {
        if (!mostRecentTime || stat.lastSuccessTime > mostRecentTime) {
          mostRecentTime = stat.lastSuccessTime
          mostRecentType = type
        }
      }
    }

    return mostRecentType
  }

  /**
   * Check if a connection type is considered reliable
   * (e.g., success rate > 75% with at least 5 attempts)
   */
  isReliable(connectionType: ConnectionType, minAttempts: number = 5, minRate: number = 0.75): boolean {
    const stat = this.stats.get(connectionType)
    if (!stat) {
      return false
    }

    return stat.totalAttempts >= minAttempts && stat.successRate >= minRate
  }

  /**
   * Get connection recommendation with reasoning
   */
  getRecommendation(availableTypes: ConnectionType[] = ['ble', 'api']): {
    recommended: ConnectionType | undefined
    reason: string
    stats: ConnectionStats[]
  } {
    const stats = availableTypes.map(type => this.stats.get(type)!).filter(Boolean)

    // If no attempt history, recommend first available
    if (stats.every(s => s.totalAttempts === 0)) {
      return {
        recommended: availableTypes[0],
        reason: 'No history, using first available connection',
        stats,
      }
    }

    // Find most reliable based on success rate
    const bestType = this.getBestConnection(availableTypes)

    if (!bestType) {
      return {
        recommended: undefined,
        reason: 'No available connections',
        stats,
      }
    }

    const bestStat = this.stats.get(bestType)!
    let reason = `${bestType} has best success rate (${bestStat.successRate.toFixed(2)})`

    // Add context about latency if applicable
    if (bestStat.averageLatencyMs > 0) {
      reason += ` with avg latency ${bestStat.averageLatencyMs.toFixed(0)}ms`
    }

    return {
      recommended: bestType,
      reason,
      stats,
    }
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.logger.debug('Resetting all statistics')
    for (const stat of this.stats.values()) {
      stat.successCount = 0
      stat.failureCount = 0
      stat.totalAttempts = 0
      stat.successRate = 1
      stat.averageLatencyMs = 0
      stat.lastAttemptTime = undefined
      stat.lastSuccessTime = undefined
      stat.lastFailureTime = undefined
    }
  }
}
