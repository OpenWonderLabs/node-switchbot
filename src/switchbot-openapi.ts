/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot-openapi.ts: Switchbot BLE API registration.
 */
import type { IncomingMessage, Server, ServerResponse } from 'node:http'

import type { pushResponse } from './types/devicepush.js'
import type { devices } from './types/deviceresponse.js'
import type { deviceStatus, deviceStatusRequest } from './types/devicestatus.js'
import type { deleteWebhookResponse, queryWebhookResponse, setupWebhookResponse, updateWebhookResponse } from './types/devicewebhookstatus.js'

import crypto, { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'

import { request } from 'undici'

import { updateBaseURL, urls } from './settings.js'

/**
 * Custom error class for API errors.
 */
class APIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'APIError'
  }
}

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
  constructor(token: string, secret: string, hostname?: string) {
    super()
    this.token = token
    this.secret = secret
    this.emitLog('info', `Token: ${token}, Secret: ${secret}`)
    this.baseURL = urls.baseURL

    if (hostname) {
      updateBaseURL(hostname)
    }
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
   * Generates the headers required for authentication with the SwitchBot OpenAPI.
   *
   * @param configToken - The token used for authorization.
   * @param configSecret - The secret key used to sign the request.
   * @returns An object containing the necessary headers:
   * - `Authorization`: The authorization token.
   * - `sign`: The HMAC-SHA256 signature of the token, timestamp, and nonce.
   * - `nonce`: A unique identifier for the request.
   * - `t`: The current timestamp in milliseconds.
   * - `Content-Type`: The content type of the request, set to 'application/json'.
   */
  private generateHeaders = (configToken: string, configSecret: string): { 'Authorization': string, 'sign': string, 'nonce': string, 't': string, 'Content-Type': string } => {
    const t = Date.now().toString()
    const nonce = randomUUID()
    const data = configToken + t + nonce
    const sign = crypto
      .createHmac('sha256', configSecret)
      .update(data)
      .digest('base64')

    return {
      'Authorization': configToken,
      'sign': sign,
      'nonce': nonce,
      't': t,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Retrieves the list of devices from the SwitchBot OpenAPI.
   * @param token - (Optional) The token used for authentication. If not provided, the instance token will be used.
   * @param secret - (Optional) The secret used for authentication. If not provided, the instance secret will be used.
   * @returns {Promise<{ response: body, statusCode: number }>} A promise that resolves to an object containing the API response.
   * @throws {Error} Throws an error if the request to get devices fails.
   */
  async getDevices(token?: string, secret?: string): Promise<{ response: devices, statusCode: number }> {
    try {
      const configToken = token || this.token
      const configSecret = secret || this.secret
      const { body, statusCode } = await request(urls.devicesURL, { headers: this.generateHeaders(configToken, configSecret) })
      const response = await body.json() as devices
      this.emitLog('debug', `Got devices: ${JSON.stringify(response)}`)
      this.emitLog('debug', `statusCode: ${statusCode}`)
      return { response, statusCode }
    } catch (e: any) {
      this.emitLog('error', `Failed to get devices: ${e.message ?? e}`)
      throw new APIError(`Failed to get devices: ${e.message ?? e}`, e.statusCode)
    }
  }

  /**
   * Controls a device by sending a command to the SwitchBot API.
   *
   * @param deviceId - The ID of the device to control.
   * @param command - The command to send to the device.
   * @param parameter - The parameter for the command.
   * @param commandType - The type of the command (default is 'command').
   * @param token - (Optional) The token used for authentication. If not provided, the instance token will be used.
   * @param secret - (Optional) The secret used for authentication. If not provided, the instance secret will be used.
   * @returns A promise that resolves to an object containing the response body and status code.
   * @throws An error if the device control fails.
   */
  async controlDevice(deviceId: string, command: string, parameter: string, commandType: string = 'command', token?: string, secret?: string): Promise<{ response: pushResponse['body'], statusCode: pushResponse['statusCode'] }> {
    try {
      const configToken = token || this.token
      const configSecret = secret || this.secret
      const { body, statusCode } = await request(`${urls.devicesURL}/${deviceId}/commands`, {
        method: 'POST',
        headers: this.generateHeaders(configToken, configSecret),
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
    } catch (e: any) {
      this.emitLog('error', `Failed to control device: ${e.message ?? e}`)
      throw new APIError(`Failed to control device: ${e.message ?? e}`, e.statusCode)
    }
  }

  /**
   * Retrieves the status of a specific device.
   *
   * @param deviceId - The unique identifier of the device.
   * @param token - (Optional) The token used for authentication. If not provided, the instance token will be used.
   * @param secret - (Optional) The secret used for authentication. If not provided, the instance secret will be used.
   * @returns A promise that resolves to an object containing the device status and the status code of the request.
   * @throws An error if the request fails.
   */
  async getDeviceStatus(deviceId: string, token?: string, secret?: string): Promise<{ response: deviceStatus, statusCode: deviceStatusRequest['statusCode'] }> {
    try {
      const configToken = token || this.token
      const configSecret = secret || this.secret
      const { body, statusCode } = await request(`${urls.devicesURL}/${deviceId}/status`, { headers: this.generateHeaders(configToken, configSecret) })
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
   * Sets up a webhook listener and configures the webhook on the server.
   *
   * This method performs the following steps:
   * 1. Creates a local server to listen for incoming webhook events.
   * 2. Sends a request to set up the webhook with the provided URL.
   * 3. Sends a request to update the webhook configuration.
   * 4. Sends a request to query the current webhook URL.
   *
   * @param url - The URL to which the webhook events will be sent.
   * @param token - (Optional) The token used for authentication. If not provided, the instance token will be used.
   * @param secret - (Optional) The secret used for authentication. If not provided, the instance secret will be used.
   * @returns A promise that resolves when the webhook setup is complete.
   *
   * @throws Will log an error if any step in the webhook setup process fails.
   */
  async setupWebhook(url: string, token?: string, secret?: string): Promise<void> {
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
                await this.emitLog('error', `Failed to handle webhook event data, Error: ${e.message ?? e}`)
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
          await this.emitLog('error', `Failed to handle webhook event, Error: ${e.message ?? e}`)
        }
      }).listen(port || 80)
    } catch (e: any) {
      await this.emitLog('error', `Failed to create webhook listener, Error: ${e.message ?? e}`)
      throw new APIError(`Failed to create webhook listener: ${e.message ?? e}`, e.statusCode)
    }

    try {
      const configToken = token || this.token
      const configSecret = secret || this.secret
      const { body, statusCode } = await request(urls.setupWebhook, {
        method: 'POST',
        headers: this.generateHeaders(configToken, configSecret),
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
      await this.emitLog('error', `Failed to configure webhook, Error: ${e.message ?? e}`)
      throw new APIError(`Failed to configure webhook: ${e.message ?? e}`, e.statusCode)
    }

    try {
      const configToken = token || this.token
      const configSecret = secret || this.secret
      const { body, statusCode } = await request(urls.updateWebhook, {
        method: 'POST',
        headers: this.generateHeaders(configToken, configSecret),
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
      await this.emitLog('error', `Failed to update webhook, Error: ${e.message ?? e}`)
      throw new APIError(`Failed to update webhook: ${e.message ?? e}`, e.statusCode)
    }

    try {
      const configToken = token || this.token
      const configSecret = secret || this.secret
      const { body, statusCode } = await request(urls.queryWebhook, {
        method: 'POST',
        headers: this.generateHeaders(configToken, configSecret),
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
      await this.emitLog('error', `Failed to query webhook, Error: ${e.message ?? e}`)
      throw new APIError(`Failed to query webhook: ${e.message ?? e}`, e.statusCode)
    }
  }

  /**
   * Deletes a webhook by sending a request to the specified URL.
   *
   * @param url - The URL of the webhook to be deleted.
   * @param token - (Optional) The token used for authentication. If not provided, the instance token will be used.
   * @param secret - (Optional) The secret used for authentication. If not provided, the instance secret will be used.
   * @returns A promise that resolves when the webhook is successfully deleted.
   *
   * @throws Will log an error if the deletion fails.
   */
  async deleteWebhook(url: string, token?: string, secret?: string): Promise<void> {
    try {
      const configToken = token || this.token
      const configSecret = secret || this.secret
      const { body, statusCode } = await request(urls.deleteWebhook, {
        method: 'POST',
        headers: this.generateHeaders(configToken, configSecret),
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
      await this.emitLog('error', `Failed to delete webhook, Error: ${e.message ?? e}`)
      throw new APIError(`Failed to delete webhook: ${e.message ?? e}`, e.statusCode)
    }
  }
}
