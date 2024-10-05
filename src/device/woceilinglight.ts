/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woceilinglight.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoCeilingLight device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/colorbulb.md
 */
export class WoCeilingLight extends SwitchbotDevice {
  /**
   * Parses the service data for WoCeilingLight.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<object | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<object | null> {
    if (manufacturerData.length !== 13) {
      emitLog('debugerror', `[parseServiceDataForWoCeilingLight] Buffer length ${manufacturerData.length} !== 13!`)
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
      model: SwitchBotBLEModel.CeilingLight,
      modelName: SwitchBotBLEModelName.CeilingLight,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLight,
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
   * Parses the service data for WoCeilingLight Pro.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<object | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData_Pro(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<object | null> {
    if (manufacturerData.length !== 13) {
      emitLog('debugerror', `[parseServiceDataForWoCeilingLightPro] Buffer length ${manufacturerData.length} !== 13!`)
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
      model: SwitchBotBLEModel.CeilingLightPro,
      modelName: SwitchBotBLEModelName.CeilingLightPro,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLightPro,
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
   * Reads the state of the ceiling light.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the light is ON (true) or OFF (false).
   */
  async readState(): Promise<boolean> {
    return this.operateCeilingLight([0x57, 0x0F, 0x48, 0x01])
  }

  /**
   * Sets the state of the ceiling light.
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x47, 0x01]
    return this.operateCeilingLight(base.concat(reqByteArray))
  }

  /**
   * Turns on the ceiling light.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the light is ON (true).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x01])
  }

  /**
   * Turns off the ceiling light.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the light is OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x02])
  }

  /**
   * Sets the brightness of the ceiling light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setBrightness(brightness: number): Promise<boolean> {
    if (typeof brightness !== 'number' || brightness < 0 || brightness > 100) {
      throw new TypeError(`Invalid brightness value: ${brightness}`)
    }
    return this.setState([0x02, 0x14, brightness])
  }

  /**
   * Sets the color temperature of the ceiling light.
   * @param {number} color_temperature - The color temperature percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setColorTemperature(color_temperature: number): Promise<boolean> {
    if (typeof color_temperature !== 'number' || color_temperature < 0 || color_temperature > 100) {
      throw new TypeError(`Invalid color temperature value: ${color_temperature}`)
    }
    return this.setState([0x02, 0x17, color_temperature])
  }

  /**
   * Sets the RGB color of the ceiling light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @param {number} red - The red color value (0-255).
   * @param {number} green - The green color value (0-255).
   * @param {number} blue - The blue color value (0-255).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setRGB(brightness: number, red: number, green: number, blue: number): Promise<boolean> {
    if (
      typeof brightness !== 'number' || brightness < 0 || brightness > 100
      || typeof red !== 'number' || red < 0 || red > 255
      || typeof green !== 'number' || green < 0 || green > 255
      || typeof blue !== 'number' || blue < 0 || blue > 255
    ) {
      throw new TypeError('Invalid RGB or brightness values')
    }
    return this.setState([0x02, 0x12, brightness, red, green, blue])
  }

  /**
   * Sends a command to the ceiling light.
   * @param {number[]} bytes - The command bytes.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  public async operateCeilingLight(bytes: number[]): Promise<boolean> {
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
