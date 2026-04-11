/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * api.ts: SwitchBot v4.0.0 - OpenAPI Client
 */

import type { APICommandRequest, APICommandResponse, APIDevice, APIDeviceStatus, APIResponse, DeviceListResponse, SceneListResponse, WebhookConfig, WebhookQueryResponse, WebhookSetupResponse } from './types/api.js'

import { request } from 'undici'

import { urls } from './settings.js'
import { createSignature, generateNonce, generateTimestamp, Logger } from './utils/index.js'

/**
 * OpenAPI Client for SwitchBot API v1.1
 */
export class OpenAPIClient {
  private logger: Logger

  constructor(
    private token: string,
    private secret: string,
    private baseURL: string = urls.base,
    logLevel?: number,
  ) {
    this.logger = new Logger('OpenAPIClient', logLevel)

    if (!token || !secret) {
      throw new Error('OpenAPI token and secret are required')
    }
  }

  /**
   * Generate authentication headers for API requests
   */
  private async generateHeaders(): Promise<Record<string, string>> {
    const timestamp = generateTimestamp()
    const nonce = generateNonce()
    const sign = await createSignature(this.token, this.secret, timestamp, nonce)

    return {
      'Authorization': this.token,
      'Content-Type': 'application/json',
      't': timestamp,
      'sign': sign,
      'nonce': nonce,
    }
  }

  /**
   * Make an API request
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any,
  ): Promise<APIResponse<T>> {
    const headers = await this.generateHeaders()
    const url = `${this.baseURL}${path}`

    this.logger.debug(`${method} ${url}`, body ? { body } : {})

    try {
      const response = await request(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await response.body.json() as APIResponse<T>

      if (data.statusCode !== 100 && data.statusCode !== 200) {
        this.logger.error('API request failed', data)
        throw new Error(`API Error ${data.statusCode}: ${data.message}`)
      }

      this.logger.debug('API response', data)
      return data
    } catch (error) {
      this.logger.error('API request error', error)
      throw error
    }
  }

  /**
   * Get all devices
   */
  async getDevices(): Promise<DeviceListResponse> {
    const response = await this.makeRequest<DeviceListResponse>('GET', '/v1.1/devices')
    return response.body
  }

  /**
   * Get device status
   */
  async getStatus(deviceId: string): Promise<APIDeviceStatus> {
    const response = await this.makeRequest<APIDeviceStatus>('GET', `/v1.1/devices/${deviceId}/status`)
    return response.body
  }

  /**
   * Send command to device
   */
  async sendCommand(
    deviceId: string,
    command: string,
    parameter?: any,
  ): Promise<APICommandResponse> {
    const body: APICommandRequest = {
      command,
      parameter: parameter !== undefined ? parameter : 'default',
    }

    const response = await this.makeRequest<any>('POST', `/v1.1/devices/${deviceId}/commands`, body)

    return {
      statusCode: response.statusCode,
      message: response.message,
      body: response.body,
    }
  }

  /**
   * Get all scenes
   */
  async getScenes(): Promise<SceneListResponse> {
    const response = await this.makeRequest<SceneListResponse>('GET', '/v1.1/scenes')
    return response.body
  }

  /**
   * Execute a scene
   */
  async executeScene(sceneId: string): Promise<void> {
    await this.makeRequest('POST', `/v1.1/scenes/${sceneId}/execute`)
  }

  /**
   * Setup webhook
   */
  async setupWebhook(config: WebhookConfig): Promise<WebhookSetupResponse> {
    const response = await this.makeRequest<any>('POST', '/v1.1/webhook/setupWebhook', config)

    return {
      statusCode: response.statusCode,
      message: response.message,
      body: response.body,
    }
  }

