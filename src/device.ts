/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * device.ts: Switchbot BLE API registration.
 */
import type * as Noble from '@stoprocent/noble'

import type { Chars, NobleTypes, SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from './types/types.js'

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { Advertising } from './advertising.js'
import { parameterChecker } from './parameter-checker.js'
import { CHAR_UUID_DEVICE, CHAR_UUID_NOTIFY, CHAR_UUID_WRITE, READ_TIMEOUT_MSEC, SERV_UUID_PRIMARY, WRITE_TIMEOUT_MSEC } from './settings.js'

/**
 * Represents a Switchbot Device.
 */
export class SwitchbotDevice extends EventEmitter {
  [x: string]: any
  private noble: NobleTypes['noble']
  private peripheral: NobleTypes['peripheral']
  private characteristics: Chars | null = null
  private deviceId!: string
  private deviceAddress!: string
  private deviceModel!: SwitchBotBLEModel
  private deviceModelName!: SwitchBotBLEModelName
  private deviceFriendlyName!: SwitchBotBLEModelFriendlyName
  private explicitlyConnected = false
  private isConnected = false
  private onNotify: (buf: Buffer) => void = () => {}
  private onDisconnect: () => Promise<void> = async () => {}
  private onConnect: () => Promise<void> = async () => {}

  /**
   * Initializes a new instance of the SwitchbotDevice class.
   * @param peripheral The peripheral object from noble.
   * @param noble The Noble object.
   */
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super()
    this.peripheral = peripheral
    this.noble = noble

    Advertising.parse(peripheral, this.log.bind(this)).then((ad) => {
      this.deviceId = ad?.id ?? ''
      this.deviceAddress = ad?.address ?? ''
      this.deviceModel = ad?.serviceData.model as SwitchBotBLEModel ?? ''
      this.deviceModelName = ad?.serviceData.modelName as SwitchBotBLEModelName ?? ''
      this.deviceFriendlyName = ad?.serviceData.modelFriendlyName as SwitchBotBLEModelFriendlyName ?? ''
    })
  }

  /**
   * Logs a message with the specified log level.
   * @param level The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message The log message to be emitted.
   */
  public async log(level: string, message: string): Promise<void> {
    this.emit('log', { level, message })
  }

  // Getters
  get id(): string {
    return this.deviceId
  }

  get address(): string {
    return this.deviceAddress
  }

  get model(): SwitchBotBLEModel {
    return this.deviceModel
  }

  get modelName(): SwitchBotBLEModelName {
    return this.deviceModelName
  }

  get friendlyName(): SwitchBotBLEModelFriendlyName {
    return this.deviceFriendlyName
  }

  get connectionState(): string {
    return this.isConnected ? 'connected' : this.peripheral.state
  }

  get onConnectHandler(): () => Promise<void> {
    return this.onConnect
  }

  set onConnectHandler(func: () => Promise<void>) {
    if (typeof func !== 'function') {
      throw new TypeError('The `onConnectHandler` must be a function that returns a Promise<void>.')
    }
    this.onConnect = async () => {
      await func()
    }
  }

  get onDisconnectHandler(): () => Promise<void> {
    return this.onDisconnect
  }

  set onDisconnectHandler(func: () => Promise<void>) {
    if (typeof func !== 'function') {
      throw new TypeError('The `onDisconnectHandler` must be a function that returns a Promise<void>.')
    }
    this.onDisconnect = async () => {
      await func()
    }
  }

  /**
   * Connects to the device.
   * @returns A Promise that resolves when the connection is complete.
   */
  async connect(): Promise<void> {
    this.explicitlyConnected = true
    await this.internalConnect()
  }

  /**
   * Internal method to handle the connection process.
   * @returns A Promise that resolves when the connection is complete.
   */
  private async internalConnect(): Promise<void> {
    if (this.noble._state !== 'poweredOn') {
      throw new Error(`The Bluetooth status is ${this.noble._state}, not poweredOn.`)
    }

    const state = this.connectionState
    if (state === 'connected') {
      return
    }
    if (state === 'connecting' || state === 'disconnecting') {
      throw new Error(`Now ${state}. Wait for a few seconds then try again.`)
    }

    this.peripheral.once('connect', async () => {
      this.isConnected = true
      await this.onConnect()
    })

    this.peripheral.once('disconnect', async () => {
      this.isConnected = false
      this.characteristics = null
      this.peripheral.removeAllListeners()
      await this.onDisconnect()
    })

    await this.peripheral.connectAsync()
    this.characteristics = await this.getCharacteristics()
    await this.subscribeToNotify()
  }

  /**
   * Retrieves the device characteristics.
   * @returns A Promise that resolves with the device characteristics.
   */
  public async getCharacteristics(): Promise<Chars> {
    const TIMEOUT_DURATION = 5000;

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Failed to discover services and characteristics: TIMEOUT'));
        }, TIMEOUT_DURATION);
    });

    try {
      const services = await Promise.race([this.discoverServices(), timeoutPromise]) as Noble.Service[];
      const chars: Chars = { write: null, notify: null, device: null }

      for (const service of services) {
        const characteristics = await this.discoverCharacteristics(service)
        for (const char of characteristics) {
          if (char.uuid === CHAR_UUID_WRITE) {
            chars.write = char
          }
          if (char.uuid === CHAR_UUID_NOTIFY) {
            chars.notify = char
          }
          if (char.uuid === CHAR_UUID_DEVICE) {
            chars.device = char
          }
        }
      }

      if (!chars.write || !chars.notify) {
        throw new Error('No characteristic was found.')
      }

      return chars
    } catch (error) {
      throw new Error((error as Error).message || 'An error occurred while discovering characteristics.');
    }
  }

  /**
   * Discovers the device services.
   * @returns A Promise that resolves with the list of services.
   */
  public async discoverServices(): Promise<Noble.Service[]> {
    try {
      const services = await this.peripheral.discoverServicesAsync([])
      const primaryServices = services.filter(s => s.uuid === SERV_UUID_PRIMARY)

      if (primaryServices.length === 0) {
        throw new Error('No service was found.')
      }
      return primaryServices
    } catch (e: any) {
      throw new Error(`Failed to discover services, Error: ${e.message ?? e}`)
    }
  }

  /**
   * Discovers the characteristics of a service.
   * @param service The service to discover characteristics for.
   * @returns A Promise that resolves with the list of characteristics.
   */
  private async discoverCharacteristics(service: Noble.Service): Promise<Noble.Characteristic[]> {
    return await service.discoverCharacteristicsAsync([])
  }

  /**
   * Subscribes to the notify characteristic.
   * @returns A Promise that resolves when the subscription is complete.
   */
  private async subscribeToNotify(): Promise<void> {
    const char = this.characteristics?.notify
    if (!char) {
      throw new Error('No notify characteristic was found.')
    }
    await char.subscribeAsync()
    char.on('data', (buf: Buffer) => this.onNotify(buf))
  }

  /**
   * Unsubscribes from the notify characteristic.
   * @returns A Promise that resolves when the unsubscription is complete.
   */
  async unsubscribeFromNotify(): Promise<void> {
    const char = this.characteristics?.notify
    if (!char) {
      return
    }
    char.removeAllListeners()
    await char.unsubscribeAsync()
  }

  /**
   * Disconnects from the device.
   * @returns A Promise that resolves when the disconnection is complete.
   */
  async disconnect(): Promise<void> {
    this.explicitlyConnected = false
    const state = this.peripheral.state

    if (state === 'disconnected') {
      return
    }
    if (state === 'connecting' || state === 'disconnecting') {
      throw new Error(`Now ${state}. Wait for a few seconds then try again.`)
    }

    await this.unsubscribeFromNotify()
    await this.peripheral.disconnectAsync()
  }

  /**
   * Internal method to handle disconnection if not explicitly initiated.
   * @returns A Promise that resolves when the disconnection is complete.
   */
  private async internalDisconnect(): Promise<void> {
    if (!this.explicitlyConnected) {
      await this.disconnect()
      this.explicitlyConnected = true
    }
  }

  /**
   * Retrieves the device name.
   * @returns A Promise that resolves with the device name.
   */
  async getDeviceName(): Promise<string> {
    await this.internalConnect()
    if (!this.characteristics?.device) {
      throw new Error(`The device does not support the characteristic UUID 0x${CHAR_UUID_DEVICE}.`)
    }
    const buf = await this.readCharacteristic(this.characteristics.device)
    await this.internalDisconnect()
    return buf.toString('utf8')
  }

  /**
   * Sets the device name.
   * @param name The new device name.
   * @returns A Promise that resolves when the name is set.
   */
  async setDeviceName(name: string): Promise<void> {
    const valid = parameterChecker.check(
      { name },
      { name: { required: true, type: 'string', minBytes: 1, maxBytes: 100 } },
      true,
    )

    if (!valid) {
      throw new Error(parameterChecker.error!.message)
    }

    const buf = Buffer.from(name, 'utf8')
    await this.internalConnect()
    if (!this.characteristics?.device) {
      throw new Error(`The device does not support the characteristic UUID 0x${CHAR_UUID_DEVICE}.`)
    }
    await this.writeCharacteristic(this.characteristics.device, buf)
    await this.internalDisconnect()
  }

  /**
   * Sends a command to the device and awaits a response.
   * @param reqBuf The command buffer.
   * @returns A Promise that resolves with the response buffer.
   */
  async command(reqBuf: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(reqBuf)) {
      throw new TypeError('The specified data is not acceptable for writing.')
    }

    await this.internalConnect()
    if (!this.characteristics?.write) {
      throw new Error('No characteristics available.')
    }

    await this.writeCharacteristic(this.characteristics.write, reqBuf)
    const resBuf = await this.waitForCommandResponse()
    await this.internalDisconnect()

    return resBuf
  }

  /**
   * Waits for a response from the device after sending a command.
   * @returns A Promise that resolves with the response buffer.
   */
  private async waitForCommandResponse(): Promise<Buffer> {
    const timeout = READ_TIMEOUT_MSEC
    let timer: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('READ_TIMEOUT')), timeout)
    })

    const readPromise = new Promise<Buffer>((resolve) => {
      this.onNotify = (buf: Buffer) => {
        if (timer) {
          clearTimeout(timer)
        }
        resolve(buf)
      }
    })

    return await Promise.race([readPromise, timeoutPromise])
  }

  /**
   * Reads data from a characteristic with a timeout.
   * @param char The characteristic to read from.
   * @returns A Promise that resolves with the data buffer.
   */
  private async readCharacteristic(char: Noble.Characteristic): Promise<Buffer> {
    const timer = setTimeout(() => {
      throw new Error('READ_TIMEOUT')
    }, READ_TIMEOUT_MSEC)

    try {
      const result = await char.readAsync()
      clearTimeout(timer)
      return result
    } catch (error) {
      clearTimeout(timer)
      throw error
    }
  }

  /**
   * Writes data to a characteristic with a timeout.
   * @param char The characteristic to write to.
   * @param buf The data buffer.
   * @returns A Promise that resolves when the write is complete.
   */
  private async writeCharacteristic(char: Noble.Characteristic, buf: Buffer): Promise<void> {
    const timer = setTimeout(() => {
      throw new Error('WRITE_TIMEOUT')
    }, WRITE_TIMEOUT_MSEC)

    try {
      await char.writeAsync(buf, false)
      clearTimeout(timer)
    } catch (error) {
      clearTimeout(timer)
      throw error
    }
  }
}
