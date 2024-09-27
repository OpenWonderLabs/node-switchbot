import type { Buffer } from 'node:buffer'

/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohub2.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

export class WoHub2 extends SwitchbotDevice {
  static async parseServiceData(
    manufacturerData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<object | null> {
    if (manufacturerData.length !== 16) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoSensorTH] Buffer length ${manufacturerData.length} !== 16!`)
      }
      return null
    }
    const byte0 = manufacturerData.readUInt8(0)
    const byte1 = manufacturerData.readUInt8(1)
    const byte2 = manufacturerData.readUInt8(2)
    const byte12 = manufacturerData.readUInt8(12)

    const temp_sign = byte1 & 0b10000000 ? 1 : -1
    const temp_c = temp_sign * ((byte1 & 0b01111111) + (byte0 & 0b00001111) / 10)
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10
    const light_level = byte12 & 0b11111

    const data = {
      model: SwitchBotBLEModel.Hub2,
      modelName: SwitchBotBLEModelName.Hub2,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub2,
      /**
       * @deprecated The `temperature` object is deprecated and will be removed in future versions.
       * Use the `celsius` and `fahrenheit` properties directly instead.
       */
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      celsius: temp_c,
      fahrenheit: temp_f,
      fahrenheit_mode: !!(byte2 & 0b10000000),
      humidity: byte2 & 0b01111111,
      lightLevel: light_level,
    }

    return data
  }
}
