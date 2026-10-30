/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * ble-encryption.test.ts: encrypted devices use pySwitchbot's SwitchbotEncryptedDevice protocol
 */

import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv } from 'node:crypto'
import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { BLEConnection, decryptPayload, encryptPayload, parseEncryptionInit } from '../../src/ble.js'
import { WoAirPurifier } from '../../src/devices/wo-air-purifier.js'
import { WoRelaySwitch1 } from '../../src/devices/wo-relay-switch-1.js'
import { DEVICE_COMMANDS } from '../../src/settings.js'

const MAC = 'aa:bb:cc:dd:ee:ff'
const KEY_HEX = '000102030405060708090a0b0c0d0e0f'
const KEY = Buffer.from(KEY_HEX, 'hex')
const KEY_ID = 'a1'

/**
 * A device that speaks pySwitchbot's encrypted protocol: answers the init command with its mode and
 * IV, decrypts each command, and replies with an encrypted payload.
 */
function encryptedDevice(mode: 'ctr' | 'gcm', reply: (plain: Buffer) => Buffer = () => Buffer.from([0x80])) {
  let iv = mode === 'gcm' ? Buffer.alloc(12, 0x10) : Buffer.alloc(16, 0x20)
  const received: Buffer[] = []
  const notifyChar: any = new EventEmitter()
  notifyChar.uuid = 'cba20003224d11e69fb80002a5d5c51b'
  notifyChar.subscribe = (cb: (e?: Error) => void) => cb()
  const crypt = (data: Buffer, decrypt: boolean) => {
    if (mode === 'gcm') {
      const c: any = decrypt ? createDecipheriv('aes-128-gcm', KEY, iv) : createCipheriv('aes-128-gcm', KEY, iv)
      if (decrypt) {
        c.setAuthTag(Buffer.alloc(16))
      }
      return c.update(data)
    }
    const c = decrypt ? createDecipheriv('aes-128-ctr', KEY, iv) : createCipheriv('aes-128-ctr', KEY, iv)
    return Buffer.concat([c.update(data), c.final()])
  }
  const writeChar = {
    uuid: 'cba20002224d11e69fb80002a5d5c51b',
    write: vi.fn((data: Buffer, _w: boolean, cb: (err?: Error) => void) => {
      cb()
      if (data.equals(Buffer.from([0x57, 0x00, 0x00, 0x00, 0x0F, 0x21, 0x03, 0xA1]))) {
        const tail = mode === 'gcm' ? Buffer.alloc(4) : Buffer.alloc(0)
        notifyChar.emit('data', Buffer.concat([Buffer.from([0x01, 0x00, mode === 'gcm' ? 1 : 0, 0x00]), iv, tail]))
        return
      }
      expect(data[1]).toBe(0xA1) // key id
      const plain = Buffer.concat([data.subarray(0, 1), crypt(data.subarray(4), true)])
      received.push(plain)
      notifyChar.emit('data', Buffer.concat([Buffer.from([0x01, 0x00, 0x00, 0x00]), crypt(reply(plain), false)]))
      if (mode === 'gcm') {
        iv = Buffer.from((BigInt(`0x${iv.toString('hex')}`) + 1n).toString(16).padStart(24, '0'), 'hex')
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
  return { noble: { peripherals: [peripheral] }, received, writeChar }
}

describe('encrypted BLE commands', () => {
  it.each(['ctr', 'gcm'] as const)('sends commands the device can decrypt and decrypts its reply (%s)', async (mode) => {
    const device = encryptedDevice(mode)
    const connection = new BLEConnection({ noble: device.noble })
    const options = { keyId: KEY_ID, encryptionKey: KEY_HEX }

    await expect(connection.sendEncryptedCommand(MAC, Buffer.from([0x57, 0x0F, 0x4C, 0x09]), options)).resolves.toEqual(Buffer.from([0x01, 0x80]))
    // A second command reuses the session (and in GCM mode the incremented IV)
    await expect(connection.sendEncryptedCommand(MAC, Buffer.from([0x57, 0x01, 0x01]), options)).resolves.toEqual(Buffer.from([0x01, 0x80]))
    expect(device.received).toEqual([Buffer.from([0x57, 0x0F, 0x4C, 0x09]), Buffer.from([0x57, 0x01, 0x01])])
    expect(device.writeChar.write).toHaveBeenCalledTimes(3) // init + 2 commands
  })

  it('starts a new session after a disconnect', async () => {
    const device = encryptedDevice('ctr')
    const connection = new BLEConnection({ noble: device.noble })
    const options = { keyId: KEY_ID, encryptionKey: KEY_HEX }
    await connection.sendEncryptedCommand(MAC, Buffer.from([0x57, 0x01]), options)
    await connection.disconnect(MAC)
    await connection.sendEncryptedCommand(MAC, Buffer.from([0x57, 0x01]), options)
    expect(device.writeChar.write).toHaveBeenCalledTimes(4) // init + command, twice
  })

  it('rejects invalid keys', async () => {
    const connection = new BLEConnection({ noble: encryptedDevice('ctr').noble })
    await expect(connection.sendEncryptedCommand(MAC, Buffer.from([0x57]), { keyId: 'a', encryptionKey: KEY_HEX })).rejects.toThrow('key id')
    await expect(connection.sendEncryptedCommand(MAC, Buffer.from([0x57]), { keyId: KEY_ID, encryptionKey: 'abcd' })).rejects.toThrow('encryption key')
  })
})

// The same cases as pySwitchbot's test_ensure_encryption_initialized_* and test_resolve_encryption_mode_*
describe('parseEncryptionInit', () => {
  it('reads CTR and GCM sessions', () => {
    expect(parseEncryptionInit(Buffer.concat([Buffer.from([1, 0, 0, 0]), Buffer.alloc(16, 2)]), MAC)).toEqual({ mode: 'ctr', iv: Buffer.alloc(16, 2) })
    expect(parseEncryptionInit(Buffer.concat([Buffer.from([1, 0, 1, 0]), Buffer.alloc(12, 1), Buffer.alloc(4)]), MAC)).toEqual({ mode: 'gcm', iv: Buffer.alloc(12, 1) })
  })

  it('rejects bad replies', () => {
    expect(() => parseEncryptionInit(Buffer.from([0x02]), MAC)).toThrow('rejected')
    expect(() => parseEncryptionInit(undefined, MAC)).toThrow('rejected')
    expect(() => parseEncryptionInit(Buffer.from([1, 0, 2, 0]), MAC)).toThrow('Unsupported encryption mode 2')
    expect(() => parseEncryptionInit(Buffer.from([1, 0]), MAC)).toThrow('Unsupported encryption mode')
    expect(() => parseEncryptionInit(Buffer.concat([Buffer.from([1, 0, 0, 0]), Buffer.alloc(12)]), MAC)).toThrow('Invalid IV length 12 for CTR')
    expect(() => parseEncryptionInit(Buffer.concat([Buffer.from([1, 0, 1, 0]), Buffer.alloc(16), Buffer.alloc(4)]), MAC)).toThrow('Invalid IV length 16 for GCM')
  })

  it('round-trips a payload in both modes, as pySwitchbot test_gcm_encrypt_decrypt_without_finalize', () => {
    for (const session of [{ mode: 'ctr' as const, iv: Buffer.alloc(16, 7) }, { mode: 'gcm' as const, iv: Buffer.alloc(12, 0x10) }]) {
      const { ciphertext, header } = encryptPayload(KEY, session, Buffer.from('0f4c09', 'hex'))
      expect(header).toHaveLength(2)
      expect(decryptPayload(KEY, session, ciphertext)).toEqual(Buffer.from('0f4c09', 'hex'))
    }
  })
})

describe('devices with a key id', () => {
  // homebridge-switchbot passes its encryptionKey/keyId config through setKey(), which node-switchbot
  // devices did not have, so encrypted devices never got their key.
  it('setKey validates and stores the key', () => {
    const relay = new WoRelaySwitch1({ id: 'R', name: 'Relay', deviceType: 'Relay Switch 1', mac: MAC, connectionTypes: ['ble'] })
    expect(() => relay.setKey({ encryptionKey: 'nothex', keyId: KEY_ID })).toThrow('32 hex')
    expect(() => relay.setKey({ encryptionKey: KEY_HEX, keyId: 'zz' })).toThrow('2 hex')
    relay.setKey({ encryptionKey: KEY_HEX, keyId: KEY_ID })
    expect(relay.getInfo()).toMatchObject({ encryptionKey: KEY_HEX, keyId: KEY_ID })
  })

  it('a relay switch sends its plain command through the encrypted transport', async () => {
    const device = encryptedDevice('ctr')
    const relay = new WoRelaySwitch1(
      { id: 'R', name: 'Relay', deviceType: 'Relay Switch 1', mac: MAC, connectionTypes: ['ble'] },
      { bleConnection: new BLEConnection({ noble: device.noble }), enableRetry: false },
    )
    relay.setKey({ encryptionKey: KEY_HEX, keyId: KEY_ID })
    await expect(relay.turnOn()).resolves.toBe(true)
    expect(device.received).toEqual([Buffer.from(DEVICE_COMMANDS.COMMON.POWER_ON)])
  })

  it('an encrypted air purifier verifies a filter reset from the decrypted reply', async () => {
    const device = encryptedDevice('gcm', plain => plain[2] === 0x4D ? Buffer.from([0x00, 0x00]) : Buffer.alloc(0))
    const purifier = new WoAirPurifier(
      { id: 'AP', name: 'Purifier', deviceType: 'Air Purifier', mac: MAC, connectionTypes: ['ble'] },
      { bleConnection: new BLEConnection({ noble: device.noble }), enableRetry: false },
    )
    purifier.setKey({ encryptionKey: KEY_HEX, keyId: KEY_ID })
    await expect(purifier.resetFilterUsage()).resolves.toBe(true)
    expect(device.received).toEqual([Buffer.from(DEVICE_COMMANDS.AIR_PURIFIER.RESET_FILTER_USAGE), Buffer.from(DEVICE_COMMANDS.AIR_PURIFIER.READ_FILTER_USAGE)])
  })
})
