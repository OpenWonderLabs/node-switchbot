import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { ErrorUtils, LogLevel, ValidationUtils } from './device.js'

describe('validationUtils', () => {
  describe('validatePercentage', () => {
    it('should accept valid percentages', () => {
      expect(() => ValidationUtils.validatePercentage(0)).not.toThrow()
      expect(() => ValidationUtils.validatePercentage(50)).not.toThrow()
      expect(() => ValidationUtils.validatePercentage(100)).not.toThrow()
    })

    it('should reject invalid percentages', () => {
      expect(() => ValidationUtils.validatePercentage(-1)).toThrow('must be between 0 and 100')
      expect(() => ValidationUtils.validatePercentage(101)).toThrow('must be between 0 and 100')
      expect(() => ValidationUtils.validatePercentage(Number.NaN)).toThrow('must be a valid number')
    })

    it('should reject non-numbers', () => {
      expect(() => ValidationUtils.validatePercentage('50' as any)).toThrow('must be a valid number')
      expect(() => ValidationUtils.validatePercentage(null as any)).toThrow('must be a valid number')
    })
  })

  describe('validateRGB', () => {
    it('should accept valid RGB values', () => {
      expect(() => ValidationUtils.validateRGB(0)).not.toThrow()
      expect(() => ValidationUtils.validateRGB(128)).not.toThrow()
      expect(() => ValidationUtils.validateRGB(255)).not.toThrow()
    })

    it('should reject invalid RGB values', () => {
      expect(() => ValidationUtils.validateRGB(-1)).toThrow('must be an integer between 0 and 255')
      expect(() => ValidationUtils.validateRGB(256)).toThrow('must be an integer between 0 and 255')
      expect(() => ValidationUtils.validateRGB(128.5)).toThrow('must be an integer between 0 and 255')
    })
  })

  describe('validateBuffer', () => {
    it('should accept valid buffers', () => {
      const buffer = Buffer.from([1, 2, 3])
      expect(() => ValidationUtils.validateBuffer(buffer)).not.toThrow()
      expect(() => ValidationUtils.validateBuffer(buffer, 3)).not.toThrow()
    })

    it('should reject non-buffers', () => {
      expect(() => ValidationUtils.validateBuffer('not a buffer' as any)).toThrow('must be a Buffer instance')
      expect(() => ValidationUtils.validateBuffer(null as any)).toThrow('must be a Buffer instance')
    })

    it('should validate buffer length', () => {
      const buffer = Buffer.from([1, 2, 3])
      expect(() => ValidationUtils.validateBuffer(buffer, 2)).toThrow('must have exactly 2 bytes')
      expect(() => ValidationUtils.validateBuffer(buffer, 4)).toThrow('must have exactly 4 bytes')
    })
  })

  describe('validateString', () => {
    it('should accept valid strings', () => {
      expect(() => ValidationUtils.validateString('hello')).not.toThrow()
      expect(() => ValidationUtils.validateString('test', 'param', 1, 10)).not.toThrow()
    })

    it('should reject non-strings', () => {
      expect(() => ValidationUtils.validateString(123 as any)).toThrow('must be a string')
      expect(() => ValidationUtils.validateString(null as any)).toThrow('must be a string')
    })

    it('should validate string length', () => {
      expect(() => ValidationUtils.validateString('')).toThrow('must have at least 1 character')
      expect(() => ValidationUtils.validateString('too long', 'param', 1, 5)).toThrow('must have at most 5 character')
    })
  })

  describe('validateRange', () => {
    it('should accept values in range', () => {
      expect(() => ValidationUtils.validateRange(5, 0, 10)).not.toThrow()
      expect(() => ValidationUtils.validateRange(0, 0, 10)).not.toThrow()
      expect(() => ValidationUtils.validateRange(10, 0, 10)).not.toThrow()
    })

    it('should reject values out of range', () => {
      expect(() => ValidationUtils.validateRange(-1, 0, 10)).toThrow('must be between 0 and 10')
      expect(() => ValidationUtils.validateRange(11, 0, 10)).toThrow('must be between 0 and 10')
    })

    it('should validate integers when required', () => {
      expect(() => ValidationUtils.validateRange(5, 0, 10, 'value', true)).not.toThrow()
      expect(() => ValidationUtils.validateRange(5.5, 0, 10, 'value', true)).toThrow('must be an integer')
    })
  })

  describe('validateMacAddress', () => {
    it('should accept valid MAC addresses', () => {
      expect(() => ValidationUtils.validateMacAddress('AA:BB:CC:DD:EE:FF')).not.toThrow()
      expect(() => ValidationUtils.validateMacAddress('aa:bb:cc:dd:ee:ff')).not.toThrow()
      expect(() => ValidationUtils.validateMacAddress('AA-BB-CC-DD-EE-FF')).not.toThrow()
      expect(() => ValidationUtils.validateMacAddress('aabbccddeeff')).not.toThrow()
    })

    it('should reject invalid MAC addresses', () => {
      expect(() => ValidationUtils.validateMacAddress('invalid')).toThrow('must be a valid MAC address format')
      expect(() => ValidationUtils.validateMacAddress('GG:BB:CC:DD:EE:FF')).toThrow('must be a valid MAC address format')
    })
  })

  describe('validateEnum', () => {
    it('should accept valid enum values', () => {
      const allowed = ['red', 'green', 'blue'] as const
      expect(() => ValidationUtils.validateEnum('red', allowed)).not.toThrow()
      expect(() => ValidationUtils.validateEnum('green', allowed)).not.toThrow()
    })

    it('should reject invalid enum values', () => {
      const allowed = ['red', 'green', 'blue'] as const
      expect(() => ValidationUtils.validateEnum('yellow', allowed)).toThrow('must be one of: red, green, blue')
    })
  })
})

