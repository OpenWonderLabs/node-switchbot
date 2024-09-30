/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot-openapi.ts: Switchbot BLE API registration.
 */
import type { IncomingMessage, Server, ServerResponse } from 'node:http'

import type { pushResponse } from './types/devicepush.js'
import type { body } from './types/deviceresponse.js'
import type { deviceStatus } from './types/devicestatus.js'
import type { deleteWebhookResponse, queryWebhookResponse, setupWebhookResponse, updateWebhookResponse } from './types/devicewebhookstatus.js'

import { Buffer } from 'node:buffer'
import crypto, { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'

import { request } from 'undici'

import { deleteWebhook, Devices, queryWebhook, setupWebhook, updateWebhook } from './settings.js'

/**
 * The `SwitchBotOpenAPI` class provides methods to interact with the SwitchBot OpenAPI.
 * It allows you to retrieve device information, control devices, and manage webhooks.
 *
 * @extends EventEmitter
 *
 * @example
 * ```typescript
 * const switchBotAPI = new SwitchBotOpenAPI('your-token', 'your-secret');
 *
 * // Get devices
 * switchBotAPI.getDevices().then(response => {
 *   console.log(response);
 * }).catch(error => {
 *   console.error(error);
 * });
 *
 * // Control a device
 * switchBotAPI.controlDevice('device-id', 'turnOn', 'default').then(response => {
 *   console.log(response);
 * }).catch(error => {
 *   console.error(error);
 * });
 *
 * // Setup webhook
 * switchBotAPI.setupWebhook('http://your-webhook-url').then(() => {
 *   console.log('Webhook setup successfully');
 * }).catch(error => {
 *   console.error(error);
 * });
 * ```
 *
 * @param {string} token - The API token used for authentication.
 * @param {string} secret - The secret key used for signing requests.
 */
export class SwitchBotOpenAPI extends EventEmitter {
  private token: string
  private secret: string
  private baseURL: string

  webhookEventListener?: Server | null = null

  /**
   * Creates an instance of the SwitchBot OpenAPI client.
   *
   * @param token - The API token used for authentication.
   * @param secret - The secret key used for signing requests.
   */
  constructor(token: string, secret: string) {
    super()
    this.token = token
    this.secret = secret
    this.baseURL = 'https://api.switch-bot.com/v1.0'
  }

  /**
   * Emits a log event with the specified log level and message.
   *
   * @param level - The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message - The log message to be emitted.
   */
  private async emitLog(level: string, message: string): Promise<void> {
    this.emit('log', { level, message })
  }

  /**
   * Retrieves the list of devices from the SwitchBot OpenAPI.
   *
   * @returns {Promise<{ response: body, statusCode: number }>} A promise that resolves to an object containing the API response.
   * @throws {Error} Throws an error if the request to get devices fails.
   */
  async getDevices(): Promise<{ response: body, statusCode: number }> {
    try {
      const { body, statusCode } = await request(Devices, { headers: this.generateHeaders() })
      const response = await body.json() as body
      this.emitLog('debug', `Got devices: ${JSON.stringify(response)}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      return { response, statusCode }
    } catch (error: any) {
      this.emitLog('error', `Failed to get devices: ${error.message}`)
      throw new Error(`Failed to get devices: ${error.message}`)
    }
  }

  /**
   * Controls a device by sending a command to the SwitchBot API.
   *
   * @param deviceId - The unique identifier of the device to control.
   * @param command - The command to send to the device.
   * @param parameter - The parameter for the command.
   * @param commandType - The type of the command, defaults to 'command'.
   * @returns {Promise<{ response: pushResponse['body'], statusCode: number }>} A promise that resolves to an object containing the API response.
   * @throws An error if the device control fails.
   */
  async controlDevice(deviceId: string, command: string, parameter: string, commandType: string = 'command'): Promise<{ response: pushResponse['body'], statusCode: number }> {
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
      const response = await body.json() as pushResponse['body']
      this.emitLog('debug', `Controlled device: ${deviceId} with command: ${command} and parameter: ${parameter}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      return { response, statusCode }
    } catch (error: any) {
      this.emitLog('error', `Failed to control device: ${error.message}`)
      throw new Error(`Failed to control device: ${error.message}`)
    }
  }

  /**
   * Retrieves the status of a specific device.
   *
   * @param deviceId - The unique identifier of the device.
   * @returns {Promise<{ response: deviceStatus, statusCode: number }>} A promise that resolves to the device status.
   * @throws An error if the request fails.
   */
  async getDeviceStatus(deviceId: string): Promise<{ response: deviceStatus, statusCode: number }> {
    try {
      const { body, statusCode } = await request(`${this.baseURL}/devices/${deviceId}/status`, {
        method: 'GET',
        headers: this.generateHeaders(),
      })
      const response = await body.json() as deviceStatus
      this.emitLog('debug', `Got device status: ${deviceId}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      return { response, statusCode }
    } catch (error: any) {
      this.emitLog('error', `Failed to get device status: ${error.message}`)
      throw new Error(`Failed to get device status: ${error.message}`)
    }
  }

  /**
   * Generates the headers required for authentication with the SwitchBot OpenAPI.
   *
   * @returns An object containing the following headers:
   * - `Authorization`: The token used for authorization.
   * - `sign`: The HMAC-SHA256 signature of the concatenated token, timestamp, and nonce.
   * - `nonce`: A unique identifier for the request, formatted as a UUID.
   * - `t`: The current timestamp in milliseconds since the Unix epoch.
   * - `Content-Type`: The content type of the request, set to `application/json`.
   */
  private generateHeaders = (): { 'Authorization': string, 'sign': string, 'nonce': `${string}-${string}-${string}-${string}-${string}`, 't': string, 'Content-Type': string } => {
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
   * Sets up a webhook listener and configures the webhook on the server.
   *
   * This method performs the following steps:
   * 1. Creates a local server to listen for incoming webhook events.
   * 2. Sends a request to set up the webhook with the provided URL.
   * 3. Sends a request to update the webhook configuration.
   * 4. Sends a request to query the current webhook URL.
   *
   * @param url - The URL to which the webhook events will be sent.
   * @returns A promise that resolves when the webhook setup is complete.
   *
   * @throws Will log an error if any step in the webhook setup process fails.
   */
  async setupWebhook(url: string): Promise<void> {
    try {
      const xurl = new URL(url)
      const port = Number(xurl.port)
      const path = xurl.pathname
      this.webhookEventListener = createServer(async (request: IncomingMessage, response: ServerResponse) => {
        try {
          if (request.url === path && request.method === 'POST') {
            request.on('data', async (data) => {
              try {
                const body = JSON.parse(data)
                await this.emitLog('debug', `Received Webhook: ${JSON.stringify(body)}`)
                this.emit('webhookEvent', body)
              } catch (e: any) {
                await this.emitLog('error', `Failed to handle webhook event data. Error:${e}`)
              }
            })
            response.writeHead(200, { 'Content-Type': 'text/plain' })
            response.end('OK')
          } else {
            await this.emitLog('error', `Invalid request received. URL:${request.url}, Method:${request.method}`)
            response.writeHead(403, { 'Content-Type': 'text/plain' })
            response.end(`NG`)
          }
        } catch (e: any) {
          await this.emitLog('error', `Failed to handle webhook event. Error:${e}`)
        }
      }).listen(port || 80)
    } catch (e: any) {
      await this.emitLog('error', `Failed to create webhook listener. Error:${e.message}`)
      return
    }

    try {
      const { body, statusCode } = await request(setupWebhook, {
        method: 'POST',
        headers: this.generateHeaders(),
        body: JSON.stringify({
          action: 'setupWebhook',
          url,
          deviceList: 'ALL',
        }),
      })
      const response: any = await body.json() as setupWebhookResponse['body']
      await this.emitLog('debug', `setupWebhook: url:${url}, body:${JSON.stringify(response)}, statusCode:${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        await this.emitLog('error', `Failed to configure webhook. Existing webhook well be overridden. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      }
    } catch (e: any) {
      await this.emitLog('error', `Failed to configure webhook. Error: ${e.message}`)
    }

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
      const response: any = await body.json() as updateWebhookResponse['body']
      await this.emitLog('debug', `updateWebhook: url:${url}, body:${JSON.stringify(response)}, statusCode:${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        await this.emitLog('error', `Failed to update webhook. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      }
    } catch (e: any) {
      await this.emitLog('error', `Failed to update webhook. Error:${e.message}`)
    }

    try {
      const { body, statusCode } = await request(queryWebhook, {
        method: 'POST',
        headers: this.generateHeaders(),
        body: JSON.stringify({
          action: 'queryUrl',
        }),
      })
      const response: any = await body.json() as queryWebhookResponse['body']
      await this.emitLog('debug', `queryWebhook: body:${JSON.stringify(response)}, statusCode:${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        await this.emitLog('error', `Failed to query webhook. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      } else {
        await this.emitLog('info', `Listening webhook on ${response?.body?.urls[0]}`)
      }
    } catch (e: any) {
      await this.emitLog('error', `Failed to query webhook. Error:${e}`)
    }
  }

  /**
   * Deletes a webhook by sending a request to the specified URL.
   *
   * @param url - The URL of the webhook to be deleted.
   * @returns A promise that resolves when the webhook is successfully deleted.
   *
   * @throws Will log an error if the deletion fails.
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
      const response: any = await body.json() as deleteWebhookResponse['body']
      await this.emitLog('debug', `deleteWebhook: url:${url}, body:${JSON.stringify(response)}, statusCode:${statusCode}`)
      if (statusCode !== 200 || response?.statusCode !== 100) {
        await this.emitLog('error', `Failed to delete webhook. HTTP:${statusCode} API:${response?.statusCode} message:${response?.message}`)
      } else {
        await this.emitLog('info', 'Unregistered webhook to close listening.')
      }
    } catch (e: any) {
      await this.emitLog('error', `Failed to delete webhook. Error:${e.message}`)
    }
  }
}
