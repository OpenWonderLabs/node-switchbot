/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wobulb.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoBulb device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/colorbulb.md
 */
export class WoBulb extends SwitchbotDevice {
  /**
   * Parses the service data for WoBulb.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} [onlog] - Optional logging function.
   * @returns {Promise<object | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    onlog?: (message: string) => void,
  ): Promise<object | null> {
    if (serviceData.length !== 18) {
      onlog?.(`[parseServiceDataForWoBulb] Buffer length ${serviceData.length} !== 18!`)
      return null
    }
    if (manufacturerData.length !== 13) {
      onlog?.(`[parseServiceDataForWoBulb] Buffer length ${manufacturerData.length} !== 13!`)
      return null
    }

    const [
      , byte1, ,
      byte3,
      byte4,
      byte5,
      byte6,
      byte7,
      byte8,
      byte9,
      byte10,
    ] = manufacturerData

    return {
      model: SwitchBotBLEModel.ColorBulb,
      modelName: SwitchBotBLEModelName.ColorBulb,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ColorBulb,
      power: byte1,
      red: byte3,
      green: byte4,
      blue: byte5,
      color_temperature: byte6,
      state: !!(byte7 & 0b01111111),
      brightness: byte7 & 0b01111111,
      delay: !!(byte8 & 0b10000000),
      preset: !!(byte8 & 0b00001000),
      color_mode: byte8 & 0b00000111,
      speed: byte9 & 0b01111111,
      loop_index: byte10 & 0b11111110,
    }
  }

  /**
   * Reads the state of the bulb.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the bulb is ON (true) or OFF (false).
   */
  async readState(): Promise<boolean> {
    return this.operateBulb([0x57, 0x0F, 0x48, 0x01])
  }

  /**
   * Sets the state of the bulb.
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   * @private
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x47, 0x01]
    return this.operateBulb(base.concat(reqByteArray))
  }

  /**
   * Turns on the bulb.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the bulb is ON (true).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x01])
  }

  /**
   * Turns off the bulb.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the bulb is OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x02])
  }

  /**
   * Sets the brightness of the bulb.
   * @param {number} brightness - The brightness percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setBrightness(brightness: number): Promise<boolean> {
    if (brightness < 0 || brightness > 100) {
      throw new RangeError('Brightness must be between 0 and 100')
    }
    return this.setState([0x02, 0x14, brightness])
  }

  /**
   * Sets the color temperature of the bulb.
   * @param {number} color_temperature - The color temperature percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setColorTemperature(color_temperature: number): Promise<boolean> {
    if (color_temperature < 0 || color_temperature > 100) {
      throw new RangeError('Color temperature must be between 0 and 100')
    }
    return this.setState([0x02, 0x17, color_temperature])
  }

  /**
   * Sets the RGB color of the bulb.
   * @param {number} brightness - The brightness percentage (0-100).
   * @param {number} red - The red color value (0-255).
   * @param {number} green - The green color value (0-255).
   * @param {number} blue - The blue color value (0-255).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setRGB(brightness: number, red: number, green: number, blue: number): Promise<boolean> {
    if (brightness < 0 || brightness > 100 || red < 0 || red > 255 || green < 0 || green > 255 || blue < 0 || blue > 255) {
      throw new RangeError('Invalid RGB or brightness values')
    }
    return this.setState([0x02, 0x12, brightness, red, green, blue])
  }

  /**
   * Sends a command to the bulb.
   * @param {number[]} bytes - The command bytes.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   * @private
   */
  private async operateBulb(bytes: number[]): Promise<boolean> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    if (resBuf.length === 2) {
      const code = resBuf.readUInt8(1)
      if (code === 0x00 || code === 0x80) {
        return code === 0x80
      }
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
    throw new Error(`Expecting a 2-byte response, got instead: 0x${resBuf.toString('hex')}`)
  }
}
