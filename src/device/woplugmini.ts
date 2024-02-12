/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woplugmini.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';

/**
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/plugmini.md
 */
export class WoPlugMini extends SwitchbotDevice {
  static parseServiceData_US(manufacturerData: Buffer, onlog: ((message: string) => void) | undefined) {
    if (manufacturerData.length !== 14) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoPlugMiniUS] Buffer length ${manufacturerData.length} should be 14`,
        );
      }
      return null;
    }
    const byte9 = manufacturerData.readUInt8(9); // byte9:  plug mini state; 0x00=off, 0x80=on
    const byte10 = manufacturerData.readUInt8(10); // byte10: bit0: 0=no delay,1=delay, bit1:0=no timer, 1=timer; bit2:0=no sync time, 1=sync'ed time
    const byte11 = manufacturerData.readUInt8(11); // byte11: wifi rssi
    const byte12 = manufacturerData.readUInt8(12); // byte12: bit7: overload?
    const byte13 = manufacturerData.readUInt8(13); // byte12[bit0~6] + byte13: current power value

    const state = byte9 === 0x00 ? 'off' : byte9 === 0x80 ? 'on' : null;
    const delay = !!(byte10 & 0b00000001);
    const timer = !!(byte10 & 0b00000010);
    const syncUtcTime = !!(byte10 & 0b00000100);
    const wifiRssi = byte11;
    const overload = !!(byte12 & 0b10000000);
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10; // in watt
    // TODO: voltage ???

    const data = {
      model: 'g',
      modelName: 'WoPlugMini',
      state: state,
      delay: delay,
      timer: timer,
      syncUtcTime: syncUtcTime,
      wifiRssi: wifiRssi,
      overload: overload,
      currentPower: currentPower,
    };

    return data;
  }

  static parseServiceData_JP(manufacturerData: Buffer, onlog: ((message: string) => void) | undefined) {
    if (manufacturerData.length !== 14) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoPlugMiniJP] Buffer length ${manufacturerData.length} should be 14`,
        );
      }
      return null;
    }
    const byte9 = manufacturerData.readUInt8(9); // byte9:  plug mini state; 0x00=off, 0x80=on
    const byte10 = manufacturerData.readUInt8(10); // byte10: bit0: 0=no delay,1=delay, bit1:0=no timer, 1=timer; bit2:0=no sync time, 1=sync'ed time
    const byte11 = manufacturerData.readUInt8(11); // byte11: wifi rssi
    const byte12 = manufacturerData.readUInt8(12); // byte12: bit7: overload?
    const byte13 = manufacturerData.readUInt8(13); // byte12[bit0~6] + byte13: current power value

    const state = byte9 === 0x00 ? 'off' : byte9 === 0x80 ? 'on' : null;
    const delay = !!(byte10 & 0b00000001);
    const timer = !!(byte10 & 0b00000010);
    const syncUtcTime = !!(byte10 & 0b00000100);
    const wifiRssi = byte11;
    const overload = !!(byte12 & 0b10000000);
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10; // in watt
    // TODO: voltage ???

    const data = {
      model: 'j',
      modelName: 'WoPlugMini',
      state: state,
      delay: delay,
      timer: timer,
      syncUtcTime: syncUtcTime,
      wifiRssi: wifiRssi,
      overload: overload,
      currentPower: currentPower,
    };

    return data;
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  readState() {
    return this._operateBot([0x57, 0x0f, 0x51, 0x01]);
  }

  /**
   * @private
   */
  _setState(reqByteArray: number[]) {
    const base = [0x57, 0x0f, 0x50, 0x01];
    return this._operateBot([...base, ...reqByteArray]);
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  turnOn() {
    return this._setState([0x01, 0x80]);
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  turnOff() {
    return this._setState([0x01, 0x00]);
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  toggle() {
    return this._setState([0x02, 0x80]);
  }

  /**
   * @private
   */
  _operateBot(bytes: number[]) {
    const req_buf = Buffer.from(bytes);
    return new Promise((resolve, reject) => {
      this._command(req_buf)
        .then((res_bytes) => {
          const res_buf = Buffer.from(res_bytes as Uint8Array);
          if (res_buf.length === 2) {
            const code = res_buf.readUInt8(1);
            if (code === 0x00 || code === 0x80) {
              const is_on = code === 0x80;
              resolve(is_on);
            } else {
              reject(
                new Error(
                  'The device returned an error: 0x' + res_buf.toString('hex'),
                ),
              );
            }
          } else {
            reject(
              new Error(
                'Expecting a 2-byte response, got instead: 0x' +
                  res_buf.toString('hex'),
              ),
            );
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}
