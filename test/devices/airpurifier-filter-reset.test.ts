/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * airpurifier-filter-reset.test.ts: verified filter usage reset (pySwitchbot 3.1.0, sblibs/pySwitchbot#583)
 */

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoAirPurifierPM25 } from '../../src/devices/wo-air-purifier-pm25.js'
import { WoAirPurifier } from '../../src/devices/wo-air-purifier.js'
import { DEVICE_COMMANDS } from '../../src/settings.js'

function purifier(replies: Array<Buffer | Error | undefined>, options: { encryptionKey?: string, Class?: any } = {}) {
  const queue = [...replies]
  const sendCommand = vi.fn(async (_mac: string, _command: Buffer, _options?: Record<string, unknown>) => {
    const next = queue.shift()
    if (next instanceof Error) {
      throw next
    }
    return next
  })
  const Class = options.Class ?? WoAirPurifier
  const device = new Class(
    { id: 'AP', name: 'Purifier', deviceType: 'Air Purifier', mac: 'aa:bb:cc:dd:ee:ff', connectionTypes: ['ble'], encryptionKey: options.encryptionKey },
    { bleConnection: { sendCommand, read: vi.fn(), write: vi.fn() } as any, enableRetry: true },
  )
  return { device, sendCommand }
}

const bytes = (...b: number[]) => Buffer.from(b)

describe('air purifier resetFilterUsage', () => {
  it.each([WoAirPurifier, WoAirPurifierPM25])('%o sends the reset once, then confirms 0 hours', async (Class) => {
    const { device, sendCommand } = purifier([bytes(0x01), bytes(0x01, 0x00, 0x00)], { Class })
    await expect(device.resetFilterUsage()).resolves.toBe(true)
    expect(sendCommand.mock.calls.map(([, command]) => [...(command as Buffer)])).toEqual([
      [...DEVICE_COMMANDS.AIR_PURIFIER.RESET_FILTER_USAGE],
      [...DEVICE_COMMANDS.AIR_PURIFIER.READ_FILTER_USAGE],
    ])
    expect(sendCommand.mock.calls[0][2]).toMatchObject({ validateResponse: false })
  })

  // The same failure cases as pySwitchbot's test_reset_filter_usage_failure
  it.each([
    ['reset rejected', [bytes(0x02)], 'reset was rejected', 1],
    ['empty reset reply', [bytes()], 'reset was rejected', 1],
    ['no read reply', [bytes(0x01), undefined], 'could not be verified', 2],
    ['empty read reply', [bytes(0x01), bytes()], 'could not be verified', 2],
    ['short read reply', [bytes(0x01), bytes(0x01)], 'could not be verified', 2],
    ['partial counter', [bytes(0x01), bytes(0x01, 0x00)], 'could not be verified', 2],
    ['read rejected', [bytes(0x01), bytes(0x02, 0x00, 0x00)], 'read was rejected', 2],
    ['counter not reset', [bytes(0x01), bytes(0x01, 0x07, 0x68)], '1896 used hours', 2],
  ] as const)('fails when %s', async (_name, replies, message, calls) => {
    const { device, sendCommand } = purifier([...replies])
    await expect(device.resetFilterUsage()).rejects.toThrow(message)
    expect(sendCommand).toHaveBeenCalledTimes(calls)
  })

  // pySwitchbot sends the reset with retry=0: a reset that may have landed must not be repeated.
  it('does not retry the reset when the connection fails', async () => {
    const { device, sendCommand } = purifier([new Error('Connection failed'), bytes(0x01), bytes(0x01, 0x00, 0x00)])
    await expect(device.resetFilterUsage()).rejects.toThrow('reset was rejected: Connection failed')
    expect(sendCommand).toHaveBeenCalledOnce()
  })

  it('retries the read, which is safe to repeat', async () => {
    const { device, sendCommand } = purifier([bytes(0x01), new Error('timeout'), bytes(0x01, 0x00, 0x00)])
    await expect(device.resetFilterUsage()).resolves.toBe(true)
    expect(sendCommand).toHaveBeenCalledTimes(3)
  })

  it('refuses on an encrypted connection without sending anything', async () => {
    const { device, sendCommand } = purifier([], { encryptionKey: '00112233445566778899aabbccddeeff' })
    await expect(device.resetFilterUsage()).rejects.toThrow('encrypted connection')
    expect(sendCommand).not.toHaveBeenCalled()
  })

  it('needs BLE', async () => {
    const device = new WoAirPurifier({ id: 'AP', name: 'Purifier', deviceType: 'Air Purifier', connectionTypes: ['api'] })
    await expect(device.resetFilterUsage()).rejects.toThrow('needs a BLE connection')
  })
})
