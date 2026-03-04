import { describe, expect, it } from 'vitest'

import {
  APIError,
  APINotAvailableError,
  BLENotAvailableError,
  CommandFailedError,
  ConnectionTimeoutError,
  DeviceNotFoundError,
  DiscoveryError,
  SwitchBotError,
  ValidationError,
} from '../src/errors.js'

describe('error Classes', () => {
  describe('switchBotError', () => {
    it('should create base error with message and code', () => {
      const error = new SwitchBotError('Test error', 'TEST_CODE')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.name).toBe('SwitchBotError')
    })

    it('should work without error code', () => {
      const error = new SwitchBotError('Test error')

      expect(error.code).toBeUndefined()
    })
  })

  describe('bLENotAvailableError', () => {
    it('should create BLE error with default message', () => {
      const error = new BLENotAvailableError()

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('BLENotAvailableError')
      expect(error.code).toBe('BLE_NOT_AVAILABLE')
      expect(error.message).toContain('BLE not available')
    })

    it('should create BLE error with custom message', () => {
      const error = new BLENotAvailableError('Custom BLE error')

      expect(error.message).toBe('Custom BLE error')
    })
  })

  describe('aPINotAvailableError', () => {
    it('should create API error with default message', () => {
      const error = new APINotAvailableError()

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('APINotAvailableError')
      expect(error.code).toBe('API_NOT_AVAILABLE')
      expect(error.message).toContain('API not available')
    })
  })

  describe('deviceNotFoundError', () => {
    it('should create device not found error', () => {
      const error = new DeviceNotFoundError('device-123')

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('DeviceNotFoundError')
      expect(error.code).toBe('DEVICE_NOT_FOUND')
      expect(error.message).toContain('device-123')
    })
  })

  describe('commandFailedError', () => {
    it('should create command failed error with connection type', () => {
      const error = new CommandFailedError('Command failed', 'ble')

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('CommandFailedError')
      expect(error.code).toBe('COMMAND_FAILED')
      expect(error.connectionType).toBe('ble')
    })

    it('should include original error', () => {
      const originalError = new Error('Original')
      const error = new CommandFailedError('Command failed', 'api', originalError)

      expect(error.originalError).toBe(originalError)
    })
  })

  describe('connectionTimeoutError', () => {
    it('should create timeout error with default message', () => {
      const error = new ConnectionTimeoutError()

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('ConnectionTimeoutError')
      expect(error.code).toBe('CONNECTION_TIMEOUT')
      expect(error.message).toContain('timeout')
    })

    it('should include timeout duration', () => {
      const error = new ConnectionTimeoutError('Timeout after 5000ms', 5000)

      expect(error.timeoutMs).toBe(5000)
    })
  })

  describe('discoveryError', () => {
    it('should create discovery error', () => {
      const error = new DiscoveryError('Discovery failed')

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('DiscoveryError')
      expect(error.code).toBe('DISCOVERY_ERROR')
    })

    it('should include original error', () => {
      const originalError = new Error('Original')
      const error = new DiscoveryError('Discovery failed', originalError)

      expect(error.originalError).toBe(originalError)
    })
  })

  describe('aPIError', () => {
    it('should create API error with status code', () => {
      const error = new APIError('API request failed', 401, 'Unauthorized')

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('APIError')
      expect(error.code).toBe('API_ERROR')
      expect(error.statusCode).toBe(401)
      expect(error.statusMessage).toBe('Unauthorized')
    })
  })

  describe('validationError', () => {
    it('should create validation error with parameter name', () => {
      const error = new ValidationError('Invalid brightness value', 'brightness')

      expect(error).toBeInstanceOf(SwitchBotError)
      expect(error.name).toBe('ValidationError')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.parameter).toBe('brightness')
    })

    it('should work without parameter name', () => {
      const error = new ValidationError('Invalid input')

      expect(error.parameter).toBeUndefined()
    })
  })
})
