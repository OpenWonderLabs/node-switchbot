import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { BLEConnection, BLEScanner } from '../../src/ble.js'
import { BLE_NOTIFY_CHARACTERISTIC_UUID, BLE_WRITE_CHARACTERISTIC_UUID } from '../../src/settings.js'

const MAC = 'F6:3C:16:B9:E7:24'
const MANUFACTURER_DATA = Buffer.from('6909f63c16b9e724aa', 'hex')

/**
 * On macOS (CoreBluetooth) noble never exposes peripheral.address; the only way to
 * learn a SwitchBot device's MAC is the manufacturer data in its advertisement.
 */
function createPeripheral(events: string[], options: { address?: string, subscribeError?: Error } = {}) {
  const notifyChar = {
    uuid: BLE_NOTIFY_CHARACTERISTIC_UUID,
    on: () => {},
    subscribe: (callback: (error: Error | null) => void) => {
      events.push('subscribe')
      callback(options.subscribeError ?? null)
    },
  }
  const writeChar = {
    uuid: BLE_WRITE_CHARACTERISTIC_UUID,
    write: (data: Buffer, _withoutResponse: boolean, callback: (error: Error | null) => void) => {
      events.push(`write:${data.toString('hex')}`)
      callback(null)
    },
  }

  return {
    id: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    address: options.address ?? '',
    rssi: -60,
    connectable: true,
    advertisement: {
      manufacturerData: MANUFACTURER_DATA,
      serviceData: [{ uuid: 'fd3d', data: Buffer.from([0x48, 0x00, 0x50]) }],
    },
    connect: (callback: (error?: Error) => void) => callback(),
    disconnect: (callback: () => void) => callback(),
    discoverSomeServicesAndCharacteristics: (
      _services: string[],
      _characteristics: string[],
      callback: (error: Error | null, services: any[], chars: any[]) => void,
    ) => {
      callback(null, [], [writeChar, notifyChar])
    },
  }
}

class MockNoble extends EventEmitter {
  state = 'poweredOn'
  startScanning(): void {}
  stopScanning(): void {}
}

describe('bLEScanner on macOS-style peripherals', () => {
  it('records the manufacturer-data MAC in normalized form so MAC lookups find the device', () => {
    const noble = new MockNoble()
    const scanner = new BLEScanner({ noble })

    noble.emit('discover', createPeripheral([]))

    const advertisement = scanner.getDevice(MAC)
    expect(advertisement?.address).toBe('f6:3c:16:b9:e7:24')
    expect(scanner.getDevice('f6:3c:16:b9:e7:24')).toBe(advertisement)

    scanner.destroy()
  })
})

describe('bLEConnection on macOS-style peripherals', () => {
  it('connects by MAC using manufacturer data when peripheral.address is empty', async () => {
    const connection = new BLEConnection({ noble: { peripherals: [createPeripheral([])] } })

    await expect(connection.connect(MAC)).resolves.toBeUndefined()

    expect((connection as any).connections.has('f6:3c:16:b9:e7:24')).toBe(true)
  })

  it('falls back to manufacturer data when peripheral.address is not a valid MAC', async () => {
    const connection = new BLEConnection({ noble: { peripherals: [createPeripheral([], { address: 'unknown' })] } })

    await expect(connection.connect(MAC)).resolves.toBeUndefined()
  })
})

