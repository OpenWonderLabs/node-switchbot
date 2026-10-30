/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * sensor-advertisement-status.test.ts: sensors are read from BLE advertisements, never connected to
 */

import type { DeviceInfo } from '../../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { WoContact } from '../../src/devices/wo-contact.js'
import { WoHand } from '../../src/devices/wo-hand.js'
import { WoLeak } from '../../src/devices/wo-leak.js'
import { WoPresence } from '../../src/devices/wo-presence.js'
import { WoSensorTHPro } from '../../src/devices/wo-sensor-th-pro.js'
import { WoSensorTH } from '../../src/devices/wo-sensor-th.js'
import { WoWaterDetector } from '../../src/devices/wo-water-detector.js'

// homebridge-switchbot#1437: a Meter's temperature and humidity stayed at 0. Status was read by
// connecting to the meter, which it refused ("Unknown Connection Identifier (0x2)"), so the circuit
// breaker opened. pySwitchbot reads meters and other sensors from their advertisements only.

const METER_DATA = { model: 'T', modelName: 'Meter', temperature: 21.5, fahrenheit: false, humidity: 48, battery: 90 }

function meterInfo(extra: Partial<DeviceInfo> = {}): DeviceInfo {
  return { id: 'AABBCCDDEEFF', name: 'Meter', deviceType: 'Meter', mac: 'AA:BB:CC:DD:EE:FF', connectionTypes: ['ble'], ...extra }
}

function refusingConnection() {
  return {
    read: vi.fn(async () => {
      throw new Error('Unknown Connection Identifier (0x2)')
    }),
    connect: vi.fn(async () => {
      throw new Error('Unknown Connection Identifier (0x2)')
    }),
  } as any
}

describe('sensor status from advertisements', () => {
  it('reads a meter from a recent advertisement without connecting', async () => {
    const bleConnection = refusingConnection()
    const meter = new WoSensorTH(meterInfo({ bleServiceData: METER_DATA, bleServiceDataAt: Date.now() }), { bleConnection, enableFallback: false })

    const status = await meter.getStatus()

    expect(status).toMatchObject({ connectionType: 'ble', temperature: 21.5, humidity: 48, battery: 90, temperatureScale: 'c' })
    expect(bleConnection.read).not.toHaveBeenCalled()
    expect(bleConnection.connect).not.toHaveBeenCalled()
  })

  it('listens for a new advertisement when the cached one is stale', async () => {
    const bleConnection = refusingConnection()
    const advertisementSource = vi.fn(async () => ({ ...METER_DATA, temperature: 23.1 }))
    const meter = new WoSensorTH(
      meterInfo({ bleServiceData: METER_DATA, bleServiceDataAt: Date.now() - 10 * 60_000 }),
      { bleConnection, advertisementSource, enableFallback: false },
    )

    const status = await meter.getStatus()

    expect(advertisementSource).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF', undefined, expect.any(Number))
    expect(status.temperature).toBe(23.1)
    expect(meter.getInfo().bleServiceData).toMatchObject({ temperature: 23.1 })
    expect(bleConnection.read).not.toHaveBeenCalled()
  })

  it('uses the last advertisement when no new one arrives', async () => {
    const advertisementSource = vi.fn(async () => undefined)
    const meter = new WoSensorTHPro(
      meterInfo({ bleServiceData: METER_DATA, bleServiceDataAt: Date.now() - 10 * 60_000 }),
      { bleConnection: refusingConnection(), advertisementSource, enableFallback: false },
    )

    await expect(meter.getStatus()).resolves.toMatchObject({ temperature: 21.5 })
  })

  it('falls back to the API when no advertisement has ever been received', async () => {
    const apiClient = { getStatus: vi.fn(async () => ({ temperature: 19, humidity: 40, battery: 80 })) } as any
    const meter = new WoSensorTH(
      meterInfo({ connectionTypes: ['ble', 'api'] }),
      { bleConnection: refusingConnection(), advertisementSource: async () => undefined, apiClient },
    )
    ;(meter as any).getAPIStatus = async () => ({ temperature: 19, humidity: 40, battery: 80 })

    await expect(meter.getStatus()).resolves.toMatchObject({ connectionType: 'api', temperature: 19 })
  })

  it.each([
    ['contact sensor', WoContact],
    ['motion sensor', WoPresence],
    ['leak detector', WoLeak],
    ['water detector', WoWaterDetector],
  ])('does not connect to a %s', async (_name, DeviceClass: any) => {
    const bleConnection = refusingConnection()
    const device = new DeviceClass(meterInfo({ bleServiceData: { battery: 70 }, bleServiceDataAt: Date.now() }), { bleConnection, enableFallback: false })

    await device.getStatus()

    expect(bleConnection.read).not.toHaveBeenCalled()
  })

  it('still connects to devices that are not sensors', async () => {
    const bleConnection = { read: vi.fn(async () => ({ battery: 50 })) } as any
    const bot = new WoHand(meterInfo({ deviceType: 'Bot', bleServiceData: { battery: 50 }, bleServiceDataAt: Date.now() }), { bleConnection, enableFallback: false })

    await (bot as any).getBLEStatus()

    expect(bleConnection.read).toHaveBeenCalled()
  })
})

describe('switchBot.listenForAdvertisement', () => {
  async function setup() {
    const { EventEmitter } = await import('node:events')
    const { SwitchBot } = await import('../../src/switchbot.js')
    const scanner: any = new EventEmitter()
    scanner.scanning = false
    scanner.isScanning = () => scanner.scanning
    scanner.startScan = vi.fn(async () => {
      scanner.scanning = true
    })
    const sb = Object.create(SwitchBot.prototype) as any
    sb.logger = { debug: vi.fn() }
    sb.bleScanner = scanner
    return { sb, scanner }
  }

  it('resolves with the matching device advertisement and starts one shared scan', async () => {
    const { sb, scanner } = await setup()
    const a = sb.listenForAdvertisement('AA:BB:CC:DD:EE:FF', undefined, 1000)
    const b = sb.listenForAdvertisement('11:22:33:44:55:66', undefined, 1000)
    scanner.emit('discover', { address: '11:22:33:44:55:66', serviceData: { temperature: 1 } })
    scanner.emit('discover', { address: 'aa:bb:cc:dd:ee:ff', serviceData: { temperature: 2 } })
    await expect(a).resolves.toEqual({ temperature: 2 })
    await expect(b).resolves.toEqual({ temperature: 1 })
    expect(scanner.startScan).toHaveBeenCalledOnce()
    expect(scanner.listenerCount('discover')).toBe(0)
  })

  it('resolves undefined when no advertisement arrives in time', async () => {
    const { sb, scanner } = await setup()
    await expect(sb.listenForAdvertisement('AA:BB:CC:DD:EE:FF', undefined, 20)).resolves.toBeUndefined()
    expect(scanner.listenerCount('discover')).toBe(0)
  })
})
