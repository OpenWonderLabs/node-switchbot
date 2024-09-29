/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohub2.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoHub2 device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoHub2 extends SwitchbotDevice {
  /**
   * Parses the service data for WoHub2.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} [onlog] - Optional logging function.
   * @returns {Promise<object | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    onlog?: (message: string) => void,
  ): Promise<object | null> {
    if (manufacturerData.length !== 16) {
      onlog?.(`[parseServiceDataForWoHub2] Buffer length ${manufacturerData.length} !== 16!`)
      return null
    }

    const [byte0, byte1, byte2, , , , , , , , , , byte12] = manufacturerData

    const tempSign = byte1 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte1 & 0b01111111) + (byte0 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10
    const lightLevel = byte12 & 0b11111

    return {
      model: SwitchBotBLEModel.Hub2,
      modelName: SwitchBotBLEModelName.Hub2,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub2,
      /**
       * @deprecated The `temperature` object is deprecated and will be removed in future versions.
       * Use the `celsius` and `fahrenheit` properties directly instead.
       */
      temperature: {
        c: tempC,
        f: tempF,
      },
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte2 & 0b10000000),
      humidity: byte2 & 0b01111111,
      lightLevel,
    }
  }
}
