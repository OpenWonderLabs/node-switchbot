/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wostrip.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { stripLightServiceData } from '../types/bledevicestatus.js';
import { SwitchBotBLEModel, SwitchBotBLEModelName, SwitchBotBLEModelFriendlyName } from '../types/types.js';
import { Buffer } from 'node:buffer'
 

/**
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/colorbulb.md
 */
export class WoStrip extends SwitchbotDevice {
  static async parseServiceData(
    serviceData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<stripLightServiceData | null> {
    if (serviceData.length !== 18) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoStrip] Buffer length ${serviceData.length} !== 18!`);
      }
      return null
    }

    const byte1 = serviceData.readUInt8(1);//power and light status
    const byte2 = serviceData.readUInt8(2);//bulb brightness 
    const byte3 = serviceData.readUInt8(3);//bulb R
    const byte4 = serviceData.readUInt8(4);//bulb G
    const byte5 = serviceData.readUInt8(5);//bulb B
    const byte7 = serviceData.readUInt8(7);
    const byte8 = serviceData.readUInt8(8);
    const byte9 = serviceData.readUInt8(9);
    const byte10 = serviceData.readUInt8(10);

    const power = !!(byte7 & 0b10000000)
    const state = !!(byte7 & 0b10000000)
    const brightness = byte7 & 0b01111111;
    const red = byte3;
    const green = byte4;
    const blue = byte5;
    const delay = byte8 & 0b10000000;
    const preset = byte8 & 0b00001000;
    const color_mode = byte8 & 0b00000111;
    const speed = byte9 & 0b01111111;
    const loop_index = byte10 & 0b11111110;

    const data: stripLightServiceData = {
      model: SwitchBotBLEModel.StripLight,
      modelName: SwitchBotBLEModelName.StripLight,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.StripLight,
      power: power,
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

    return data
  }

  /**
   * @returns resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  async readState() {
    return await this.operateStripLight([0x57, 0x0f, 0x4A, 0x01]);
  }

  /**
   * @private
   */
  async setState(reqByteArray: number[]) {
    const base = [0x57, 0x0f, 0x49, 0x01];
    return await this.operateStripLight([...base, ...reqByteArray]);
  }

  /**
   * @returns resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  async turnOn() {
    return await this.setState([0x01, 0x01]);
  }

  /**
   * @returns resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  async turnOff() {
    return await this.setState([0x01, 0x02]);
  }

  /**
   * @returns resolves with brightness percent
   */
  async setBrightness(brightness: number) {
    if (typeof brightness !== 'number') {
      throw new Error('The type of target brightness percentage is incorrect: ' + typeof brightness);
    }
    if (brightness > 100) {
      brightness = 100
    } else if (brightness < 0) {
      brightness = 0
    }
    return await this.setState([0x02, 0x14]);
  }

  /**
   * @returns resolves with color temperature
   */
  async setColorTemperature(color_temperature: unknown) {
    if (color_temperature) {
      throw new Error('Strip Light Doesn\'t Support Color temperature: ' + typeof color_temperature);
    }
  }

  /**
   * @returns resolves with brightness + rgb
   */
  async setRGB(brightness: number, red: number, green: number, blue: number) {
    if (typeof brightness !== 'number') {
      throw new Error('The type of target brightness percentage is incorrect: ' + typeof brightness);
    }
    if (typeof red !== 'number') {
      throw new Error('The type of target red is incorrect: ' + typeof red);
    }
    if (typeof green !== 'number') {
      throw new Error('The type of target green is incorrect: ' + typeof green);
    }
    if (typeof blue !== 'number') {
      throw new Error('The type of target blue is incorrect: ' + typeof blue);
    }
    if (brightness > 100) {
      brightness = 100
    } else if (brightness < 0) {
      brightness = 0
    }
    if (red > 255) {
      red = 255
    } else if (red < 0) {
      red = 0
    }
    if (green > 255) {
      green = 255
    } else if (green < 0) {
      green = 0
    }
    if (blue > 255) {
      blue = 255
    } else if (blue < 0) {
      blue = 0
    }
    return await this.setState([0x02, 0x12, brightness, red, green, blue]);
  }

  /**
   * @private
   */
  async operateStripLight(bytes: number[]) {
    const req_buf = Buffer.from(bytes);
    await this.command(req_buf)
      .then((res_bytes) => {
        const res_buf = Buffer.from(res_bytes);
        if (res_buf.length === 2) {
          const code = res_buf.readUInt8(1);
          if (code === 0x00 || code === 0x80) {
            const is_on = code === 0x80;
            return is_on;
          } else {
            throw new Error('The device returned an error: 0x' + res_buf.toString('hex'));
          }
        } else {
          throw new Error('Expecting a 2-byte response, got instead: 0x' + res_buf.toString('hex'));
        }
      })
      .catch((error) => {
        throw error;
      });
  }
}