describe('bLEConnection command writes', () => {
  it('enables notifications before writing a command', async () => {
    const events: string[] = []
    const connection = new BLEConnection({ noble: { peripherals: [createPeripheral(events, { address: MAC })] } })

    await connection.write(MAC, Buffer.from([0x57, 0x01, 0x00]))

    expect(events).toEqual(['subscribe', 'write:570100'])
    await connection.disconnect(MAC)
  })

  it('still writes when enabling notifications fails', async () => {
    const events: string[] = []
    const peripheral = createPeripheral(events, { address: MAC, subscribeError: new Error('CCCD write rejected') })
    const connection = new BLEConnection({ noble: { peripherals: [peripheral] } })

    await connection.write(MAC, Buffer.from([0x57, 0x01, 0x00]))

    expect(events).toEqual(['subscribe', 'write:570100'])
    await connection.disconnect(MAC)
  })

  it('delivers notifications that arrive while subscribing', async () => {
    const peripheral = createPeripheral([], { address: MAC })
    const connection = new BLEConnection({ noble: { peripherals: [peripheral] } })
    await connection.connect(MAC)

    const notifyChar = new EventEmitter() as any
    notifyChar.uuid = BLE_NOTIFY_CHARACTERISTIC_UUID
    notifyChar.subscribe = (callback: (error: Error | null) => void) => {
      notifyChar.emit('data', Buffer.from([0x01]))
      callback(null)
    }
    const chars = (connection as any).characteristics.get('f6:3c:16:b9:e7:24')
    ;(connection as any).characteristics.set('f6:3c:16:b9:e7:24', { ...chars, notify: notifyChar })

    const received: string[] = []
    await connection.subscribeNotifications(MAC, payload => received.push(payload.toString('hex')))

    expect(received).toEqual(['01'])
    await connection.disconnect(MAC)
  })

  it('keeps a handler registered by an earlier call when a later subscribe fails', async () => {
    const connection = new BLEConnection({ noble: { peripherals: [createPeripheral([], { address: MAC })] } })
    const handler = () => {}
    await connection.connect(MAC)
    await connection.subscribeNotifications(MAC, handler)

    const chars = (connection as any).characteristics.get('f6:3c:16:b9:e7:24')
    const failingNotify = { ...chars.notify, subscribe: (callback: (error: Error | null) => void) => callback(new Error('CCCD write rejected')) }
    ;(connection as any).characteristics.set('f6:3c:16:b9:e7:24', { ...chars, notify: failingNotify })
    await expect(connection.subscribeNotifications(MAC, handler)).rejects.toThrow('CCCD write rejected')

    expect((connection as any).notificationHandlers.get('f6:3c:16:b9:e7:24')?.has(handler)).toBe(true)
    await connection.disconnect(MAC)
  })

  it('shares one subscription between concurrent callers (noble keeps only the latest pending callback)', async () => {
    const peripheral = createPeripheral([], { address: MAC, subscribeError: new Error('connect-time subscribe failed') })
    const connection = new BLEConnection({ noble: { peripherals: [peripheral] } })
    await connection.connect(MAC)

    let pendingCallback: ((error: Error | null) => void) | undefined
    let subscribeCalls = 0
    const chars = (connection as any).characteristics.get('f6:3c:16:b9:e7:24')
    const nobleLikeNotify = {
      ...chars.notify,
      subscribe: (callback: (error: Error | null) => void) => {
        subscribeCalls += 1
        pendingCallback = callback
      },
    }
    ;(connection as any).characteristics.set('f6:3c:16:b9:e7:24', { ...chars, notify: nobleLikeNotify })

    const first = connection.subscribeNotifications(MAC, () => {})
    const second = connection.subscribeNotifications(MAC, () => {})
    await Promise.resolve()
    pendingCallback?.(null)

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined])
    expect(subscribeCalls).toBe(1)
    await connection.disconnect(MAC)
  })

  it('does not register a notification handler when subscribing fails', async () => {
    const peripheral = createPeripheral([], { address: MAC, subscribeError: new Error('CCCD write rejected') })
    const connection = new BLEConnection({ noble: { peripherals: [peripheral] } })
    const handler = () => {}

    await connection.connect(MAC)
    await expect(connection.subscribeNotifications(MAC, handler)).rejects.toThrow('CCCD write rejected')

    expect((connection as any).notificationHandlers.get('f6:3c:16:b9:e7:24')?.has(handler) ?? false).toBe(false)
    await connection.disconnect(MAC)
  })
})
