import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoRelaySwitch1 } from '../../src/devices/wo-relay-switch-1.js'
import { DEVICE_COMMANDS } from '../../src/settings.js'

const ENCRYPTION_KEY = '00112233445566778899aabbccddeeff' // 16 bytes hex
const ENCRYPTION_IV = '0102030405060708090a0b0c0d0e0f10' // 16 bytes hex

describe('relay Switch 1 BLE encryption', () => {
  it('sends encrypted command when encryptionKey is present', async () => {
    const relay = new WoRelaySwitch1({
      id: 'test-relay',
      name: 'Test Relay',
      deviceType: 'Relay Switch 1',
      connectionTypes: ['ble'],
      encryptionKey: ENCRYPTION_KEY,
      encryptionIV: ENCRYPTION_IV,
    })
    const sent: Buffer[] = []
    ;(relay as any).sendCommand = vi.fn(async (cmd: Buffer) => {
      sent.push(cmd)
      return { success: true }
    })
    await relay.turnOn()
    expect(sent.length).toBe(1)
    // Encrypted command should start with 0x11
    expect(sent[0][0]).toBe(0x11)
    // Should not match plain command
    expect(sent[0].equals(Buffer.from(DEVICE_COMMANDS.COMMON.POWER_ON))).toBe(false)
  })

  it('sends plain command when encryptionKey is absent', async () => {
    const relay = new WoRelaySwitch1({
      id: 'test-relay',
      name: 'Test Relay',
      deviceType: 'Relay Switch 1',
      connectionTypes: ['ble'],
    })
    const sent: Buffer[] = []
    ;(relay as any).sendCommand = vi.fn(async (cmd: Buffer) => {
      sent.push(cmd)
      return { success: true }
    })
    await relay.turnOn()
    expect(sent.length).toBe(1)
    expect(sent[0][0]).not.toBe(0x11)
    expect(sent[0].equals(Buffer.from(DEVICE_COMMANDS.COMMON.POWER_ON))).toBe(true)
  })
})
