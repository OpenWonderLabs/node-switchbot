/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wosensorth.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { meterPlusServiceData, meterServiceData } from '../types/bledevicestatus.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';
import type { Buffer } from 'node:buffer'

export class WoSensorTH extends SwitchbotDevice {
  static async parseServiceData(
    serviceData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<meterServiceData | null> {
    if (serviceData.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoSensorTH] Buffer length ${serviceData.length} !== 6!`);
      }
      return null
    }
    const byte2 = serviceData.readUInt8(2);
    const byte3 = serviceData.readUInt8(3);
    const byte4 = serviceData.readUInt8(4);
    const byte5 = serviceData.readUInt8(5);

    const temp_sign = byte4 & 0b10000000 ? 1 : -1
    const temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10

    const data: meterServiceData = {
      model: SwitchBotBLEModel.Meter,
      modelName: SwitchBotBLEModelName.Meter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter,
      /**
       * @deprecated The `temperature` object is deprecated and will be removed in future versions.
       * Use the `celcius` and `fahrenheit` properties directly instead.
       */
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      celcius: temp_c,
      fahrenheit: temp_f,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }

    return data
  }

  static async parseServiceData_Plus(
    serviceData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<meterPlusServiceData | null> {
    if (serviceData.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoSensorTHPlus] Buffer length ${serviceData.length} !== 6!`);
      }
      return null
    }
    const byte2 = serviceData.readUInt8(2);
    const byte3 = serviceData.readUInt8(3);
    const byte4 = serviceData.readUInt8(4);
    const byte5 = serviceData.readUInt8(5);

    const temp_sign = byte4 & 0b10000000 ? 1 : -1
    const temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10

    const data: meterPlusServiceData = {
      model: SwitchBotBLEModel.MeterPlus,
      modelName: SwitchBotBLEModelName.MeterPlus,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPlus,
      /**
       * @deprecated The `temperature` object is deprecated and will be removed in future versions.
       * Use the `celcius` and `fahrenheit` properties directly instead.
       */
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      celcius: temp_c,
      fahrenheit: temp_f,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }

    return data
  }
}
