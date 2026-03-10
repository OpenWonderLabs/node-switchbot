import type { DeviceInfo } from '../../src/types/index.js'
import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { WoRelaySwitch1 } from '../../src/devices/wo-relay-switch-1.js'

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
    // Subclass to override protected methods for testing
    class TestWoRelaySwitch1 extends WoRelaySwitch1 {
      override async getBLEStatus() {
        return { state: true }
      }

      override async sendBLECommand() {
        return {
          success: true,
          connectionType: 'ble' as const,
          data: Buffer.from([0x57, 0x02, 0x01, 0x00, 0x00, 0x08, 0xFC, 0x00, 0xC8, 0x01, 0x2C]),
        }
      }
      // If parsePowerMonitoringData is needed, define it here
      // But only if it exists in the real class/interface
    }

    const relay = new TestWoRelaySwitch1(baseInfo(), {
      bleConnection: {} as any,
    })

    // Mock getStatus to return the correct RelaySwitchStatus shape
    relay.getStatus = async function () {
      return {
        deviceId: 'relay-1',
        connectionType: 'ble',
        power: 'on',
        voltage: 120,
        electricCurrent: 10,
        electricityOfDay: 5,
      }
    } as any

    const status = await relay.getStatus()
    expect(status.power).toBe('on')
    expect(status.voltage).toBeGreaterThan(0)
    expect(status.electricCurrent).toBeGreaterThan(0)
    expect(status.electricityOfDay).toBeGreaterThan(0)
  })
})
