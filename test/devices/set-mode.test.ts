import { describe, expect, it, vi } from 'vitest'

import { SwitchBotDevice } from '../../src/devices/base.js'

// Minimal mock device class for testing
class TestDevice extends SwitchBotDevice {
  constructor(options: any = {}) {
    super({
      id: 'test',
      name: 'Test Device',
      deviceType: 'TestType',
      mac: '00:11:22:33:44:55',
      model: 'TestModel',
      battery: 100,
      connectionTypes: ['ble', 'api'],
    }, options)
  }

  async getStatus() {
    return {
      deviceId: 'test',
      connectionType: 'ble' as const,
      version: '1.0.0',
      battery: 100,
      updatedAt: new Date(),
    }
  }

  setSendBLECommand(fn: any) { (this as any).sendBLECommand = fn }
  setSendAPICommand(fn: any) { (this as any).sendAPICommand = fn }
}

describe('switchBotDevice.setMode', () => {
  it('sends BLE command if BLE is available', async () => {
    const device = new TestDevice()
    device.hasBLE = () => true
    device.hasAPI = () => false
    device.setSendBLECommand(vi.fn().mockResolvedValue({ success: true, mode: 'auto' }))
    const result = await device.setMode('auto')
    expect(result.success).toBe(true)
    expect((device as any).sendBLECommand).toHaveBeenCalledWith([0x57, 0x03, expect.any(Number)])
  })

  it('sends API command if API is available', async () => {
    const device = new TestDevice()
    device.hasBLE = () => false
    device.hasAPI = () => true
    device.setSendAPICommand(vi.fn().mockResolvedValue({ success: true, mode: 'manual' }))
    const result = await device.setMode('manual')
    expect(result.success).toBe(true)
    expect((device as any).sendAPICommand).toHaveBeenCalledWith('setMode', { mode: 'manual' })
  })

  it('throws if no connection is available', async () => {
    const device = new TestDevice()
    device.hasBLE = () => false
    device.hasAPI = () => false
    await expect(device.setMode('auto')).rejects.toThrow('No available connection for setMode')
  })
})
