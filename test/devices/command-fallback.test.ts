/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * command-fallback.test.ts: sendCommand falls back between BLE and OpenAPI
 */

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoPlugMiniUS } from '../../src/devices/wo-plug-mini-us.js'

function plug(options: { mac?: string, bleId?: string, bleFails?: boolean, intelligence?: boolean } = {}) {
  const bleConnection: any = {
    sendCommand: vi.fn(async () => {
      if (options.bleFails) {
        throw new Error('BLE out of range')
      }
      return Buffer.from([0x01, 0x80])
    }),
    read: vi.fn(async () => Buffer.from([0x01])),
    write: vi.fn(async () => {}),
  }
  const apiClient: any = {
    sendCommand: vi.fn(async () => ({ statusCode: 100, message: 'success', body: {} })),
    getStatus: vi.fn(async () => ({ power: 'on' })),
  }
  const device = new WoPlugMiniUS(
    { id: 'D83BDA1173CA', name: 'Plug', deviceType: 'Plug Mini (US)', mac: options.mac, bleId: options.bleId, connectionTypes: ['ble', 'api'] },
    { bleConnection, apiClient, enableRetry: false, enableConnectionIntelligence: options.intelligence ?? true },
  )
  return { device, bleConnection, apiClient }
}

describe('sendCommand fallback', () => {
  // Connection intelligence is on by default. It used to set a fallback only when it picked a
  // transport other than the preferred one, so a failed BLE command never reached the API.
  it.each([true, false])('falls back to the API when BLE fails (connection intelligence %s)', async (intelligence) => {
    const { device, bleConnection, apiClient } = plug({ mac: 'd8:3b:da:11:73:ca', bleFails: true, intelligence })
    await expect(device.turnOn()).resolves.toBe(true)
    expect(bleConnection.sendCommand).toHaveBeenCalledOnce()
    expect(apiClient.sendCommand).toHaveBeenCalledExactlyOnceWith('D83BDA1173CA', 'turnOn', undefined)
  })

  it('does not fall back when fallback is disabled', async () => {
    const { device, apiClient } = plug({ mac: 'd8:3b:da:11:73:ca', bleFails: true })
    device.setFallbackEnabled(false)
    await expect(device.turnOn()).resolves.toBe(false)
    expect(apiClient.sendCommand).not.toHaveBeenCalled()
  })

  it('uses BLE only once when it succeeds', async () => {
    const { device, bleConnection, apiClient } = plug({ mac: 'd8:3b:da:11:73:ca' })
    await expect(device.turnOn()).resolves.toBe(true)
    expect(bleConnection.sendCommand).toHaveBeenCalledOnce()
    expect(apiClient.sendCommand).not.toHaveBeenCalled()
  })
})

describe('bLE status reads without a MAC address', () => {
  // On macOS a device has a peripheral id but an empty MAC. Commands already used `id:<bleId>`;
  // status reads passed the empty string to the connection instead.
  it('reads by advertisement id when the MAC is empty', async () => {
    const { device, bleConnection } = plug({ mac: '', bleId: 'peripheral-uuid' })
    await (device as any).getBLEStatus()
    expect(bleConnection.read).toHaveBeenCalledWith('id:peripheral-uuid')
  })
})

describe('circuit breaker', () => {
  // HALF_OPEN allows one trial request. Commands only checked for OPEN, so while the trial was
  // in use every other command still went to the failing transport.
  it('rejects commands while HALF_OPEN and its trial request is in use', async () => {
    const { device, apiClient } = plug({ intelligence: false })
    const breaker = device.getCircuitBreakerAPI() as any
    breaker.state = 'HALF_OPEN'
    breaker.halfOpenAttempts = 1
    const result = await (device as any).sendAPICommand('turnOn')
    expect(result).toMatchObject({ success: false, error: 'API circuit breaker is HALF_OPEN (too many failures)' })
    expect(apiClient.sendCommand).not.toHaveBeenCalled()
  })
})
