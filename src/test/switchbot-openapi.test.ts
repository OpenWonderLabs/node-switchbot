import type { Mock } from 'vitest'

import { createServer } from 'node:http'

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
  const port = 3000
  let server: any

  beforeEach(() => {
    switchBotAPI = new SwitchBotOpenAPI(token, secret)
    if (server && typeof server.close === 'function') {
      server.close()
    }
    server = startServer(port)
  })

  afterEach(() => {
    vi.clearAllMocks()
    if (server && typeof server.close === 'function') {
      server.close()
    }
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

      const url = `http://localhost:${port}/webhook`
      await switchBotAPI.setupWebhook(url)

      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })

    it('should log an error if the webhook setup fails', async () => {
      const errorMessage = 'Failed to create webhook listener';
      (request as Mock).mockRejectedValue(new Error(errorMessage))

      const url = `http://localhost:${port}/webhook`
      await switchBotAPI.setupWebhook(url)

      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })
  })

  describe('deleteWebhook', () => {
    it('should delete the webhook listener and remove the webhook from the server', async () => {
      const mockDeleteResponse = { body: {}, statusCode: 200 };
      (request as Mock).mockResolvedValue({
        body: {
          json: vi.fn().mockResolvedValue(mockDeleteResponse.body),
        },
        statusCode: mockDeleteResponse.statusCode,
      })

      const url = `http://localhost:${port}/webhook`
      await switchBotAPI.deleteWebhook(url)

      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })

    it('should log an error if the webhook deletion fails', async () => {
      const errorMessage = 'Failed to delete webhook listener';
      (request as Mock).mockRejectedValue(new Error(errorMessage))

      const url = `http://localhost:${port}/webhook`
      await switchBotAPI.deleteWebhook(url)

      expect(request).toHaveBeenCalledWith(expect.any(String), expect.any(Object))
    })
  })
})

function startServer(port: number): any {
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
      req.on('data', () => {
        // Process the chunk if needed
      })
      req.on('end', () => {
        // Log the webhook received event
        // console.log('Webhook received:', body)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ message: 'Webhook received' }))
      })
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ message: 'Not Found' }))
    }
  })

  server.listen(port, () => {
    // Server is listening on port ${port}
  })

  return server
}
