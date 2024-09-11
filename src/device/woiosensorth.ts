/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woiosensorth.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types.js'

export class WoIOSensorTH extends SwitchbotDevice {
  static parseServiceData(serviceDataBuf: Buffer, manufacturerDataBuf: Buffer, onlog: ((message: string) => void) | undefined) {
    if (serviceDataBuf.length !== 3) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoIOSensorTH] Service Data Buffer length ${serviceDataBuf.length} !== 3!`,
        )
      }
      return null
    }
    if (manufacturerDataBuf.length !== 14) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoIOSensorTH] Manufacturer Data Buffer length ${manufacturerDataBuf.length} !== 14!`,
        )
      }
      return null
    }
    const mdByte10 = manufacturerDataBuf.readUInt8(10)
    const mdByte11 = manufacturerDataBuf.readUInt8(11)
    const mdByte12 = manufacturerDataBuf.readUInt8(12)

    const sdByte2 = serviceDataBuf.readUInt8(2)

    const temp_sign = mdByte11 & 0b10000000 ? 1 : -1
    const temp_c = temp_sign * ((mdByte11 & 0b01111111) + (mdByte10 & 0b00001111) / 10)
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10

    const data = {
      model: SwitchBotBLEModel.OutdoorMeter,
      modelName: SwitchBotBLEModelName.OutdoorMeter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.OutdoorMeter,
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      celsius: temp_c,
      fahrenheit: temp_f,
      fahrenheit_mode: !!(mdByte12 & 0b10000000),
      humidity: mdByte12 & 0b01111111,
      battery: sdByte2 & 0b01111111,
    }

    return data
  }
}
