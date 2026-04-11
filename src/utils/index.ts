/**
 * Recursively merges two objects, preserving old values when new values are null or undefined.
 * Arrays are not deeply merged (new array replaces old).
 */
/**
 * Merges two BLEAdvertisement objects recursively, preserving old values when new are null/undefined.
 */
import type { BLEAdvertisement } from '../types/ble.js'
/**
 * Extracts all device-relevant options from a SwitchBotConfig object.
 * Ensures future config fields are automatically supported for device instantiation.
 */
import type { ConnectionType, LogLevel, SwitchBotConfig } from '../types/index.js'

/**
 * Validates that a Buffer has at least the expected minimum length.
 * Throws an error if the buffer is too short, including actual vs expected length and context.
 */
/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils/index.ts: SwitchBot v4.0.0 - Utility Functions
 */
import { Buffer } from 'node:buffer'

export function extractDeviceOptionsFromConfig(config: SwitchBotConfig): Record<string, unknown> {
  return {
    bleConnection: config.bleConnection,
    apiClient: config.apiClient,
    enableFallback: config.enableFallback,
    preferredConnection: config.preferredConnection as ConnectionType,
    enableConnectionIntelligence: config.enableConnectionIntelligence,
    enableCircuitBreaker: config.enableCircuitBreaker,
    enableRetry: config.enableRetry,
    retryConfig: config.retryConfig,
    circuitBreakerConfig: config.circuitBreakerConfig,
    logLevel: config.logLevel,
    // Add more fields here as needed in the future
  }
}

export function deepMerge<T extends Record<string, any>>(oldObj: T, newObj: Partial<T>): T {
  const result: any = Array.isArray(oldObj) ? [...oldObj] : { ...oldObj }
  for (const key of Object.keys(newObj)) {
    const newVal = newObj[key]
    const oldVal = oldObj[key]
    if (newVal === undefined || newVal === null) {
      // Preserve old value
      result[key] = oldVal
    } else if (
      typeof oldVal === 'object' && oldVal !== null
      && typeof newVal === 'object' && newVal !== null
      && !Array.isArray(newVal) && !Array.isArray(oldVal)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(oldVal, newVal)
    } else {
      // Use new value
      result[key] = newVal
    }
  }
  return result
}
export function mergeAdvertisement<T extends BLEAdvertisement>(oldAdv: T, newAdv: Partial<T>): T {
  return deepMerge(oldAdv, newAdv)
}

export function validateResponseLength(buffer: Buffer, minLength: number, context: string): void {
  if (!buffer || buffer.length < minLength) {
    throw new Error(
      `Truncated response in ${context}: expected at least ${minLength} bytes, got ${buffer ? buffer.length : 0}`,
    )
  }
}

/**
 * Logger utility for consistent logging across the library
 */
export class Logger {
  constructor(
    private readonly name: string,
    private level: LogLevel = 2, // WARN by default
  ) { }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  error(message: string, ...args: any[]): void {
    if (this.level >= 1) {
      console.error(`[${this.name}] ERROR:`, message, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level >= 2) {
      console.warn(`[${this.name}] WARN:`, message, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level >= 3) {
      console.warn(`[${this.name}] INFO:`, message, ...args)
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.level >= 4) {
      console.warn(`[${this.name}] DEBUG:`, message, ...args)
    }
  }
}

// Regex patterns at module scope to avoid recompilation
const MAC_REGEX = /^(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i
const DASH_REGEX = /-/g
const COLON_REGEX = /:/g

/**
 * Validate MAC address format
 */
export function isValidMAC(mac: string): boolean {
  return MAC_REGEX.test(mac)
}

/**
 * Normalize MAC address to lowercase with colons
 */
export function normalizeMAC(mac: string): string {
  return mac.toLowerCase().replace(DASH_REGEX, ':')
}

/**
 * Convert MAC address to device ID format
 */
export function macToDeviceId(mac: string): string {
  return mac.replace(COLON_REGEX, '').toUpperCase()
}

/**
 * Extract MAC address from manufacturer data (SwitchBot: company ID 0x0969)
 * Bytes: [2 bytes company ID (69 09)] + [6 bytes MAC] + ...
 */
export function extractMacFromManufacturerData(manufacturerDataHex?: unknown): string | undefined {
  if (!manufacturerDataHex || typeof manufacturerDataHex !== 'string') {
    return undefined
  }

  // Check if hex string starts with 6909 (SwitchBot company ID in little-endian)
  if (!manufacturerDataHex.startsWith('6909')) {
    return undefined
  }

  // Extract 6 bytes (12 hex chars) starting at position 4 (after company ID)
  const macHex = manufacturerDataHex.substring(4, 16)
  if (macHex.length !== 12) {
    return undefined
  }

  // Convert to MAC address format: XX:XX:XX:XX:XX:XX
  return [
    macHex.substring(0, 2),
    macHex.substring(2, 4),
    macHex.substring(4, 6),
    macHex.substring(6, 8),
    macHex.substring(8, 10),
    macHex.substring(10, 12),
  ].join(':').toUpperCase()
}

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Timeout promise wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutHandle!)
    return result
  } catch (error) {
    clearTimeout(timeoutHandle!)
    throw error
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delayMs?: number
    backoff?: boolean
    onRetry?: (attempt: number, error: Error) => void
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
    onRetry,
  } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxAttempts) {
        const waitTime = backoff ? delayMs * attempt : delayMs
        onRetry?.(attempt, lastError)
        await delay(waitTime)
      }
    }
  }

  throw lastError ?? new Error('Retry failed without a captured error')
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Convert temperature from Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9 / 5) + 32
}

/**
 * Convert temperature from Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5 / 9
}

/**
 * Parse hex string to buffer
 */
export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex')
}

/**
 * Convert buffer to hex string
 */
export function bufferToHex(buffer: Buffer): string {
  return buffer.toString('hex')
}

/**
 * Generate random nonce for API requests
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15)
    + Math.random().toString(36).substring(2, 15)
}

/**
 * Generate timestamp for API requests
 */
export function generateTimestamp(): string {
  return Date.now().toString()
}

/**
 * Create HMAC-SHA256 signature for OpenAPI
 */
export async function createSignature(
  token: string,
  secret: string,
  timestamp: string,
  nonce: string,
): Promise<string> {
  const crypto = await import('node:crypto')
  const data = `${token}${timestamp}${nonce}`
  return crypto.createHmac('sha256', secret).update(data).digest('base64')
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Check if value is a promise
 */
export function isPromise<T>(value: any): value is Promise<T> {
  return value && typeof value.then === 'function'
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delayMs)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number,
): (...args: Parameters<T>) => void {
  let lastRun = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastRun >= limitMs) {
      fn(...args)
      lastRun = now
    }
  }
}

// Export Bot BLE password utilities
export {
  BOT_BLE_ACTIONS,
  type BotBleAction,
  buildBotBleCommand,
  parseBotBleResponse,
  validateBotPassword,
} from './bot-ble.js'
export { CircuitBreaker, type CircuitBreakerConfig, CircuitBreakerState, type CircuitBreakerStats } from './circuit-breaker.js'
export { type ConnectionStats, ConnectionTracker } from './connection-tracker.js'
export {
  createAlertHandler,
  createLoggingFallbackHandler,
  createMetricsCollectionHandler,
  type FallbackEvent,
  type FallbackHandler,
  FallbackHandlerManager,
  type FallbackHandlerOptions,
} from './fallback-handler.js'
// Export advanced utilities
export { type RetryConfig, RetryExecutor, type RetryResult } from './retry.js'
