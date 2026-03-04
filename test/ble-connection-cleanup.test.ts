import { describe, expect, it } from 'vitest'

import { BLEConnection } from '../src/ble.js'

function createPeripheralMissingCharacteristics() {
  const peripheral = {
    id: 'mock-id-1',
    address: 'AA:BB:CC:DD:EE:FF',
    connect: (callback: (error?: Error) => void) => callback(),
    disconnectCalls: 0,
    disconnect: (callback: () => void) => {
      peripheral.disconnectCalls += 1
      callback()
    },
    discoverSomeServicesAndCharacteristics: (
      _services: string[],
      _characteristics: string[],
      callback: (error: Error | null, services: any[], chars: any[]) => void,
    ) => {
      callback(null, [], [])
    },
  }

  return peripheral
}

describe('bLEConnection cleanup on characteristic discovery failure', () => {
  it('cleans connection maps and disconnects peripheral when required chars are missing', async () => {
    const peripheral = createPeripheralMissingCharacteristics()
    const noble = {
      peripherals: [peripheral],
    }

    const connection = new BLEConnection({ noble })

    await expect(connection.connect('AA:BB:CC:DD:EE:FF')).rejects.toThrow('Required characteristics not found')

    const connectionInternal = connection as any
    expect(connectionInternal.connections.size).toBe(0)
    expect(connectionInternal.characteristics.size).toBe(0)
    expect(peripheral.disconnectCalls).toBe(1)
  })
})
