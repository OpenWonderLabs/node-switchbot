/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohand.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';

export class WoHand extends SwitchbotDevice {
  static parseServiceData(buf: Buffer, onlog: ((message: string) => void) | undefined) {
    if (buf.length !== 3) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceData] Buffer length ${buf.length} !== 3!`,
        );
      }
      return null;
    }
    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);

    const mode = byte1 & 0b10000000 ? true : false; // Whether the light switch Add-on is used or not. 0 = press, 1 = switch
    const state = byte1 & 0b01000000 ? false : true; // Whether the switch status is ON or OFF. 0 = on, 1 = off
    const battery = byte2 & 0b01111111; // %

    const data = {
      model: 'H',
      modelName: 'WoHand',
      mode: mode,
      state: state,
      battery: battery,
    };
    return data;
  }

  /* ------------------------------------------------------------------
   * press()
   * - Press
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  press() {
    return this._operateBot([0x57, 0x01, 0x00]);
  }

  /* ------------------------------------------------------------------
   * turnOn()
   * - Turn on
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  turnOn() {
    return this._operateBot([0x57, 0x01, 0x01]);
  }

  /* ------------------------------------------------------------------
   * turnOff()
   * - Turn off
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  turnOff() {
    return this._operateBot([0x57, 0x01, 0x02]);
  }

  /* ------------------------------------------------------------------
   * down()
   * - Down
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  down() {
    return this._operateBot([0x57, 0x01, 0x03]);
  }

  /* ------------------------------------------------------------------
   * up()
   * - Up
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  up() {
    return this._operateBot([0x57, 0x01, 0x04]);
  }

  _operateBot(bytes: number[]) {
    return new Promise<void>((resolve, reject) => {
      const req_buf = Buffer.from(bytes);
      this._command(req_buf)
        .then((res_buf: unknown) => {
          const code = (res_buf as Buffer).readUInt8(0);
          if ((res_buf as Buffer).length === 3 && (code === 0x01 || code === 0x05)) {
            resolve();
          } else {
            reject(
              new Error(
                'The device returned an error: 0x' + (res_buf as Buffer).toString('hex'),
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
