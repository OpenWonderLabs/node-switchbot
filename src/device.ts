/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * device.ts: Switchbot BLE API registration.
 */
import type * as Noble from '@stoprocent/noble'

import type { Chars, SwitchBotBLEModel, SwitchBotBLEModelName } from './types/types.js'

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { Advertising } from './advertising.js'
import { parameterChecker } from './parameter-checker.js'
import {
  CHAR_UUID_DEVICE,
  CHAR_UUID_NOTIFY,
  CHAR_UUID_WRITE,
  READ_TIMEOUT_MSEC,
  SERV_UUID_PRIMARY,
  WRITE_TIMEOUT_MSEC,
} from './settings.js'

/**
 * Represents a Switchbot Device.
 */
export class SwitchbotDevice extends EventEmitter {
  private _noble: typeof Noble
  private _peripheral: Noble.Peripheral
  private _characteristics: Chars | null = null
  private _id!: string
  private _address!: string
  private _model!: SwitchBotBLEModel
  private _modelName!: SwitchBotBLEModelName
  private _explicitly = false
  private _connected = false
  private onnotify_internal: (buf: Buffer) => void = () => {}

  private ondisconnect_internal: () => Promise<void> = async () => {}
  private onconnect_internal: () => Promise<void> = async () => {}

  /**
   * Initializes a new instance of the SwitchbotDevice class.
   * @param peripheral The peripheral object from noble.
   * @param noble The Noble object.
   */
  constructor(peripheral: Noble.Peripheral, noble: typeof Noble) {
    super()
    this._peripheral = peripheral
    this._noble = noble

    Advertising.parse(peripheral, this.emitLog.bind(this)).then((ad) => {
      this._id = ad?.id ?? ''
      this._address = ad?.address ?? ''
      this._model = ad?.serviceData.model as SwitchBotBLEModel ?? ''
      this._modelName = ad?.serviceData.modelName as SwitchBotBLEModelName ?? ''
    })
  }

  /**
   * Emits a log event with the specified log level and message.
   *
   * @param level - The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message - The log message to be emitted.
   */
  public async emitLog(level: string, message: string): Promise<void> {
    this.emit('log', { level, message })
  }

  // Getters
  get id(): string {
    return this._id
  }

  get address(): string {
    return this._address
  }

  get model(): SwitchBotBLEModel {
    return this._model
  }

  get modelName(): SwitchBotBLEModelName {
    return this._modelName
  }

  get connectionState(): string {
    return this._connected ? 'connected' : this._peripheral.state
  }

  get onconnect(): () => Promise<void> {
    return this.onconnect_internal
  }

  set onconnect(func: () => Promise<void>) {
    if (typeof func !== 'function') {
      throw new TypeError('The `onconnect` must be a function that returns a Promise<void>.')
    }
    this.onconnect_internal = async () => {
      await func()
    }
  }

  get ondisconnect(): () => Promise<void> {
    return this.ondisconnect_internal
  }

  set ondisconnect(func: () => Promise<void>) {
    if (typeof func !== 'function') {
      throw new TypeError('The `ondisconnect` must be a function that returns a Promise<void>.')
    }
    this.ondisconnect_internal = async () => {
      await func()
    }
  }

  /**
   * Connects to the device.
   * @returns A Promise that resolves when the connection is complete.
   */
  async connect(): Promise<void> {
    this._explicitly = true
    await this.connect_internal()
  }

  /**
   * Internal method to handle the connection process.
   * @returns A Promise that resolves when the connection is complete.
   */
  private async connect_internal(): Promise<void> {
    if (this._noble._state !== 'poweredOn') {
      throw new Error(`The Bluetooth status is ${this._noble._state}, not poweredOn.`)
    }

    const state = this.connectionState
    if (state === 'connected') {
      return
    }
    if (state === 'connecting' || state === 'disconnecting') {
      throw new Error(`Now ${state}. Wait for a few seconds then try again.`)
    }

    this._peripheral.once('connect', async () => {
      this._connected = true
      await this.onconnect()
    })

    this._peripheral.once('disconnect', async () => {
      this._connected = false
      this._characteristics = null
      this._peripheral.removeAllListeners()
      await this.ondisconnect_internal()
    })

    await this._peripheral.connectAsync()
    this._characteristics = await this.getCharacteristics()
    await this.subscribe()
  }

