import { describe, expect, it } from 'vitest'

import { clamp, deepClone, delay, generateNonce, generateTimestamp, isValidMAC, normalizeMAC } from '../src/utils/index.js'

describe('utility Functions', () => {
  describe('isValidMAC', () => {
    it('should validate correct MAC addresses', () => {
      expect(isValidMAC('AA:BB:CC:DD:EE:FF')).toBe(true)
      expect(isValidMAC('00:11:22:33:44:55')).toBe(true)
      expect(isValidMAC('AA-BB-CC-DD-EE-FF')).toBe(true)
    })
    it('should reject invalid MAC addresses', () => {
      expect(isValidMAC('invalid')).toBe(false)
      expect(isValidMAC('AA:BB:CC:DD:EE')).toBe(false)
      expect(isValidMAC('GG:BB:CC:DD:EE:FF')).toBe(false)
      expect(isValidMAC('')).toBe(false)
    })
  })
  describe('normalizeMAC', () => {
    it('should normalize MAC address to lowercase with colons', () => {
      expect(normalizeMAC('AA:BB:CC:DD:EE:FF')).toBe('aa:bb:cc:dd:ee:ff')
      expect(normalizeMAC('AA-BB-CC-DD-EE-FF')).toBe('aa:bb:cc:dd:ee:ff')
      expect(normalizeMAC('aA-bB-cC-dD-eE-fF')).toBe('aa:bb:cc:dd:ee:ff')
    })
  })
  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(50, 0, 100)).toBe(50)
      expect(clamp(-10, 0, 100)).toBe(0)
      expect(clamp(150, 0, 100)).toBe(100)
      expect(clamp(0, 0, 100)).toBe(0)
      expect(clamp(100, 0, 100)).toBe(100)
    })
  })
  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now()
      await delay(100)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(95)
      expect(elapsed).toBeLessThan(150)
    })
  })
  describe('generateNonce', () => {
    it('should generate random nonce string', () => {
      const nonce1 = generateNonce()
      const nonce2 = generateNonce()
      expect(nonce1).toBeTruthy()
      expect(nonce2).toBeTruthy()
      expect(nonce1).not.toBe(nonce2)
      expect(typeof nonce1).toBe('string')
    })
  })
  describe('generateTimestamp', () => {
    it('should generate timestamp string', () => {
      const timestamp = generateTimestamp()
      const now = Date.now()
      expect(typeof timestamp).toBe('string')
      expect(Number(timestamp)).toBeCloseTo(now, -2)
    })
  })
  describe('deepClone', () => {
    it('should deep clone objects', () => {
      const original = {
        name: 'test',
        nested: {
          value: 42,
          array: [1, 2, 3],
        },
      }
      const cloned = deepClone(original)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.nested).not.toBe(original.nested)
      expect(cloned.nested.array).not.toBe(original.nested.array)
    })
    it('should handle arrays', () => {
      const original = [1, 2, { value: 3 }]
      const cloned = deepClone(original)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })
  })
})
// # sourceMappingURL=utils.test.js.map
