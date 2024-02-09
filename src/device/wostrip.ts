import { Buffer } from 'buffer';

import { SwitchbotDevice } from '../switchbot.js';

export async function parseServiceDataForWoStrip(buf, onlog) {
  if (buf.length !== 18) {
    if (onlog && typeof onlog === 'function') {
      onlog(
        `[parseServiceDataForWoStrip] Buffer length ${buf.length} !== 18!`,
      );
    }
    return null;
  }

  //const byte1 = buf.readUInt8(1);//power and light status
  //const byte2 = buf.readUInt8(2);//bulb brightness
  const byte3 = buf.readUInt8(3);//bulb R
  const byte4 = buf.readUInt8(4);//bulb G
  const byte5 = buf.readUInt8(5);//bulb B
  const byte7 = buf.readUInt8(7);
  const byte8 = buf.readUInt8(8);
  const byte9 = buf.readUInt8(9);
  const byte10 = buf.readUInt8(10);

  const state = byte7 & 0b10000000 ? true : false;
  const brightness = byte7 & 0b01111111;
  const red = byte3;
  const green = byte4;
  const blue = byte5;
  const delay = byte8 & 0b10000000;
  const preset = byte8 & 0b00001000;
  const color_mode = byte8 & 0b00000111;
  const speed = byte9 & 0b01111111;
  const loop_index = byte10 & 0b11111110;

  const data = {
    model: 'r',
    modelName: 'WoStrip',
    state: state,
    brightness: brightness,
    red: red,
    green: green,
    blue: blue,
    delay: delay,
    preset: preset,
    color_mode: color_mode,
    speed: speed,
    loop_index: loop_index,
  };

  return data;
}

/**
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/tree/latest/devicetypes
 */
export class WoStrip extends SwitchbotDevice {
  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  readState() {
    return this._operateBot([0x57, 0x0f, 0x4A, 0x01]);
  }

  /**
   * @private
   */
  _setState(reqByteArray) {
    const base = [0x57, 0x0f, 0x49, 0x01];
    return this._operateBot([...base, ...reqByteArray]);
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
            'The type of target brightness percentage is incorrect: ' +
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
   * @returns {Promise<number>} resolves with color temperature
   */
  setColorTemperature(color_temperature) {
    if (color_temperature) {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'Strip Light Doesn\'t Support Color temperature: ' +
              typeof color_temperature,
          ),
        );
      });
    }
  }

  /**
   * @returns {Promise<number>} resolves with brightness + rgb
   */
  setRGB(brightness, red, green, blue) {
    if (typeof brightness !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target brightness percentage is incorrect: ' +
              typeof brightness,
          ),
        );
      });
    }
    if (typeof red !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target red is incorrect: ' +
              typeof red,
          ),
        );
      });
    }
    if (typeof green !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target green is incorrect: ' +
              typeof green,
          ),
        );
      });
    }
    if (typeof blue !== 'number') {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            'The type of target blue is incorrect: ' +
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
          const res_buf = Buffer.from(res_bytes as ArrayBuffer | SharedArrayBuffer);
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
