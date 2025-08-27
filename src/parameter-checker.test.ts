import type { Rule } from './device.js'

import { describe, expect, it } from 'vitest'

import { ParameterChecker } from './parameter-checker.js'

describe('parameterChecker', () => {
  it('should pass with empty rules and no required object', async () => {
    const checker = new ParameterChecker()
    const result = await checker.check({}, {}, false)
    expect(result).toBe(true)
    expect(checker.error).toBeNull()
  })

  it('should fail when required object is missing', async () => {
    const checker = new ParameterChecker()
    const result = await checker.check(undefined as any, {}, true)
    expect(result).toBe(false)
    expect(checker.error?.code).toBe('MISSING_REQUIRED')
  })

  it('should fail when required field is missing', async () => {
    const checker = new ParameterChecker()
    const rules: Record<string, Rule> = {
      name: { type: 'string', required: true },
    }
    const result = await checker.check({}, rules)
    expect(result).toBe(false)
    expect(checker.error?.code).toBe('MISSING_REQUIRED')
  })

  it('should fail on type mismatch for integer', async () => {
    const checker = new ParameterChecker()
    const rules: Record<string, Rule> = {
      age: { type: 'integer', required: true },
    }
    const result = await checker.check({ age: 25.5 }, rules)
    expect(result).toBe(false)
    expect(checker.error?.code).toBe('TYPE_INVALID')
  })

  it('should enforce float min and max', async () => {
    const checker = new ParameterChecker()
    const rules: Record<string, Rule> = {
      temperature: { type: 'float', min: 0, max: 100 },
    }
    let result = await checker.check({ temperature: -5 }, rules)
    expect(result).toBe(false)
    expect(checker.error?.code).toBe('VALUE_UNDERFLOW')

    result = await checker.check({ temperature: 150 }, rules)
    expect(result).toBe(false)
    expect(checker.error?.code).toBe('VALUE_OVERFLOW')
  })

  it('should ignore extra parameters', async () => {
    const checker = new ParameterChecker()
    const rules: Record<string, Rule> = {
      id: { type: 'integer' },
    }
    const result = await checker.check({ id: 1, extra: 'ignored' }, rules)
    expect(result).toBe(true)
    expect(checker.error).toBeNull()
  })
})
