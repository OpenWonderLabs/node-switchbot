/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wobulb.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'buffer';

import { SwitchbotDevice } from '../switchbot.js';

/**
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/colorbulb.md
 */
export class WoBulb extends SwitchbotDevice {
  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  readState() {
    return this._operateBot([0x57, 0x0f, 0x48, 0x01]);
  }

  /**
   * @private
   */
  _setState(reqByteArray) {
    const base = [0x57, 0x0f, 0x47, 0x01];
    return this._operateBot([].concat(base, reqByteArray));
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  turnOn() {
    return this._setState([0x01, 0x01]);
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  turnOff() {
    return this._setState([0x01, 0x02]);
  }

  /**
   * @returns {Promise<number>} resolves with brightness percent
   */
  setBrightness(brightness) {
    if (typeof brightness !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target brightness percentage is incorrent: ' +
              typeof brightness,
          ),
        );
      });
    }
    if (brightness > 100) {
      brightness = 100;
    } else if (brightness < 0) {
      brightness = 0;
    }
    return this._setState([0x02, 0x14]);
  }

  /**
   * @returns {Promise<number>} resolves with brightness percent
   */
  setColorTemperature(color_temperature) {
    if (typeof color_temperature !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target brightness percentage is incorrent: ' +
              typeof brightness,
          ),
        );
      });
    }
    if (color_temperature > 100) {
      color_temperature = 100;
    } else if (color_temperature < 0) {
      color_temperature = 0;
    }
    return this._setState([0x02, 0x17, color_temperature]);
  }

  /**
   * @returns {Promise<number>} resolves with brightness percent
   */
  setRGB(brightness, red, green, blue) {
    if (typeof brightness !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target brightness percentage is incorrent: ' +
              typeof brightness,
          ),
        );
      });
    }
    if (typeof red !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target red is incorrent: ' +
              typeof red,
          ),
        );
      });
    }
    if (typeof green !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target green is incorrent: ' +
              typeof green,
          ),
        );
      });
    }
    if (typeof blue !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target blue is incorrent: ' +
              typeof blue,
          ),
        );
      });
    }
    if (brightness > 100) {
      brightness = 100;
    } else if (brightness < 0) {
      brightness = 0;
    }
    if (red > 255) {
      red = 255;
    } else if (red < 0) {
      red = 0;
    }
    if (green > 255) {
      green = 255;
    } else if (green < 0) {
      green = 0;
    }
    if (blue > 255) {
      blue = 255;
    } else if (blue < 0) {
      blue = 0;
    }
    return this._setState([0x02, 0x12, brightness, red, green, blue]);
  }

  /**
   * @private
   */
  _operateBot(bytes) {
    const req_buf = Buffer.from(bytes);
    return new Promise((resolve, reject) => {
      this._command(req_buf)
        .then((res_bytes) => {
          const res_buf = Buffer.from(res_bytes);
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