describe('errorUtils', () => {
  describe('createTimeoutError', () => {
    it('should create descriptive timeout errors', () => {
      const error = ErrorUtils.createTimeoutError('connect', 5000)
      expect(error.message).toBe('Operation \'connect\' timed out after 5000ms')
    })
  })

  describe('createConnectionError', () => {
    it('should create connection errors with device context', () => {
      const error = ErrorUtils.createConnectionError('device123')
      expect(error.message).toBe('Failed to connect to device device123')
    })

    it('should include cause if provided', () => {
      const cause = new Error('Network unavailable')
      const error = ErrorUtils.createConnectionError('device123', cause)
      expect(error.message).toBe('Failed to connect to device device123: Network unavailable')
    })
  })

  describe('createCommandError', () => {
    it('should create command errors with context', () => {
      const error = ErrorUtils.createCommandError('turnOn', 'device123')
      expect(error.message).toBe('Command \'turnOn\' failed for device device123')
    })
  })

  describe('withTimeout', () => {
    it('should resolve when operation completes within timeout', async () => {
      const fastOperation = Promise.resolve('success')
      const result = await ErrorUtils.withTimeout(fastOperation, 1000, 'test')
      expect(result).toBe('success')
    })

    it('should reject when operation exceeds timeout', async () => {
      const slowOperation = new Promise(resolve => setTimeout(resolve, 100))
      await expect(ErrorUtils.withTimeout(slowOperation, 50, 'test'))
        .rejects
        .toThrow('Operation \'test\' timed out after 50ms')
    })
  })
})

describe('logLevel', () => {
  it('should export all log levels', () => {
    expect(LogLevel.SUCCESS).toBe('success')
    expect(LogLevel.DEBUGSUCCESS).toBe('debugsuccess')
    expect(LogLevel.WARN).toBe('warn')
    expect(LogLevel.DEBUGWARN).toBe('debugwarn')
    expect(LogLevel.ERROR).toBe('error')
    expect(LogLevel.DEBUGERROR).toBe('debugerror')
    expect(LogLevel.DEBUG).toBe('debug')
    expect(LogLevel.INFO).toBe('info')
  })
})
