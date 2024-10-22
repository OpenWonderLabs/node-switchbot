/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wostrip.ts: Switchbot BLE API registration.
 */
import type { stripLightServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoStrip device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/ledstriplight.md
 */
export class WoStrip extends SwitchbotDevice {
  /**
   * Parses the service data from the SwitchBot Strip Light.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<stripLightServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<stripLightServiceData | null> {
    if (serviceData.length !== 18) {
      emitLog('debugerror', `[parseServiceDataForWoStrip] Buffer length ${serviceData.length} !== 18!`)
      return null
    }

    const [byte3, byte4, byte5, byte7, byte8, byte9, byte10] = [
      serviceData.readUInt8(3),
      serviceData.readUInt8(4),
      serviceData.readUInt8(5),
      serviceData.readUInt8(7),
      serviceData.readUInt8(8),
      serviceData.readUInt8(9),
      serviceData.readUInt8(10),
    ]

    const data: stripLightServiceData = {
      model: SwitchBotBLEModel.StripLight,
      modelName: SwitchBotBLEModelName.StripLight,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.StripLight,
      power: !!(byte7 & 0b10000000),
      state: !!(byte7 & 0b10000000),
      brightness: byte7 & 0b01111111,
      red: byte3,
      green: byte4,
      blue: byte5,
      delay: byte8 & 0b10000000,
      preset: byte8 & 0b00001000,
      color_mode: byte8 & 0b00000111,
      speed: byte9 & 0b01111111,
      loop_index: byte10 & 0b11111110,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Reads the state of the strip light.
   * @returns {Promise<boolean>} - Resolves with true if the strip light is ON, false otherwise.
   */
  async readState(): Promise<boolean> {
    return this.operateStripLight([0x57, 0x0F, 0x4A, 0x01])
  }

  /**
   * Sets the state of the strip light.
   * @public
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x49, 0x01]
    return this.operateStripLight([...base, ...reqByteArray])
  }

  /**
   * Turns the strip light on.
   * @returns {Promise<boolean>} - Resolves with true if the strip light is ON.
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x01])
  }

  /**
   * Turns the strip light off.
   * @returns {Promise<boolean>} - Resolves with true if the strip light is OFF.
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x02])
  }

  /**
   * Sets the brightness of the strip light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setBrightness(brightness: number): Promise<boolean> {
    if (typeof brightness !== 'number' || brightness < 0 || brightness > 100) {
      throw new TypeError(`Invalid brightness value: ${brightness}`)
    }
    return this.setState([0x02, 0x14, brightness])
  }

  /**
   * Sets the RGB values of the strip light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @param {number} red - The red value (0-255).
   * @param {number} green - The green value (0-255).
   * @param {number} blue - The blue value (0-255).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setRGB(brightness: number, red: number, green: number, blue: number): Promise<boolean> {
    if (![brightness, red, green, blue].every(val => typeof val === 'number')) {
      throw new TypeError('Invalid RGB or brightness value')
    }

    brightness = Math.max(0, Math.min(100, brightness))
    red = Math.max(0, Math.min(255, red))
    green = Math.max(0, Math.min(255, green))
    blue = Math.max(0, Math.min(255, blue))

    return this.setState([0x02, 0x12, brightness, red, green, blue])
  }

  /**
   * Operates the strip light with the given byte array.
   * @public
   * @param {number[]} bytes - The byte array to send.
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  public async operateStripLight(bytes: number[]): Promise<boolean> {
    const req_buf = Buffer.from(bytes)
    const res_buf = await this.command(req_buf)

    if (res_buf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${res_buf.toString('hex')}`)
    }

    const code = res_buf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${res_buf.toString('hex')}`)
    }
  }
}
