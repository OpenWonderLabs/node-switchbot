/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woiosensorth.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';

export class WoIOSensorTH extends SwitchbotDevice {
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<object | null> {
    if (serviceData.length !== 3) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoIOSensorTH] Service Data Buffer length ${serviceData.length} !== 3!`);
      }
      return null;
    }
    if (manufacturerData.length !== 14) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoIOSensorTH] Manufacturer Data Buffer length ${manufacturerData.length} !== 14!`);
      }
      return null;
    }
    const mdByte10 = manufacturerData.readUInt8(10);
    const mdByte11 = manufacturerData.readUInt8(11);
    const mdByte12 = manufacturerData.readUInt8(12);

    const sdByte2 = serviceData.readUInt8(2);

    const temp_sign = mdByte11 & 0b10000000 ? 1 : -1;
    const temp_c = temp_sign * ((mdByte11 & 0b01111111) + (mdByte10 & 0b00001111) / 10);
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10;

    const data = {
      model: SwitchBotBLEModel.OutdoorMeter,
      modelName: SwitchBotBLEModelName.OutdoorMeter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.OutdoorMeter,
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      fahrenheit: mdByte12 & 0b10000000 ? true : false, // needs to be confirmed!
      humidity: mdByte12 & 0b01111111,
      battery: sdByte2 & 0b01111111,
    };

    return data;
  }
}
