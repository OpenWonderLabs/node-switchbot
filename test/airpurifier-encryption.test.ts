import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { WoAirPurifier } from '../src/devices/wo-air-purifier.js'
import { DEVICE_COMMANDS } from '../src/settings.js'

const ENCRYPTION_KEY = '00112233445566778899aabbccddeeff' // 16 bytes hex
const ENCRYPTION_IV = '0102030405060708090a0b0c0d0e0f10' // 16 bytes hex

describe('air Purifier BLE encryption', () => {
  it('sends encrypted command when encryptionKey is present', async () => {
    const air = new WoAirPurifier({
      id: 'test-air',
      name: 'Test Air',
      deviceType: 'Air Purifier',
      connectionTypes: ['ble'],
      encryptionKey: ENCRYPTION_KEY,
      encryptionIV: ENCRYPTION_IV,
    })
    const sent: Buffer[] = []
    ;(air as any).sendCommand = vi.fn(async (cmd: Buffer) => {
      sent.push(cmd)
      return { success: true }
    })
    await air.turnOn()
    expect(sent.length).toBe(1)
    expect(sent[0][0]).toBe(0x11)
    expect(sent[0].equals(Buffer.from(DEVICE_COMMANDS.AIR_PURIFIER.TURN_ON))).toBe(false)
  })

  it('sends plain command when encryptionKey is absent', async () => {
    const air = new WoAirPurifier({
      id: 'test-air',
      name: 'Test Air',
      deviceType: 'Air Purifier',
      connectionTypes: ['ble'],
    })
    const sent: Buffer[] = []
    ;(air as any).sendCommand = vi.fn(async (cmd: Buffer) => {
      sent.push(cmd)
      return { success: true }
    })
    await air.turnOn()
    expect(sent.length).toBe(1)
    expect(sent[0][0]).not.toBe(0x11)
    expect(sent[0].equals(Buffer.from(DEVICE_COMMANDS.AIR_PURIFIER.TURN_ON))).toBe(true)
  })
})
