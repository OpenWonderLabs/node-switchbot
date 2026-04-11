/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * errors.ts: SwitchBot v4.0.0 - Custom Error Classes
 */

/**
 * Base error class for SwitchBot errors
 */
export class SwitchBotError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'SwitchBotError'
  }
}

/**
 * Error thrown for generic BLE operation failures
 */
export class SwitchbotOperationError extends SwitchBotError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 'BLE_OPERATION_FAILED')
    this.name = 'SwitchbotOperationError'
  }
}

/**
 * Error thrown for BLE authentication failures (e.g., encryption key invalid)
 */
export class SwitchbotAuthenticationError extends SwitchBotError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 'BLE_AUTH_FAILED')
    this.name = 'SwitchbotAuthenticationError'
  }
}

/**
 * Error thrown when a required BLE characteristic is missing
 */
export class CharacteristicMissingError extends SwitchBotError {
  constructor(characteristic: string) {
    super(`BLE characteristic missing: ${characteristic}`, 'BLE_CHARACTERISTIC_MISSING')
    this.name = 'CharacteristicMissingError'
  }
}

/**
 * Error thrown when BLE is not available or supported
 */
export class BLENotAvailableError extends SwitchBotError {
  constructor(message = 'BLE not available on this platform or device') {
    super(message, 'BLE_NOT_AVAILABLE')
    this.name = 'BLENotAvailableError'
  }
}

/**
 * Error thrown when API is not available or credentials are missing
 */
export class APINotAvailableError extends SwitchBotError {
  constructor(message = 'API not available or credentials not provided') {
    super(message, 'API_NOT_AVAILABLE')
    this.name = 'APINotAvailableError'
  }
}

/**
 * Error thrown when a device is not found
 */
export class DeviceNotFoundError extends SwitchBotError {
  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`, 'DEVICE_NOT_FOUND')
    this.name = 'DeviceNotFoundError'
  }
}

/**
 * Error thrown when a command fails
 */
export class CommandFailedError extends SwitchBotError {
  constructor(
    message: string,
    public readonly connectionType?: 'ble' | 'api',
    public readonly originalError?: Error,
  ) {
    super(message, 'COMMAND_FAILED')
    this.name = 'CommandFailedError'
  }
}

/**
 * Error thrown when a connection timeout occurs
 */
export class ConnectionTimeoutError extends SwitchBotError {
  constructor(message = 'Connection timeout', public readonly timeoutMs?: number) {
    super(message, 'CONNECTION_TIMEOUT')
    this.name = 'ConnectionTimeoutError'
  }
}

/**
 * Error thrown when device discovery fails
 */
export class DiscoveryError extends SwitchBotError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message, 'DISCOVERY_ERROR')
    this.name = 'DiscoveryError'
  }
}

/**
 * Error thrown when API request fails
 */
export class APIError extends SwitchBotError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly statusMessage?: string,
  ) {
    super(message, 'API_ERROR')
    this.name = 'APIError'
  }
}

/**
 * Error thrown when invalid parameters are provided
 */
export class ValidationError extends SwitchBotError {
  constructor(message: string, public readonly parameter?: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}
