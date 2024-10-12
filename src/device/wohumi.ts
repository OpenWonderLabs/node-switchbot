/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohumi.ts: Switchbot BLE API registration.
 */
import type * as Noble from '@stoprocent/noble'

import type { humidifierServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoHumi device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/tree/latest/devicetypes
 */
export class WoHumi extends SwitchbotDevice {
  /**
   * Parses the service data for WoHumi.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<humidifierServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<humidifierServiceData | null> {
    if (serviceData.length !== 8) {
      emitLog('debugerror', `[parseServiceDataForWoHumi] Buffer length ${serviceData.length} !== 8!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte4 = serviceData.readUInt8(4)

    const onState = !!(byte1 & 0b10000000) // 1 - on
    const autoMode = !!(byte4 & 0b10000000) // 1 - auto
    const percentage = byte4 & 0b01111111 // 0-100%, 101/102/103 - Quick gear 1/2/3
    const humidity = autoMode ? 0 : percentage === 101 ? 33 : percentage === 102 ? 66 : percentage === 103 ? 100 : percentage

    const data: humidifierServiceData = {
      model: SwitchBotBLEModel.Humidifier,
      modelName: SwitchBotBLEModelName.Humidifier,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier,
      onState,
      autoMode,
      percentage: autoMode ? 0 : percentage,
      humidity,
    }

    return data
  }

  constructor(peripheral: Noble.Peripheral, noble: typeof Noble) {
    super(peripheral, noble)
  }

  /**
   * Sends a command to the humidifier.
   * @param {number[]} bytes - The command bytes.
   * @returns {Promise<void>}
   */
  public async operateHumi(bytes: number[]): Promise<void> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Presses the humidifier button.
   * @returns {Promise<void>}
   */
  async press(): Promise<void> {
    await this.operateHumi([0x57, 0x01, 0x00])
  }

  /**
   * Turns on the humidifier.
   * @returns {Promise<void>}
   */
  async turnOn(): Promise<void> {
    await this.operateHumi([0x57, 0x01, 0x01])
  }

  /**
   * Turns off the humidifier.
   * @returns {Promise<void>}
   */
  async turnOff(): Promise<void> {
    await this.operateHumi([0x57, 0x01, 0x02])
  }

  /**
   * Decreases the humidifier setting.
   * @returns {Promise<void>}
   */
  async down(): Promise<void> {
    await this.operateHumi([0x57, 0x01, 0x03])
  }

  /**
   * Increases the humidifier setting.
   * @returns {Promise<void>}
   */
  async up(): Promise<void> {
    await this.operateHumi([0x57, 0x01, 0x04])
  }
}
