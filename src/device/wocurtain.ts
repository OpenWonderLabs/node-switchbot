/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wocurtain.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'buffer';

import { SwitchbotDevice } from '../switchbot.js';

export class WoCurtain extends SwitchbotDevice {
  static parseServiceData(buf, onlog) {
    if (buf.length !== 5 && buf.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoCurtain] Buffer length ${buf.length} !== 5 or 6!`,
        );
      }
      return null;
    }
    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte4 = buf.readUInt8(4);

    const calibration = byte1 & 0b01000000 ? true : false; // Whether the calibration is compconsted
    const battery = byte2 & 0b01111111; // %
    const inMotion = byte3 & 0b10000000 ? true : false;
    const currPosition = byte3 & 0b01111111; // current positon %
    const lightLevel = (byte4 >> 4) & 0b00001111; // light sensor level (1-10)
    const deviceChain = byte4 & 0b00000111;
    const model = buf.slice(0, 1).toString('utf8');

    const data = {
      model: model,
      modelName: 'WoCurtain',
      calibration: calibration,
      battery: battery,
      inMotion: inMotion,
      position: currPosition,
      lightLevel: lightLevel,
      deviceChain: deviceChain,
    };

    return data;
  }

  /* ------------------------------------------------------------------
   * open()
   * - Open the curtain
   *
   * [Arguments]
   * - mode | number | Optional | runing mode (0x01 = QuietDrift, 0xff = Default)
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  open(mode) {
    return this.runToPos(0, mode);
  }

  /* ------------------------------------------------------------------
   * close()
   * - close the curtain
   *
   * [Arguments]
   * - mode | number | Optional | runing mode (0x01 = QuietDrift, 0xff = Default)
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  close(mode) {
    return this.runToPos(100, mode);
  }

  /* ------------------------------------------------------------------
   * pause()
   * - pause the curtain
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  pause() {
    return this._operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x00, 0xff]);
  }

  /* ------------------------------------------------------------------
   * runToPos()
   * - run to the target position
   *
   * [Arguments]
   * - percent | number | Required  | the percentage of target position
   * - mode    | number | Optional | runing mode (0x01 = QuietDrift, 0xff = Default)
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  runToPos(percent, mode = 0xff) {
    if (typeof percent !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target position percentage is incorrect: ' +
            typeof percent,
          ),
        );
      });
    }
    if (typeof mode !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error('The type of running mode is incorrect: ' + typeof mode),
        );
      });
    }
    if (mode > 1) {
      mode = 0xff;
    }
    if (percent > 100) {
      percent = 100;
    } else if (percent < 0) {
      percent = 0;
    }
    return this._operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x05, mode, percent]);
  }

  _operateCurtain(bytes) {
    return new Promise<void>((resolve, reject) => {
      const req_buf = Buffer.from(bytes);
      this._command(req_buf)
        .then((res_buf: unknown) => {
          const code = (res_buf as Buffer).readUInt8(0);
          if ((res_buf as Buffer).length === 3 && code === 0x01) {
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
