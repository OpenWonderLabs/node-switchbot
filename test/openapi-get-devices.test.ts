import { describe, expect, it, vi } from 'vitest'
import { OpenAPIClient } from '../src/api.js'

describe('openAPIClient.getDevices', () => {
  it('fetches device list from API', async () => {
    const mockDevices = {
      deviceList: [
        { deviceId: 'abc', deviceName: 'Test Device', deviceType: 'WoHand', enableCloudService: true, hubDeviceId: 'hub1', version: '1.0.0' },
      ],
    }
    const client = new OpenAPIClient('token', 'secret')
    vi.spyOn(client as any, 'makeRequest').mockResolvedValue({ statusCode: 100, message: 'ok', body: mockDevices })
    const result = await client.getDevices()
    expect(result).toEqual(mockDevices)
  })
})
