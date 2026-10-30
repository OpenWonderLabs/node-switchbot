import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

// Meters and other sensors were read by connecting over GATT, which many of them refuse
// ("Unknown Connection Identifier (0x2)"), so their values stayed at 0.
// https://github.com/OpenWonderLabs/homebridge-switchbot/issues/1437

class MockNoble extends EventEmitter {
  state = 'poweredOn'
  peripherals: any[] = []
  startScanning = vi.fn((): void => {
    this.emit('scanStart')
  })

  stopScanning = vi.fn((): void => {
    this.emit('scanStop')
  })
}

const MAC = 'aa:bb:cc:dd:ee:ff'

// pySwitchbot fixture: 24.6 °C, 53 %, battery 100
function meterPeripheral(tempByte = 0x98) {
  return {
    id: 'meter-1',
    address: MAC,
    rssi: -60,
    connectable: false,
    connect: vi.fn((cb: (error?: Error) => void) => cb(new Error('Unknown Connection Identifier (0x2)'))),
    advertisement: {
      serviceData: [{ uuid: 'fd3d', data: Buffer.from('5400e4069835', 'hex') }],
      manufacturerData: Buffer.from(`6909d7c17d5deb43de0306${tempByte.toString(16)}35`, 'hex'),
    },
  }
}

async function discoverMeter() {
  const noble = new MockNoble()
  const peripheral = meterPeripheral()
  noble.peripherals = [peripheral]
  const switchbot = new SwitchBot({ enableBLE: true, noble, scanTimeout: 20 } as any)
  noble.startScanning.mockImplementation(() => {
    noble.emit('scanStart')
    setImmediate(() => noble.emit('discover', peripheral))
  })
  const devices = await switchbot.discover({ timeout: 20 } as any)
  return { noble, peripheral, switchbot, device: devices[0] as any }
}

describe('passive sensor status', () => {
  it('discovers a non-connectable meter and reads it from the advertisement', async () => {
    const { device, peripheral, switchbot } = await discoverMeter()
    expect(device).toBeDefined()
    const status = await device.getStatus()
    expect(status).toMatchObject({ connectionType: 'ble', temperature: 24.6, humidity: 53, battery: 100, temperatureScale: 'c' })
    expect(peripheral.connect).not.toHaveBeenCalled()
    await switchbot.cleanup()
  })

  it('listens for a fresh advertisement when the last one is stale', async () => {
    const { device, noble, peripheral, switchbot } = await discoverMeter()
    device.updateInfo({ bleUpdatedAt: Date.now() - 10 * 60 * 1000 })
    const warmer = meterPeripheral(0x99) // 25.6 °C
    noble.startScanning.mockImplementation(() => {
      noble.emit('scanStart')
      setImmediate(() => noble.emit('discover', warmer))
    })
    const status = await device.getStatus()
    expect(status.temperature).toBe(25.6)
    expect(peripheral.connect).not.toHaveBeenCalled()
    await switchbot.cleanup()
  })

  it('keeps readings current from any running scan', async () => {
    const { device, noble, switchbot } = await discoverMeter()
    noble.emit('discover', meterPeripheral(0x99))
    expect((await device.getStatus()).temperature).toBe(25.6)
    await switchbot.cleanup()
  })

  it('fails without connecting when no advertisement arrives and there is no API', async () => {
    const { device, noble, peripheral, switchbot } = await discoverMeter()
    device.updateInfo({ bleUpdatedAt: Date.now() - 10 * 60 * 1000 })
    noble.startScanning.mockImplementation(() => {
      noble.emit('scanStart')
    })
    await expect(device.getStatus()).rejects.toThrow()
    expect(peripheral.connect).not.toHaveBeenCalled()
    await switchbot.cleanup()
  }, 15_000)
})
