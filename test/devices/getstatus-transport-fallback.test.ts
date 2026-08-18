/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * getstatus-transport-fallback.test.ts: getStatus() uses whichever transport exists
 */

import { describe, expect, it, vi } from 'vitest'

import { SwitchBotDevice } from '../../src/devices/base.js'

/**
 * Exercise getStatusWithFallback directly, standing in for the transport
 * getters so no connection is needed.
 */
function device(opts: {
  preferred: 'ble' | 'api'
  hasBLE: boolean
  hasAPI: boolean
  bleThrows?: boolean
  apiThrows?: boolean
}) {
  const d = Object.create(SwitchBotDevice.prototype) as any
  d.preferredConnection = opts.preferred
  d.enableFallback = true
  d.logger = { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() }
  d.hasBLE = () => opts.hasBLE
  d.hasAPI = () => opts.hasAPI
  d.getBLEStatus = async () => {
    if (opts.bleThrows) {
      throw new Error('ble unavailable')
    }
    return { via: 'ble' }
  }
  d.getAPIStatus = async () => {
    if (opts.apiThrows) {
      throw new Error('api unavailable')
    }
    return { via: 'api' }
  }
  d.callStatus = () => (SwitchBotDevice.prototype as any).getStatusWithFallback.call(d)
  return d
}

describe('getStatusWithFallback transport selection', () => {
  it('uses the preferred transport when it is available', async () => {
    await expect(device({ preferred: 'ble', hasBLE: true, hasAPI: true }).callStatus()).resolves.toEqual({ via: 'ble' })
    await expect(device({ preferred: 'api', hasBLE: true, hasAPI: true }).callStatus()).resolves.toEqual({ via: 'api' })
  })

  it('falls back to the other transport when the preferred one fails', async () => {
    await expect(device({ preferred: 'ble', hasBLE: true, hasAPI: true, bleThrows: true }).callStatus()).resolves.toEqual({ via: 'api' })
    await expect(device({ preferred: 'api', hasBLE: true, hasAPI: true, apiThrows: true }).callStatus()).resolves.toEqual({ via: 'ble' })
  })

  // An API-only device that prefers BLE previously matched neither branch and
  // threw, even though the API was usable. This is the common case for a device
  // discovered over the cloud with no BLE in range.
  it('uses the API for an API-only device that prefers BLE', async () => {
    await expect(device({ preferred: 'ble', hasBLE: false, hasAPI: true }).callStatus()).resolves.toEqual({ via: 'api' })
  })

  it('uses BLE for a BLE-only device that prefers the API', async () => {
    await expect(device({ preferred: 'api', hasBLE: true, hasAPI: false }).callStatus()).resolves.toEqual({ via: 'ble' })
  })

  it('still throws when the device has no transport at all', async () => {
    await expect(device({ preferred: 'ble', hasBLE: false, hasAPI: false }).callStatus())
      .rejects
      .toThrow('No connection method available for getStatus')
  })
})
