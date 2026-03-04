import { describe, expect, it, vi } from 'vitest'
import { SwitchBotDevice } from '../src/devices/base.js'

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

  // Expose protected methods for mocking
  setSendBLECommand(fn: any) { this.sendBLECommand = fn }
  setSendAPICommand(fn: any) { this.sendAPICommand = fn }
}

describe('switchBotDevice.getBasicInfo', () => {
  it('returns BLE info if BLE is available', async () => {
    const device = new TestDevice()
    device.hasBLE = () => true
    device.hasAPI = () => false
    const bleMock = vi.fn().mockImplementation((cmd) => {
      expect(cmd).toEqual([0x57, 0x02])
      return Promise.resolve({
        success: true,
        data: { battery: 90, firmware: '2.0.0', extra: 'ble' },
        connectionType: 'ble',
      })
    })
    device.setSendBLECommand(bleMock)
    const result = await device.getBasicInfo()
    expect(result.success).toBe(true)
    expect(result.connectionType).toBe('ble')
    expect(result.data.battery).toBe(90)
    expect(result.data.firmware).toBe('2.0.0')
    expect(result.data.extra).toBe('ble')
    expect(bleMock).toHaveBeenCalledWith([0x57, 0x02])
  })

  it('returns API info if API is available', async () => {
    const device = new TestDevice()
    device.hasBLE = () => false
    device.hasAPI = () => true
    const apiMock = vi.fn().mockImplementation((cmd) => {
      expect(cmd).toBe('getBasicInfo')
      return Promise.resolve({
        success: true,
        data: { battery: 80, firmware: '3.0.0', extra: 'api' },
        connectionType: 'api',
      })
    })
    device.setSendAPICommand(apiMock)
    const result = await device.getBasicInfo()
    expect(result.success).toBe(true)
    expect(result.connectionType).toBe('api')
    expect(result.data.battery).toBe(80)
    expect(result.data.firmware).toBe('3.0.0')
    expect(result.data.extra).toBe('api')
    expect(apiMock).toHaveBeenCalledWith('getBasicInfo')
  })

  it('throws if no connection is available', async () => {
    const device = new TestDevice()
    device.hasBLE = () => false
    device.hasAPI = () => false
    await expect(device.getBasicInfo()).rejects.toThrow('No available connection for getBasicInfo')
  })
})