  /**
   * Query webhook configuration
   */
  async queryWebhook(urls?: string[]): Promise<WebhookQueryResponse> {
    const body = urls ? { urls } : {}
    const response = await this.makeRequest<any>('POST', '/v1.1/webhook/queryWebhook', body)

    return {
      statusCode: response.statusCode,
      message: response.message,
      body: response.body,
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(config: WebhookConfig): Promise<void> {
    await this.makeRequest('POST', '/v1.1/webhook/updateWebhook', config)
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(url: string): Promise<void> {
    await this.makeRequest('POST', '/v1.1/webhook/deleteWebhook', { url })
  }

  /**
   * Get specific device information
   */
  async getDevice(deviceId: string): Promise<APIDevice | undefined> {
    const devices = await this.getDevices()
    return devices.deviceList.find(d => d.deviceId === deviceId)
  }

  /**
   * Get devices by type
   */
  async getDevicesByType(deviceType: string): Promise<APIDevice[]> {
    const devices = await this.getDevices()
    return devices.deviceList.filter(d => d.deviceType === deviceType)
  }

  /**
   * Check if device has cloud service enabled
   */
  async isCloudServiceEnabled(deviceId: string): Promise<boolean> {
    const device = await this.getDevice(deviceId)
    return device?.enableCloudService ?? false
  }

  /**
   * Bot-specific commands
   */
  async botPress(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'press')
  }

  async botTurnOn(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOn')
  }

  async botTurnOff(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOff')
  }

  /**
   * Curtain-specific commands
   */
  async curtainOpen(deviceId: string, speed = 255): Promise<APICommandResponse> {
    const clampedSpeed = Math.min(255, Math.max(1, speed))
    return this.sendCommand(deviceId, 'setPosition', `0,${clampedSpeed.toString(16).padStart(2, '0')},0`)
  }

  async curtainClose(deviceId: string, speed = 255): Promise<APICommandResponse> {
    const clampedSpeed = Math.min(255, Math.max(1, speed))
    return this.sendCommand(deviceId, 'setPosition', `0,${clampedSpeed.toString(16).padStart(2, '0')},100`)
  }

  async curtainPause(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'pause')
  }

  async curtainSetPosition(deviceId: string, position: number, speed = 255): Promise<APICommandResponse> {
    const clampedSpeed = Math.min(255, Math.max(1, speed))
    return this.sendCommand(deviceId, 'setPosition', `0,${clampedSpeed.toString(16).padStart(2, '0')},${position}`)
  }

  /**
   * Lock-specific commands
   */
  async lockLock(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'lock')
  }

  async lockUnlock(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'unlock')
  }

  /**
   * Plug-specific commands
   */
  async plugTurnOn(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOn')
  }

  async plugTurnOff(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOff')
  }

  async plugToggle(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'toggle')
  }

  /**
   * Bulb/Light-specific commands
   */
  async lightTurnOn(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOn')
  }

  async lightTurnOff(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOff')
  }

  async lightSetBrightness(deviceId: string, brightness: number): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setBrightness', brightness)
  }

  async lightSetColor(deviceId: string, red: number, green: number, blue: number): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setColor', `${red}:${green}:${blue}`)
  }

  async lightSetColorTemperature(deviceId: string, temperature: number): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setColorTemperature', temperature)
  }

  /**
   * Humidifier-specific commands
   */
  async humidifierTurnOn(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOn')
  }

  async humidifierTurnOff(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOff')
  }

  async humidifierSetMode(deviceId: string, mode: 'auto' | 'manual'): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setMode', mode === 'auto' ? 'auto' : '101')
  }

  /**
   * Air Purifier-specific commands
   */
  async airPurifierTurnOn(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOn')
  }

  async airPurifierTurnOff(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'turnOff')
  }

  async airPurifierSetMode(deviceId: string, mode: 'auto' | 'manual' | 'sleep'): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setMode', mode)
  }

  async airPurifierSetFanSpeed(deviceId: string, speed: number): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setFanSpeed', speed)
  }

  /**
   * Blind Tilt-specific commands
   */
  async blindTiltOpen(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setPosition', '0,ff,0')
  }

  async blindTiltClose(deviceId: string): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setPosition', '0,ff,100')
  }

  async blindTiltSetPosition(deviceId: string, position: number): Promise<APICommandResponse> {
    return this.sendCommand(deviceId, 'setPosition', `0,ff,${position}`)
  }

  /**
   * Get client configuration
   */
  getConfig(): { token: string, baseURL: string } {
    return {
      token: this.token,
      baseURL: this.baseURL,
    }
  }

  /**
   * Update base URL
   */
  setBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL
    this.logger.info(`Base URL updated to ${newBaseURL}`)
  }
}
