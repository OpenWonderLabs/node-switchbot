/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woblindtilt.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types.js';

export class WoBlindTilt extends SwitchbotDevice {
  static parseServiceData(buf: Buffer, onlog: ((message: string) => void) | undefined) {
    if (buf.length !== 5 && buf.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoBlindTilt] Buffer length ${buf.length} !== 5 or 6!`,
        );
      }
      return null;
    }
    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);

    const calibration = byte1 & 0b00000001 ? true : false; // Whether the calibration is completed
    const battery = byte2 & 0b01111111; // %
    const inMotion = byte2 & 0b10000000 ? true : false;
    const tilt = byte2 & 0b01111111; // current tilt % (100 - _tilt) if reverse else _tilt,
    const lightLevel = (byte1 >> 4) & 0b00001111; // light sensor level (1-10)

    const data = {
      model: SwitchBotBLEModel.BlindTilt,
      modelName: SwitchBotBLEModelName.BlindTilt,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.BlindTilt,
      calibration: calibration,
      battery: battery,
      inMotion: inMotion,
      tilt: tilt,
      lightLevel: lightLevel,
    };

    return data;
  }

  /* ------------------------------------------------------------------
   * open()
   * - Open the blindtilt
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  open() {
    return this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0x00]);
  }

  /* ------------------------------------------------------------------
   * close()
   * - close the blindtilt
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  close() {
    return this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0x64]);
  }

  /* ------------------------------------------------------------------
   * pause()
   * - pause the blindtilt
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  pause() {
    return this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x00, 0xff]);
  }

  /* ------------------------------------------------------------------
   * runToPos()
   * - run to the targe position
   *
   * [Arguments]
   * - percent | number | Required | the percentage of target position
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  runToPos(percent: number, mode: number) {
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
    if (mode === null) {
      mode = 0xff;
    } else {
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
    }
    if (percent > 100) {
      percent = 100;
    } else if (percent < 0) {
      percent = 0;
    }
    return this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x05, mode, percent]);
  }

  _operateBlindTilt(bytes: number[]) {
    return new Promise<void>((resolve, reject) => {
      const req_buf = Buffer.from(bytes);
      this._command(req_buf)
        .then((res_buf) => {
          const code = res_buf.readUInt8(0);
          if (res_buf.length === 3 && code === 0x01) {
            resolve();
          } else {
            reject(
              new Error(
                'The device returned an error: 0x' + res_buf.toString('hex'),
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
