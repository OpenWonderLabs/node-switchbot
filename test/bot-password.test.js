/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * test/bot-password.test.ts: Bot password support tests
 */
import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { BOT_BLE_ACTIONS, buildBotBleCommand, parseBotBleResponse, validateBotPassword } from '../src/utils/index.js'

describe('bot Password Support', () => {
  describe('validateBotPassword', () => {
    it('accepts valid 4-character alphanumeric passwords', () => {
      expect(() => validateBotPassword('A1b2')).not.toThrow()
      expect(() => validateBotPassword('Test')).not.toThrow()
      expect(() => validateBotPassword('1234')).not.toThrow()
      expect(() => validateBotPassword('abcd')).not.toThrow()
      expect(() => validateBotPassword('ABCD')).not.toThrow()
    })
    it('rejects passwords with invalid length', () => {
      expect(() => validateBotPassword('abc')).toThrow('Invalid Bot password')
      expect(() => validateBotPassword('abcde')).toThrow('Invalid Bot password')
      expect(() => validateBotPassword('')).toThrow('Invalid Bot password')
    })
    it('rejects passwords with non-alphanumeric characters', () => {
      expect(() => validateBotPassword('ab!2')).toThrow('Invalid Bot password')
      expect(() => validateBotPassword('a b2')).toThrow('Invalid Bot password')
      expect(() => validateBotPassword('ab-2')).toThrow('Invalid Bot password')
    })
    it('is case-sensitive', () => {
      // Both should be valid but different
      expect(() => validateBotPassword('AbCd')).not.toThrow()
      expect(() => validateBotPassword('abcd')).not.toThrow()
    })
  })
  describe('buildBotBleCommand', () => {
    it('builds plain commands without password', () => {
      const pressCmd = buildBotBleCommand(BOT_BLE_ACTIONS.PRESS)
      const onCmd = buildBotBleCommand(BOT_BLE_ACTIONS.TURN_ON)
      const offCmd = buildBotBleCommand(BOT_BLE_ACTIONS.TURN_OFF)
      expect(pressCmd).toEqual(Buffer.from([0x57, 0x01, 0x00]))
      expect(onCmd).toEqual(Buffer.from([0x57, 0x01, 0x01]))
      expect(offCmd).toEqual(Buffer.from([0x57, 0x01, 0x02]))
    })
    it('builds encrypted commands with password', () => {
      // Known test vector from homebridge-switchbot PR
      const cmd = buildBotBleCommand(BOT_BLE_ACTIONS.TURN_ON, 'A1b2')
      expect(cmd.length).toBe(7)
      expect(cmd[0]).toBe(0x57) // Command prefix
      expect(cmd[1]).toBe(0x11) // Encrypted command indicator
      expect(cmd).toEqual(Buffer.from([0x57, 0x11, 0xB8, 0x59, 0x37, 0x46, 0x01]))
    })
    it('generates different CRC32 for different passwords', () => {
      const cmd1 = buildBotBleCommand(BOT_BLE_ACTIONS.PRESS, 'AbCd')
      const cmd2 = buildBotBleCommand(BOT_BLE_ACTIONS.PRESS, 'abcd')
      // Same action (last byte), but different CRC32 (bytes 2-5)
      expect(cmd1[6]).toBe(cmd2[6]) // Action byte same
      expect(cmd1.subarray(2, 6).equals(cmd2.subarray(2, 6))).toBe(false) // CRC32 different
    })
    it('rejects invalid action codes', () => {
      expect(() => buildBotBleCommand(0x99)).toThrow('Invalid Bot BLE action')
    })
    it('validates password when provided', () => {
      expect(() => buildBotBleCommand(BOT_BLE_ACTIONS.PRESS, 'abc')).toThrow('Invalid Bot password')
    })
  })
  describe('parseBotBleResponse', () => {
    it('accepts success response (0x01)', () => {
      const response = Buffer.from([0x01, 0x00, 0x00])
      expect(parseBotBleResponse(response)).toBe(true)
    })
    it('accepts encrypted success response (0x05)', () => {
      const response = Buffer.from([0x05, 0x00, 0x00])
      expect(parseBotBleResponse(response)).toBe(true)
    })
    it('rejects invalid response length', () => {
      const shortResponse = Buffer.from([0x01, 0x00])
      expect(() => parseBotBleResponse(shortResponse)).toThrow('Invalid Bot response length')
      const longResponse = Buffer.from([0x01, 0x00, 0x00, 0x00])
      expect(() => parseBotBleResponse(longResponse)).toThrow('Invalid Bot response length')
    })
    it('rejects error response codes', () => {
      const errorResponse = Buffer.from([0x00, 0x00, 0x00])
      expect(() => parseBotBleResponse(errorResponse)).toThrow('Bot command failed')
    })
  })
  describe('bOT_BLE_ACTIONS constants', () => {
    it('defines correct action values', () => {
      expect(BOT_BLE_ACTIONS.PRESS).toBe(0x00)
      expect(BOT_BLE_ACTIONS.TURN_ON).toBe(0x01)
      expect(BOT_BLE_ACTIONS.TURN_OFF).toBe(0x02)
    })
  })
})
// # sourceMappingURL=bot-password.test.js.map
