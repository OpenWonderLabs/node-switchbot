import type { ConnectionType, DeviceInfo } from '../../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { PASSIVE_POLL_INTERVAL, SwitchBotDevice } from '../../src/devices/base.js'
//

class TestDevice extends SwitchBotDevice {
  // Expose a protected setter for lastPolledAt for testing
  setLastPolledAt(ts: number) {
    // @ts-expect-error: test access
    this.lastPolledAt = ts
  }

  async getStatus() {
    return {
      deviceId: this.info.id,
      connectionType: 'ble' as ConnectionType,
      version: '1.0.0',
      battery: 100,
      updatedAt: new Date(),
    }
  }
}

describe('switchbotdevice passive polling', () => {
  const info: DeviceInfo = {
    id: 'test',
    name: 'Test Device',
    deviceType: 'Test',
    mac: '00:00:00:00:00:00',
    connectionTypes: ['ble', 'api'],
    activeConnection: 'ble',
  }

  it('should require polling if never polled', () => {
    const device = new TestDevice(info)
    expect(device.pollNeeded()).toBe(true)
  })

  it('should not require polling if interval not elapsed', () => {
    const device = new TestDevice(info)
    device.setLastPolledAt(Date.now())
    expect(device.pollNeeded()).toBe(false)
  })

  it('should require polling if interval elapsed', () => {
    const device = new TestDevice(info)
    device.setLastPolledAt(Date.now() - (PASSIVE_POLL_INTERVAL + 1000))
    expect(device.pollNeeded()).toBe(true)
  })

  it('pollIfNeeded should call getStatus if needed', async () => {
    const device = new TestDevice(info)
    device.setLastPolledAt(Date.now() - (PASSIVE_POLL_INTERVAL + 1000))
    const status = await device.pollIfNeeded()
    expect(status).toMatchObject({
      deviceId: 'test',
      connectionType: 'ble',
      version: '1.0.0',
      battery: 100,
    })
    // @ts-expect-error: test access
    expect(typeof device.lastPolledAt).toBe('number')
  })

  it('pollIfNeeded should not call getStatus if not needed', async () => {
    const device = new TestDevice(info)
    device.setLastPolledAt(Date.now())
    const spy = vi.spyOn(device, 'getStatus')
    const status = await device.pollIfNeeded()
    expect(status).toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
  })
})
