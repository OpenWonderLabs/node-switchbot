import type { Mock } from 'vitest'

import { request } from 'undici'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SwitchBotOpenAPI } from '../switchbot-openapi.js'

vi.mock('undici', () => ({
  request: vi.fn(),
}))

describe('switchBotOpenAPI', () => {
  let switchBotAPI: SwitchBotOpenAPI
  const token = 'test-token'
  const secret = 'test-secret'

  beforeEach(() => {
    switchBotAPI = new SwitchBotOpenAPI(token, secret)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getDevices', () => {
    it('should retrieve the list of devices', async () => {
      const mockDevicesResponse = { body: { devices: [] }, statusCode: 200 };
      (request as Mock).mockResolvedValue({
        body: {
          json: vi.fn().mockResolvedValue(mockDevicesResponse.body),
        },
        statusCode: mockDevicesResponse.statusCode,
      })

      const result = await switchBotAPI.getDevices()

      expect(result).toEqual(mockDevicesResponse)
      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })

    it('should throw an error if the request fails', async () => {
      const errorMessage = 'Failed to get devices';
      (request as Mock).mockRejectedValue(new Error(errorMessage))

      await expect(switchBotAPI.getDevices()).rejects.toThrow(`Failed to get devices: ${errorMessage}`)
    })
  })

  describe('controlDevice', () => {
    it('should control a device by sending a command', async () => {
      const mockControlResponse = { body: {}, statusCode: 200 };
      (request as Mock).mockResolvedValue({
        body: {
          json: vi.fn().mockResolvedValue(mockControlResponse.body),
        },
        statusCode: mockControlResponse.statusCode,
      })

      const result = await switchBotAPI.controlDevice('device-id', 'turnOn', 'default')

      expect(result).toEqual(mockControlResponse)
      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })

    it('should throw an error if the device control fails', async () => {
      const errorMessage = 'Failed to control device';
      (request as Mock).mockRejectedValue(new Error(errorMessage))

      await expect(switchBotAPI.controlDevice('device-id', 'turnOn', 'default')).rejects.toThrow(`Failed to control device: ${errorMessage}`)
    })
  })

  describe('getDeviceStatus', () => {
    it('should retrieve the status of a specific device', async () => {
      const mockStatusResponse = { body: {}, statusCode: 200 };
      (request as Mock).mockResolvedValue({
        body: {
          json: vi.fn().mockResolvedValue(mockStatusResponse.body),
        },
        statusCode: mockStatusResponse.statusCode,
      })

      const result = await switchBotAPI.getDeviceStatus('device-id')

      expect(result).toEqual(mockStatusResponse)
      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })

    it('should throw an error if the request fails', async () => {
      const errorMessage = 'Failed to get device status';
      (request as Mock).mockRejectedValue(new Error(errorMessage))

      await expect(switchBotAPI.getDeviceStatus('device-id')).rejects.toThrow(`Failed to get device status: ${errorMessage}`)
    })
  })

  describe('setupWebhook', () => {
    it('should set up a webhook listener and configure the webhook on the server', async () => {
      const mockWebhookResponse = { body: {}, statusCode: 200 };
      (request as Mock).mockResolvedValue({
        body: {
          json: vi.fn().mockResolvedValue(mockWebhookResponse.body),
        },
        statusCode: mockWebhookResponse.statusCode,
      })

      const url = 'http://localhost:3000/webhook'
      await switchBotAPI.setupWebhook(url)

      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })

    it('should log an error if the webhook setup fails', async () => {
      const errorMessage = 'Failed to create webhook listener';
      (request as Mock).mockRejectedValue(new Error(errorMessage))

      const url = 'http://localhost:3000/webhook'
      await switchBotAPI.setupWebhook(url)

      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })
  })
})
