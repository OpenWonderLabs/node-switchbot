import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { BLEConnection } from '../../src/ble.js'
import { BLE_NOTIFY_CHARACTERISTIC_UUID, BLE_WRITE_CHARACTERISTIC_UUID } from '../../src/settings.js'

// Every disconnect BLEConnection started itself (the idle timer, disconnectAll) was logged as
// "Unexpected disconnect", while a disconnect started by the device left a stale connection behind.
// https://github.com/OpenWonderLabs/node-switchbot/pull/348

function createPeripheral() {
  const peripheral: any = new EventEmitter()
  Object.assign(peripheral, {
    id: 'mock-id',
    address: 'aa:bb:cc:dd:ee:ff',
    connect: (callback: (error?: Error) => void) => callback(),
    disconnect: vi.fn((callback: () => void) => {
      setImmediate(() => {
        peripheral.emit('disconnect')
        callback()
      })
    }),
    discoverSomeServicesAndCharacteristics: (_s: string[], _c: string[], callback: (error: Error | null, services: any[], chars: any[]) => void) => {
      callback(null, [], [
        { uuid: BLE_WRITE_CHARACTERISTIC_UUID, write: vi.fn() },
        { uuid: BLE_NOTIFY_CHARACTERISTIC_UUID, subscribe: (cb: any) => cb(), on: vi.fn() },
      ])
    },
  })
  return peripheral
}

function setup() {
  const peripheral = createPeripheral()
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const connection = new BLEConnection({ noble: { peripherals: [peripheral] }, logger: logger as any })
  return { peripheral, logger, connection, internal: connection as any }
}

describe('bLEConnection disconnects', () => {
  it('does not warn for a disconnect it starts', async () => {
    const { connection, logger, internal } = setup()
    await connection.connect('AA:BB:CC:DD:EE:FF')
    await connection.disconnect('AA:BB:CC:DD:EE:FF')
    await new Promise(resolve => setImmediate(resolve))
    expect(logger.warn).not.toHaveBeenCalled()
    expect(internal.connections.size).toBe(0)
    expect(internal.expectedDisconnects.size).toBe(0)
  })

  it('does not warn for disconnectAll', async () => {
    const { connection, logger } = setup()
    await connection.connect('AA:BB:CC:DD:EE:FF')
    await connection.disconnectAll()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('does not warn when asked to disconnect a device that is not connected', async () => {
    const { connection, logger } = setup()
    await connection.disconnect('AA:BB:CC:DD:EE:FF')
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('warns and drops the connection when the device disconnects', async () => {
    const { connection, logger, peripheral, internal } = setup()
    await connection.connect('AA:BB:CC:DD:EE:FF')
    peripheral.emit('disconnect')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unexpected disconnect'))
    expect(internal.connections.size).toBe(0)
    expect(internal.characteristics.size).toBe(0)
  })

  it('reconnects after the device disconnects instead of reusing the dead link', async () => {
    const { connection, peripheral } = setup()
    const connect = vi.spyOn(peripheral, 'connect')
    await connection.connect('AA:BB:CC:DD:EE:FF')
    peripheral.emit('disconnect')
    await connection.connect('AA:BB:CC:DD:EE:FF')
    expect(connect).toHaveBeenCalledTimes(2)
  })

  it('does not warn for a device disconnect marked as expected', async () => {
    const { connection, logger, peripheral, internal } = setup()
    await connection.connect('AA:BB:CC:DD:EE:FF')
    connection.markExpectedDisconnect('AA:BB:CC:DD:EE:FF')
    peripheral.emit('disconnect')
    expect(logger.warn).not.toHaveBeenCalled()
    expect(internal.expectedDisconnects.size).toBe(0)
    expect(internal.connections.size).toBe(0)
  })
})
