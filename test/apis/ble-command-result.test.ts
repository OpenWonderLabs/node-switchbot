/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * ble-command-result.test.ts: BLE command replies are judged by their status byte
 */

import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { BLEConnection } from '../../src/ble.js'

const MAC = 'aa:bb:cc:dd:ee:ff'

function check(bytes: number[]) {
  const connection = new BLEConnection({ noble: { peripherals: [] } })
  return () => (connection as any).validateCommandResult(Buffer.from(bytes), MAC)
}

// The first byte of a reply is its status (SwitchBotAPI-BLE, and pySwitchbot's
// _check_command_result). The rest is payload, so its bytes must not be read as a status.
describe('validateCommandResult', () => {
  it.each([
    [[0x01], 'OK'],
    [[0x01, 0x07, 0x09], 'OK with payload bytes that look like error codes'],
    [[0x05, 0x48, 0xC0], 'Bot in add-on mode'],
    [[0x06], 'low battery'],
  ])('accepts %j (%s)', (bytes) => {
    expect(check(bytes)).not.toThrow()
  })

  it.each([
    [[0x02, 0x01], 'error'],
    [[0x03, 0x01], 'busy'],
    [[0x0B, 0x05], 'mesh device not found'],
  ])('rejects %j (%s) even when the payload contains a success byte', (bytes) => {
    expect(check(bytes)).toThrow('Unexpected BLE response')
  })

  it('reports password problems from the status byte', () => {
    expect(check([0x07])).toThrow('password required')
    expect(check([0x09])).toThrow('password incorrect')
  })

  it('rejects an empty reply', () => {
    expect(check([])).toThrow('Empty BLE response')
  })
})
