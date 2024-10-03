import { beforeEach, describe, expect, it } from 'vitest'

import { ParameterChecker } from '../parameter-checker.js'

describe('parameterChecker', () => {
  let checker: ParameterChecker

  beforeEach(() => {
    checker = new ParameterChecker()
  })

  describe('isSpecified', () => {
    it('should return true if the value is specified', () => {
      expect(checker.isSpecified(123)).toBe(true)
      expect(checker.isSpecified('test')).toBe(true)
      expect(checker.isSpecified(false)).toBe(true)
    })

    it('should return false if the value is undefined', () => {
      expect(checker.isSpecified(undefined)).toBe(false)
    })
  })

  describe('check', () => {
    it('should return false and set error if required object is missing', async () => {
      const result = await checker.check(undefined as any, {}, true)
      expect(result).toBe(false)
      expect(checker.error).toEqual({ code: 'MISSING_REQUIRED', message: 'The first argument is missing.' })
    })

    it('should return true if object is not required and missing', async () => {
      const result = await checker.check(undefined as any, {}, false)
      expect(result).toBe(true)
      expect(checker.error).toBeNull()
    })

    it('should return false and set error if object is not valid', async () => {
      const result = await checker.check('not an object' as any, {}, true)
      expect(result).toBe(false)
      expect(checker.error).toEqual({ code: 'MISSING_REQUIRED', message: 'The first argument is missing.' })
    })

    it('should validate object based on rules', async () => {
      const rules = {
        age: { type: 'integer' as const, required: true, min: 18 },
        name: { type: 'string' as const, required: true },
      }

      const validObj = { age: 25, name: 'John' }
      const invalidObj = { age: 17, name: 'John' }

      expect(await checker.check(validObj, rules)).toBe(true)
      expect(checker.error).toBeNull()

      expect(await checker.check(invalidObj, rules)).toBe(false)
      expect(checker.error).toEqual({ code: 'VALUE_UNDERFLOW', message: 'The `age` must be greater than or equal to 18.' })
    })
  })

  describe('isFloat', () => {
    it('should validate float values correctly', async () => {
      const rule = { type: 'float' as const, min: 1.5, max: 10.5 }

      expect(await checker.isFloat(5.5, rule)).toBe(true)
      expect(checker.error).toBeNull()

      expect(await checker.isFloat(0.5, rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'VALUE_UNDERFLOW', message: 'The `value` must be greater than or equal to 1.5.' })

      expect(await checker.isFloat(11.5, rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'VALUE_OVERFLOW', message: 'The `value` must be less than or equal to 10.5.' })
    })
  })

  describe('isInteger', () => {
    it('should validate integer values correctly', async () => {
      const rule = { type: 'integer' as const }

      expect(await checker.isInteger(5, rule)).toBe(true)
      expect(checker.error).toBeNull()

      expect(await checker.isInteger(5.5, rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'TYPE_INVALID', message: 'The `value` must be an integer.' })
    })
  })

  describe('isBoolean', () => {
    it('should validate boolean values correctly', async () => {
      const rule = { type: 'boolean' as const }

      expect(await checker.isBoolean(true, rule)).toBe(true)
      expect(checker.error).toBeNull()

      expect(await checker.isBoolean('true', rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'TYPE_INVALID', message: 'The `value` must be boolean.' })
    })
  })

  describe('isObject', () => {
    it('should validate object values correctly', async () => {
      const rule = { type: 'object' as const }

      expect(await checker.isObject({}, rule)).toBe(true)
      expect(checker.error).toBeNull()

      expect(await checker.isObject(null, rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'TYPE_INVALID', message: 'The `value` must be an object.' })
    })
  })

  describe('isArray', () => {
    it('should validate array values correctly', async () => {
      const rule = { type: 'array' as const, min: 1, max: 3 }

      expect(await checker.isArray([1, 2], rule)).toBe(true)
      expect(checker.error).toBeNull()

      expect(await checker.isArray([], rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'LENGTH_UNDERFLOW', message: 'The number of elements in the `value` must be greater than or equal to 1.' })

      expect(await checker.isArray([1, 2, 3, 4], rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'LENGTH_OVERFLOW', message: 'The number of elements in the `value` must be less than or equal to 3.' })
    })
  })

  describe('isString', () => {
    it('should validate string values correctly', async () => {
      const rule = { type: 'string' as const, min: 3, max: 5 }

      expect(await checker.isString('test', rule)).toBe(true)
      expect(checker.error).toBeNull()

      expect(await checker.isString('te', rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'LENGTH_UNDERFLOW', message: 'The number of characters in the `value` must be greater than or equal to 3.' })

      expect(await checker.isString('testing', rule)).toBe(false)
      expect(checker.error).toEqual({ code: 'LENGTH_OVERFLOW', message: 'The number of characters in the `value` must be less than or equal to 5.' })
    })
  })
})
