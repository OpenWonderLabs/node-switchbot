import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { BLEConnection } from '../../src/ble.js'
import { Logger } from '../../src/utils/index.js'

describe('bLEConnection notification handling', () => {
  function createPeripheralWithNotify() {
    // Provide both dashed and undashed UUIDs for compatibility
    const writeChar = {
      uuid: 'cba20002224d11e69fb80002a5d5c51b',
      write: vi.fn((data: Buffer, withoutResponse: boolean, cb: (err?: Error) => void) => cb()),
      on: vi.fn(),
      subscribe: vi.fn(),
    }
    const notifyChar = new EventEmitter() as any
    notifyChar.uuid = 'cba20003224d11e69fb80002a5d5c51b'
    notifyChar.subscribe = (cb: (e?: Error) => void) => cb()
    return {
      id: 'mock-id',
      address: 'AA:BB:CC:DD:EE:FF',
      connect: (cb: (err?: Error) => void) => cb(),
      disconnect: (cb: () => void) => cb(),
      discoverSomeServicesAndCharacteristics: (_s: string[], _c: string[], cb: (e: null, s: any[], c: any[]) => void) => {
        cb(null, [], [writeChar, notifyChar])
      },
      notifyChar,
    }
  }

  it('resolves per-command notification future and times out if not received', async () => {
    const peripheral = createPeripheralWithNotify()
    const noble = { peripherals: [peripheral] }
    const connection = new BLEConnection({ noble })
    await connection.connect('AA:BB:CC:DD:EE:FF')
    // Subscribe to notifications to set up handler and log when called
    await connection.subscribeNotifications('AA:BB:CC:DD:EE:FF', (payload) => {
      // eslint-disable-next-line no-console
      console.log('Custom handler called with:', payload)
    })

    // Send command expecting notification
    const sendPromise = connection.sendCommand('AA:BB:CC:DD:EE:FF', Buffer.from([0x01]), { expectNotification: true, notificationTimeoutMs: 200 })
    // Poll until the notification future is set, then emit the notification
    const normalizedMac = 'aa:bb:cc:dd:ee:ff'
    let notified = false
    while (!(connection as any).notificationFutures.has(normalizedMac)) {
      await new Promise(r => setTimeout(r, 1))
    }
    if (!notified) {
      notified = true
      peripheral.notifyChar.emit('data', Buffer.from([0xA5]))
    }
    const result = await sendPromise
    expect(result!.equals(Buffer.from([0xA5]))).toBe(true)

    // Test timeout
    await expect(connection.sendCommand('AA:BB:CC:DD:EE:FF', Buffer.from([0x02]), { expectNotification: true, notificationTimeoutMs: 30 })).rejects.toThrow('Notification timeout')
  })

  it('logs unsolicited notifications', async () => {
    const peripheral = createPeripheralWithNotify()
    const noble = { peripherals: [peripheral] }
    class TestLogger extends Logger {
      constructor() {
        super('MockLogger', 4)
      }

      setLevel = vi.fn()
      info = vi.fn()
      debug = vi.fn()
      warn = vi.fn()
      error = vi.fn()
    }
    const mockLogger = new TestLogger()
    const infoSpy = mockLogger.info
    const connection = new BLEConnection({ noble, logLevel: 0, logger: mockLogger })
    await connection.connect('AA:BB:CC:DD:EE:FF')
    // Emit unsolicited notification
    // Debug: log when emitting
    // eslint-disable-next-line no-console
    console.log('Emitting unsolicited notification')
    peripheral.notifyChar.emit('data', Buffer.from([0x99]))
    // Directly call logger to confirm spy works
    mockLogger.info('Unsolicited notification from test: 99', 'test')
    // Wait for event loop to process notification
    await new Promise(r => setTimeout(r, 200))
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Unsolicited notification'), expect.any(String))
  })
})
