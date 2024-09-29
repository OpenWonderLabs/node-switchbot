/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot-openapi.ts: Switchbot BLE API registration.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { ApiResponse } from './types/types.js'

import { Buffer } from 'node:buffer'
import crypto, { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'

import { request } from 'undici'

import { deleteWebhook, Devices, queryWebhook, setupWebhook, updateWebhook } from './settings.js'

/**
 * SwitchBotOpenAPI class to interact with SwitchBot devices via OpenAPI.
 */
export class SwitchBotOpenAPI extends EventEmitter {
  private token: string
  private secret: string
  private baseURL: string

  webhookEventListener?: ReturnType<typeof createServer>

  constructor(token: string, secret: string) {
    super()
    this.token = token
    this.secret = secret
    this.baseURL = 'https://api.switch-bot.com/v1.0'
  }

  /**
   * Emit a log event.
   * @param level The log level.
   * @param message The log message.
   */
  private emitLog(level: string, message: string): void {
    this.emit('log', { level, message })
  }

  /**
   * Get a list of devices.
   */
  async getDevices(): Promise<any> {
    try {
      const { body, statusCode } = await request(Devices, { headers: this.generateHeaders() })
      const response = await body.json() as ApiResponse
      this.emitLog('debug', `Got devices: ${JSON.stringify(response)}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      return { response }
    } catch (error: any) {
      this.emitLog('error', `Failed to get devices: ${error.message}`)
      throw new Error(`Failed to get devices: ${error.message}`)
    }
  }

  private generateHeaders = () => {
    const t = `${Date.now()}`
    const nonce = randomUUID()
    const data = this.token + t + nonce
    const signTerm = crypto
      .createHmac('sha256', this.secret)
      .update(Buffer.from(data, 'utf-8'))
      .digest()
    const sign = signTerm.toString('base64')

    return {
      'Authorization': this.token,
      'sign': sign,
      'nonce': nonce,
      't': t,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Control a device.
   * @param deviceId The ID of the device to control.
   * @param command The command to send to the device.
   * @param parameter The parameter for the command.
   * @param commandType The type of command (e.g., "command", "customize").
   */
  async controlDevice(deviceId: string, command: string, parameter: string, commandType: string = 'command'): Promise<any> {
    try {
      const { body, statusCode } = await request(`${this.baseURL}/devices/${deviceId}/commands`, {
        method: 'POST',
        headers: this.generateHeaders(),
        body: JSON.stringify({
          command,
          parameter,
          commandType,
        }),
      })
      const response = await body.json() as ApiResponse
      this.emitLog('debug', `Controlled device: ${deviceId} with command: ${command} and parameter: ${parameter}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      return { response }
    } catch (error: any) {
      this.emitLog('error', `Failed to control device: ${error.message}`)
      throw new Error(`Failed to control device: ${error.message}`)
    }
  }

  /**
   * Get the status of a device.
   * @param deviceId The ID of the device.
   */
  async getDeviceStatus(deviceId: string): Promise<any> {
    try {
      const { body, statusCode } = await request(`${this.baseURL}/devices/${deviceId}/status`, {
        method: 'GET',
        headers: this.generateHeaders(),
      })
      const response = await body.json() as ApiResponse
      this.emitLog('debug', `Got device status: ${deviceId}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      return { response }
    } catch (error: any) {
      this.emitLog('error', `Failed to get device status: ${error.message}`)
      throw new Error(`Failed to get device status: ${error.message}`)
    }
  }

  /**
   * Setup webhook for receiving events.
   * @param url The webhook URL.
   */
  async setupWebhook(url: string): Promise<void> {
    try {
      const xurl = new URL(url)
      const port = Number(xurl.port) || 80
      const path = xurl.pathname

      this.webhookEventListener = createServer((request: IncomingMessage, response: ServerResponse) => {
        if (request.url === path && request.method === 'POST') {
          let data = ''

          request.on('data', (chunk) => {
            data += chunk
          })

          request.on('end', async () => {
            try {
              const body = JSON.parse(data)
              this.emitLog('debug', `Received Webhook: ${JSON.stringify(body)}`)

              // Emit the webhook event
              this.emit('webhookEvent', body)

              response.writeHead(200, { 'Content-Type': 'text/plain' })
              response.end('OK')
            } catch (e: any) {
              this.emitLog('error', `Failed to handle webhook event. Error: ${e.message}`)
              response.writeHead(500, { 'Content-Type': 'text/plain' })
              response.end('Internal Server Error')
            }
          })
        } else {
          response.writeHead(403, { 'Content-Type': 'text/plain' })
          response.end('NG')
        }
      }).listen(port)

      const { body, statusCode } = await request(setupWebhook, {
        method: 'POST',
        headers: this.generateHeaders(),
        body: JSON.stringify({
          action: 'setupWebhook',
          url,
          deviceList: 'ALL',
        }),
      })
      const response = await body.json() as ApiResponse
      this.emitLog('debug', `setupWebhook: url:${url}, body:${JSON.stringify(response)}, statusCode:${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        this.emitLog('error', `Failed to configure webhook. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      }
    } catch (e: any) {
      this.emitLog('error', `Failed to configure webhook. Error: ${e.message}`)
    }
  }

  /**
   * Update webhook configuration.
   * @param url The webhook URL.
   */
  async updateWebhook(url: string): Promise<void> {
    try {
      const { body, statusCode } = await request(updateWebhook, {
        method: 'POST',
        headers: this.generateHeaders(),
        body: JSON.stringify({
          action: 'updateWebhook',
          config: {
            url,
            enable: true,
          },
        }),
      })
      const response = await body.json() as ApiResponse
      this.emitLog('debug', `updateWebhook: url:${url}, body:${JSON.stringify(response)}, statusCode:${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        this.emitLog('error', `Failed to update webhook. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      }
    } catch (e: any) {
      this.emitLog('error', `Failed to update webhook. Error: ${e.message}`)
    }
  }

  /**
   * Query webhook configuration.
   */
  async queryWebhook(): Promise<void> {
    try {
      const { body, statusCode } = await request(queryWebhook, {
        method: 'POST',
        headers: this.generateHeaders(),
        body: JSON.stringify({
          action: 'queryUrl',
        }),
      })
      const response = await body.json() as ApiResponse
      this.emitLog('debug', `queryWebhook: body:${JSON.stringify(response)}`)
      this.emitLog('debug', `queryWebhook: statusCode:${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        this.emitLog('error', `Failed to query webhook. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      } else {
        this.emitLog('info', `Listening webhook on ${response?.body?.urls?.[0]}`)
      }
    } catch (e: any) {
      this.emitLog('error', `Failed to query webhook. Error: ${e.message}`)
    }
  }

  /**
   * Delete webhook configuration.
   * @param url The webhook URL.
   */
  async deleteWebhook(url: string): Promise<void> {
    try {
      const { body, statusCode } = await request(deleteWebhook, {
        method: 'POST',
        headers: this.generateHeaders(),
        body: JSON.stringify({
          action: 'deleteWebhook',
          url,
        }),
      })
      const response = await body.json() as ApiResponse
      this.emitLog('debug', `deleteWebhook: url:${url}, body:${JSON.stringify(response)}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        this.emitLog('error', `Failed to delete webhook. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      } else {
        this.emitLog('info', 'Unregistered webhook to close listening.')
      }
    } catch (e: any) {
      this.emitLog('error', `Failed to delete webhook. Error: ${e.message}`)
    }
  }
}
