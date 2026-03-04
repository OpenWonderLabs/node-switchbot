import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { WoStrip } from '../src/devices/wo-strip.js'
import { DEVICE_COMMANDS } from '../src/settings.js'

const ENCRYPTION_KEY = '00112233445566778899aabbccddeeff' // 16 bytes hex
const ENCRYPTION_IV = '0102030405060708090a0b0c0d0e0f10' // 16 bytes hex

describe('strip Light BLE encryption', () => {
  it('sends encrypted command when encryptionKey is present', async () => {
    const strip = new WoStrip({
      id: 'test-strip',
      name: 'Test Strip',
      deviceType: 'Strip Light',
      connectionTypes: ['ble'],
      encryptionKey: ENCRYPTION_KEY,
      encryptionIV: ENCRYPTION_IV,
    })
    const sent: Buffer[] = []
    ;(strip as any).sendCommand = vi.fn(async (cmd: Buffer) => {
      sent.push(cmd)
      return { success: true }
    })
    await strip.turnOn()
    expect(sent.length).toBe(1)
    expect(sent[0][0]).toBe(0x11)
    expect(sent[0].equals(Buffer.from([...DEVICE_COMMANDS.BULB.BASE, ...DEVICE_COMMANDS.BULB.TURN_ON]))).toBe(false)
  })

  it('sends plain command when encryptionKey is absent', async () => {
    const strip = new WoStrip({
      id: 'test-strip',
      name: 'Test Strip',
      deviceType: 'Strip Light',
      connectionTypes: ['ble'],
    })
    const sent: Buffer[] = []
    ;(strip as any).sendCommand = vi.fn(async (cmd: Buffer) => {
      sent.push(cmd)
      return { success: true }
    })
    await strip.turnOn()
    expect(sent.length).toBe(1)
    expect(sent[0][0]).not.toBe(0x11)
    expect(sent[0].equals(Buffer.from([...DEVICE_COMMANDS.BULB.BASE, ...DEVICE_COMMANDS.BULB.TURN_ON]))).toBe(true)
  })
})