  /**
   * Retrieves the device characteristics.
   * @returns A Promise that resolves with the device characteristics.
   */
  public async getCharacteristics(): Promise<Chars> {
    const timer = setTimeout(() => {
      throw new Error('Failed to discover services and characteristics: TIMEOUT')
    }, 5000)

    try {
      const services = await this.discoverServices()
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
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Discovers the device services.
   * @returns A Promise that resolves with the list of services.
   */
  public async discoverServices(): Promise<Noble.Service[]> {
    try {
      const services = await this._peripheral.discoverServicesAsync([])
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
  private async subscribe(): Promise<void> {
    const char = this._characteristics?.notify
    if (!char) {
      throw new Error('No notify characteristic was found.')
    }
    await char.subscribeAsync()
    char.on('data', this.onnotify_internal)
  }

  /**
   * Unsubscribes from the notify characteristic.
   * @returns A Promise that resolves when the unsubscription is complete.
   */
  async unsubscribe(): Promise<void> {
    const char = this._characteristics?.notify
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
    this._explicitly = false
    const state = this._peripheral.state

    if (state === 'disconnected') {
      return
    }
    if (state === 'connecting' || state === 'disconnecting') {
      throw new Error(`Now ${state}. Wait for a few seconds then try again.`)
    }

    await this.unsubscribe()
    await this._peripheral.disconnectAsync()
  }

  /**
   * Internal method to handle disconnection if not explicitly initiated.
   * @returns A Promise that resolves when the disconnection is complete.
   */
  private async disconnect_internal(): Promise<void> {
    if (!this._explicitly) {
      await this.disconnect()
      this._explicitly = true
    }
  }

  /**
   * Retrieves the device name.
   * @returns A Promise that resolves with the device name.
   */
  async getDeviceName(): Promise<string> {
    await this.connect_internal()
    if (!this._characteristics?.device) {
      throw new Error(`The device does not support the characteristic UUID 0x${CHAR_UUID_DEVICE}.`)
    }
    const buf = await this.read(this._characteristics.device)
    await this.disconnect_internal()
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
    await this.connect_internal()
    if (!this._characteristics?.device) {
      throw new Error(`The device does not support the characteristic UUID 0x${CHAR_UUID_DEVICE}.`)
    }
    await this.write(this._characteristics.device, buf)
    await this.disconnect_internal()
  }

  /**
   * Sends a command to the device and awaits a response.
   * @param req_buf The command buffer.
   * @returns A Promise that resolves with the response buffer.
   */
  async command(req_buf: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(req_buf)) {
      throw new TypeError('The specified data is not acceptable for writing.')
    }

    await this.connect_internal()
    if (!this._characteristics?.write) {
      throw new Error('No characteristics available.')
    }

    await this.write(this._characteristics.write, req_buf)
    const res_buf = await this._waitCommandResponseAsync()
    await this.disconnect_internal()

    return res_buf
  }

  /**
   * Waits for a response from the device after sending a command.
   * @returns A Promise that resolves with the response buffer.
   */
  private async _waitCommandResponseAsync(): Promise<Buffer> {
    const timeout = READ_TIMEOUT_MSEC
    let timer: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('READ_TIMEOUT')), timeout)
    })

    const readPromise = new Promise<Buffer>((resolve) => {
      this.onnotify_internal = (buf: Buffer) => {
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
  private async read(char: Noble.Characteristic): Promise<Buffer> {
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
  private async write(char: Noble.Characteristic, buf: Buffer): Promise<void> {
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
