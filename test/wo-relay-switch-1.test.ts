import type { DeviceInfo } from '../src/types/index.js'
import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { WoRelaySwitch1 } from '../src/devices/wo-relay-switch-1.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'WoRelaySwitch1-1',
    name: 'WoRelaySwitch1',
    deviceType: 'WoRelaySwitch1',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('woRelaySwitch1', () => {
  it('parses relay power monitoring data from BLE response', async () => {
    const relay = new WoRelaySwitch1(baseInfo(), {
      bleConnection: {} as any,
    })

    ;(relay as any).getBLEStatus = vi.fn().mockResolvedValue({ state: true })
    ;(relay as any).sendBLECommand = vi.fn().mockResolvedValue({
      success: true,
      data: Buffer.from([0x57, 0x02, 0x01, 0x00, 0x00, 0x08, 0xFC, 0x00, 0xC8, 0x01, 0x2C]),
    })

    const status = await relay.getStatus()
    expect(status.power).toBe('on')
    expect(status.voltage).toBeGreaterThan(0)
    expect(status.electricCurrent).toBeGreaterThan(0)
    expect(status.electricityOfDay).toBeGreaterThan(0)
  })
})
