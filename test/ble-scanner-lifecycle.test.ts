import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { BLEScanner } from '../src/ble.js'

class MockNoble extends EventEmitter {
  state = 'poweredOn'

  startScanning(): void {
    this.emit('scanStart')
  }

  stopScanning(): void {
    this.emit('scanStop')
  }
}

function createPeripheral(overrides: Record<string, any> = {}): any {
  return {
    id: 'mock-device-id',
    address: 'AA:BB:CC:DD:EE:FF',
    rssi: -45,
    connectable: true,
    advertisement: {
      serviceData: [
        {
          uuid: 'fd3d',
          data: Buffer.from([0x48, 0x00, 0x50]),
        },
      ],
    },
    ...overrides,
  }
}

describe('bLEScanner lifecycle', () => {
  it('deduplicates noble listeners and removes them on destroy', () => {
    const noble = new MockNoble()
    const scanner = new BLEScanner({ noble })

    expect(noble.listenerCount('stateChange')).toBe(1)
    expect(noble.listenerCount('discover')).toBe(1)
    expect(noble.listenerCount('scanStart')).toBe(1)
    expect(noble.listenerCount('scanStop')).toBe(1)

    ;(scanner as any).setupNobleHandlers()

    expect(noble.listenerCount('stateChange')).toBe(1)
    expect(noble.listenerCount('discover')).toBe(1)
    expect(noble.listenerCount('scanStart')).toBe(1)
    expect(noble.listenerCount('scanStop')).toBe(1)

    scanner.destroy()

    expect(noble.listenerCount('stateChange')).toBe(0)
    expect(noble.listenerCount('discover')).toBe(0)
    expect(noble.listenerCount('scanStart')).toBe(0)
    expect(noble.listenerCount('scanStop')).toBe(0)
  })

  it('keeps discovered devices after stopScan', () => {
    const noble = new MockNoble()
    const scanner = new BLEScanner({ noble })

    noble.emit('discover', createPeripheral())
    expect(scanner.getDiscoveredDevices()).toHaveLength(1)

    scanner.stopScan()
    expect(scanner.getDiscoveredDevices()).toHaveLength(1)

    scanner.destroy()
  })
})
