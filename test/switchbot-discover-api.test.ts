import { describe, expect, it, vi } from 'vitest'
import { SwitchBot } from '../src/switchbot.js'

describe('switchBot.discover (API only)', () => {
  it('discovers devices from cloud API', async () => {
    const mockDevices = {
      deviceList: [
        { deviceId: 'abc', deviceName: 'Test Device', deviceType: 'Bot', enableCloudService: true, hubDeviceId: 'hub1', version: '1.0.0' },
      ],
    }
    const bot = new SwitchBot({ token: 'token', secret: 'secret' })
    const apiClient = bot.getAPIClient()
    if (!apiClient) {
      throw new Error('API client not initialized')
    }
    vi.spyOn(apiClient, 'getDevices').mockResolvedValue(mockDevices)
    const devices = await bot.discover({ scanBLE: false, fetchAPI: true })
    expect(devices.length).toBe(1)
    const device = devices[0]
    expect(device.getId()).toBe('abc')
    expect(device.getName()).toBe('Test Device')
    expect(device.getInfo().connectionTypes).toContain('api')
  })
})
