/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohand.ts: Switchbot BLE API registration.
 */
import type * as Noble from '@stoprocent/noble'

import type { botServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoHand device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/bot.md
 */
export class WoHand extends SwitchbotDevice {
  /**
   * Parses the service data for WoHand.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<object | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<botServiceData | null> {
    if (serviceData.length !== 3) {
      emitLog('debugerror', `[parseServiceData] Buffer length ${serviceData.length} !== 3!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte2 = serviceData.readUInt8(2)

    const data: botServiceData = {
      model: SwitchBotBLEModel.Bot,
      modelName: SwitchBotBLEModelName.Bot,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Bot,
      mode: (!!(byte1 & 0b10000000)).toString(), // Whether the light switch Add-on is used or not. 0 = press, 1 = switch
      state: !(byte1 & 0b01000000), // Whether the switch status is ON or OFF. 0 = on, 1 = off
      battery: byte2 & 0b01111111, // %
    }

    return data
  }

  constructor(peripheral: Noble.Peripheral, noble: typeof Noble) {
    super(peripheral, noble)
  }

  /**
   * Sends a command to the bot.
   * @param {number[]} reqBuf - The command bytes.
   * @returns {Promise<void>}
   */
  protected async sendCommand(reqBuf: Buffer): Promise<void> {
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Presses the bot.
   * @returns {Promise<void>}
   */
  public async press(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x00]))
  }

  /**
   * Turns on the bot.
   * @returns {Promise<void>}
   */
  public async turnOn(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x01]))
  }

  /**
   * Turns off the bot.
   * @returns {Promise<void>}
   */
  public async turnOff(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x02]))
  }

  /**
   * Moves the bot down.
   * @returns {Promise<void>}
   */
  public async down(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x03]))
  }

  /**
   * Moves the bot up.
   * @returns {Promise<void>}
   */
  public async up(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x04]))
  }
}
