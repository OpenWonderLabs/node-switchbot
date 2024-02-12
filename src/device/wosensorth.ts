/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wosensorth.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';

export class WoSensorTH extends SwitchbotDevice {
  static parseServiceData(buf: Buffer, onlog: ((message: string) => void) | undefined) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoSensorTH] Buffer length ${buf.length} !== 6!`,
        );
      }
      return null;
    }
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte4 = buf.readUInt8(4);
    const byte5 = buf.readUInt8(5);

    const temp_sign = byte4 & 0b10000000 ? 1 : -1;
    const temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10);
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10;

    const data = {
      model: 'T',
      modelName: 'WoSensorTH',
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      fahrenheit: byte5 & 0b10000000 ? true : false,
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    };

    return data;
  }

  static parseServiceData_Plus(buf: Buffer, onlog: ((message: string) => void) | undefined) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoSensorTHPlus] Buffer length ${buf.length} !== 6!`,
        );
      }
      return null;
    }
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte4 = buf.readUInt8(4);
    const byte5 = buf.readUInt8(5);

    const temp_sign = byte4 & 0b10000000 ? 1 : -1;
    const temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10);
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10;

    const data = {
      model: 'i',
      modelName: 'WoSensorTHPlus',
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      fahrenheit: byte5 & 0b10000000 ? true : false,
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    };

    return data;
  }
}
