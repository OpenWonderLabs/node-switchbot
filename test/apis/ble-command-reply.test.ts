/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * ble-command-reply.test.ts: a command's reply is the device's next notification, as in pySwitchbot
 */

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { BLEConnection } from '../../src/ble.js'

const MAC = 'aa:bb:cc:dd:ee:ff'

function setup(options: { notifyEvents?: boolean, replyOnWrite?: number[] } = {}) {
  const notifyChar: any = options.notifyEvents === false ? {} : new EventEmitter()
  notifyChar.uuid = 'cba20003224d11e69fb80002a5d5c51b'
  notifyChar.subscribe = (cb: (e?: Error) => void) => cb()
  notifyChar.read = vi.fn((cb: (e: Error | null, d: Buffer) => void) => cb(null, Buffer.from([0x01, 0x42])))
  const writeChar = {
    uuid: 'cba20002224d11e69fb80002a5d5c51b',
    write: vi.fn((_data: Buffer, _withoutResponse: boolean, cb: (err?: Error) => void) => {
      cb()
      // A device that answers immediately, before the write promise has even resolved
      if (options.replyOnWrite) {
        notifyChar.emit('data', Buffer.from(options.replyOnWrite))
      }
    }),
  }
  const peripheral = {
    id: 'id',
    address: MAC,
    connect: (cb: (err?: Error) => void) => cb(),
    disconnect: (cb: () => void) => cb(),
    discoverSomeServicesAndCharacteristics: (_s: string[], _c: string[], cb: (e: null, s: any[], c: any[]) => void) => cb(null, [], [writeChar, notifyChar]),
  }
  const connection = new BLEConnection({ noble: { peripherals: [peripheral] } })
  return { connection, notifyChar, writeChar }
}

describe('bLE command replies', () => {
  // The reply used to be taken by reading the notify characteristic after the write. SwitchBot
  // devices answer with a notification instead (pySwitchbot waits for it), so the read could
  // return a stale value.
  it('uses the notification that answers the command, not a read', async () => {
    const { connection, notifyChar } = setup()
    const reply = connection.sendCommand(MAC, Buffer.from([0x57, 0x01]))
    await vi.waitFor(() => expect((connection as any).notificationFutures.has(MAC)).toBe(true))
    notifyChar.emit('data', Buffer.from([0x01, 0x64]))
    await expect(reply).resolves.toEqual(Buffer.from([0x01, 0x64]))
    expect(notifyChar.read).not.toHaveBeenCalled()
  })

  it('does not miss a reply that arrives during the write', async () => {
    const { connection } = setup({ replyOnWrite: [0x01] })
    await expect(connection.sendCommand(MAC, Buffer.from([0x57, 0x01]))).resolves.toEqual(Buffer.from([0x01]))
  })

  it('validates the reply status', async () => {
    const { connection } = setup({ replyOnWrite: [0x09] })
    await expect(connection.sendCommand(MAC, Buffer.from([0x57, 0x01]))).rejects.toThrow('password incorrect')
  })

  it('times out when no reply arrives', async () => {
    const { connection } = setup()
    await expect(connection.sendCommand(MAC, Buffer.from([0x57, 0x01]), { responseTimeoutMs: 20 })).rejects.toThrow('Notification timeout')
    expect((connection as any).notificationFutures.size).toBe(0)
  })

  it('fails a pending reply when the device disconnects', async () => {
    const { connection } = setup()
    const reply = connection.sendCommand(MAC, Buffer.from([0x57, 0x01]))
    await vi.waitFor(() => expect((connection as any).notificationFutures.has(MAC)).toBe(true))
    await connection.disconnect(MAC)
    await expect(reply).rejects.toThrow('Disconnected')
  })

  it('reads the characteristic when the backend emits no notification events', async () => {
    const { connection, notifyChar } = setup({ notifyEvents: false })
    await expect(connection.sendCommand(MAC, Buffer.from([0x57, 0x01]))).resolves.toEqual(Buffer.from([0x01, 0x42]))
    expect(notifyChar.read).toHaveBeenCalledOnce()
  })

  it('passes notifications with no pending command to subscribers', async () => {
    const { connection, notifyChar } = setup()
    const handler = vi.fn()
    await connection.subscribeNotifications(MAC, handler)
    notifyChar.emit('data', Buffer.from([0x77]))
    expect(handler).toHaveBeenCalledWith(Buffer.from([0x77]))
    // ...and one that answers a command does not reach them
    const reply = connection.sendCommand(MAC, Buffer.from([0x57, 0x01]))
    await vi.waitFor(() => expect((connection as any).notificationFutures.has(MAC)).toBe(true))
    notifyChar.emit('data', Buffer.from([0x01]))
    await reply
    expect(handler).toHaveBeenCalledOnce()
  })
})
