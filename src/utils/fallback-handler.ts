/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils/fallback-handler.ts: SwitchBot v4.0.0 - Custom Fallback Handlers
 */

import type { ConnectionType } from '../types/index.js'

import { Logger } from './index.js'

/**
 * Information about a fallback event
 */
export interface FallbackEvent {
  deviceId: string
  primaryConnection: ConnectionType
  fallbackConnection: ConnectionType | undefined
  reason: string
  timestamp: Date
  attemptsCount?: number
  totalTimeMs?: number
}

/**
 * Type for custom fallback handler callbacks
 */
export type FallbackHandler = (event: FallbackEvent) => void | Promise<void>

/**
 * Options for registering a fallback handler
 */
export interface FallbackHandlerOptions {
  /** Handler identifier for later removal */
  id?: string
  /** Handler priority (higher = executes first) */
  priority?: number
}

/**
 * Manages custom fallback handlers and events
 */
export class FallbackHandlerManager {
  private handlers: Map<
    string,
    { handler: FallbackHandler, priority: number }
  > = new Map()

  private logger: Logger
  private handlerCounter = 0

  constructor(logLevel?: number) {
    this.logger = new Logger('FallbackHandlerManager', logLevel)
  }

  /**
   * Register a custom fallback handler
   */
  register(
    handler: FallbackHandler,
    options: FallbackHandlerOptions = {},
  ): string {
    const id = options.id || `handler_${++this.handlerCounter}`
    const priority = options.priority ?? 0

    this.handlers.set(id, { handler, priority })
    this.logger.debug(`Registered fallback handler: ${id} (priority: ${priority})`)

    return id
  }

  /**
   * Unregister a fallback handler
   */
  unregister(id: string): boolean {
    const removed = this.handlers.delete(id)
    if (removed) {
      this.logger.debug(`Unregistered fallback handler: ${id}`)
    }
    return removed
  }

  /**
   * Emit a fallback event to all registered handlers
   */
  async emit(event: FallbackEvent): Promise<void> {
    // Sort handlers by priority (descending)

    const sortedHandlers = [...this.handlers.entries()].sort((a, b) => b[1].priority - a[1].priority)

    this.logger.debug(`Emitting fallback event to ${sortedHandlers.length} handlers`, {
      device: event.deviceId,
      primary: event.primaryConnection,
      fallback: event.fallbackConnection,
    })

    for (const [id, { handler }] of sortedHandlers) {
      try {
        await Promise.resolve(handler(event))
      } catch (error) {
        this.logger.error(`Fallback handler ${id} threw error`, error)
        // Continue with other handlers even if one fails
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.logger.debug(`Clearing ${this.handlers.size} fallback handlers`)
    this.handlers.clear()
  }

  /**
   * Get handler count
   */
  getHandlerCount(): number {
    return this.handlers.size
  }
}

/**
 * Built-in fallback handler: Log fallback events
 */
export function createLoggingFallbackHandler(logLevel: number = 3): FallbackHandler {
  const logger = new Logger('FallbackLogger', logLevel)

  return (event: FallbackEvent) => {
    if (!event.fallbackConnection) {
      logger.error(
        `Device ${event.deviceId}: ${event.primaryConnection} failed and no fallback available`,
      )
    } else {
      logger.warn(
        `Device ${event.deviceId}: ${event.primaryConnection} failed, falling back to ${event.fallbackConnection}`,
        {
          reason: event.reason,
          attempts: event.attemptsCount,
          timeMs: event.totalTimeMs,
        },
      )
    }
  }
}

/**
 * Built-in fallback handler: Metrics/statistics collection
 */
export function createMetricsCollectionHandler(): FallbackHandler {
  const metrics: {
    totalFallbacks: number
    fallbacksByDevice: Map<string, number>
    fallbacksByConnection: Map<string, number>
    lastFallbackTime: Date | undefined
  } = {
    totalFallbacks: 0,
    fallbacksByDevice: new Map<string, number>(),
    fallbacksByConnection: new Map<string, number>(),
    lastFallbackTime: undefined,
  }

  const handler = (event: FallbackEvent) => {
    metrics.totalFallbacks++
    metrics.lastFallbackTime = event.timestamp

    const deviceCount = metrics.fallbacksByDevice.get(event.deviceId) || 0
    metrics.fallbacksByDevice.set(event.deviceId, deviceCount + 1)

    if (event.fallbackConnection) {
      const connectionKey = `${event.primaryConnection}->${event.fallbackConnection}`
      const count = metrics.fallbacksByConnection.get(connectionKey) || 0
      metrics.fallbacksByConnection.set(connectionKey, count + 1)
    }
  }

  // Attach metrics getter to handler for retrieval
  ;(handler as any).getMetrics = () => ({ ...metrics })

  return handler
}

/**
 * Built-in fallback handler: Alert on repeated fallbacks
 */
export function createAlertHandler(alertThreshold: number = 3): FallbackHandler {
  const fallbackCounts = new Map<string, number>()
  const logger = new Logger('FallbackAlertHandler')

  return (event: FallbackEvent) => {
    const count = (fallbackCounts.get(event.deviceId) || 0) + 1
    fallbackCounts.set(event.deviceId, count)

    if (count === alertThreshold) {
      logger.error(
        `ALERT: Device ${event.deviceId} has fallen back ${count} times - check connection`,
      )
    }

    if (count > alertThreshold && count % alertThreshold === 0) {
      logger.error(`ALERT: Device ${event.deviceId} has fallen back ${count} times`)
    }
  }
}
