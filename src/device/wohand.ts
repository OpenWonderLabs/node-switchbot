/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohand.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';

export class WoHand extends SwitchbotDevice {
  static async parseServiceData(
    serviceData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<object | null> {
    if (serviceData.length !== 3) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceData] Buffer length ${serviceData.length} !== 3!`);
      }
      return null;
    }
    const byte1 = serviceData.readUInt8(1);
    const byte2 = serviceData.readUInt8(2);

    const mode = byte1 & 0b10000000 ? true : false; // Whether the light switch Add-on is used or not. 0 = press, 1 = switch
    const state = byte1 & 0b01000000 ? false : true; // Whether the switch status is ON or OFF. 0 = on, 1 = off
    const battery = byte2 & 0b01111111; // %

    const data = {
      model: SwitchBotBLEModel.Bot,
      modelName: SwitchBotBLEModelName.Bot,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Bot,
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
  async press() {
    return await this.operateBot([0x57, 0x01, 0x00]);
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
  async turnOn() {
    return await this.operateBot([0x57, 0x01, 0x01]);
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
  async turnOff() {
    return await this.operateBot([0x57, 0x01, 0x02]);
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
  async down() {
    return await this.operateBot([0x57, 0x01, 0x03]);
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
  async up() {
    return await this.operateBot([0x57, 0x01, 0x04]);
  }

  async operateBot(bytes: number[]) {
    const req_buf = Buffer.from(bytes);
    await this.command(req_buf)
      .then((res_buf) => {
        const code = res_buf.readUInt8(0);
        if (res_buf.length === 3 && (code === 0x01 || code === 0x05)) {
          return;
        } else {
          throw new Error('The device returned an error: 0x' + res_buf.toString('hex'));
        }
      })
      .catch ((error) => {
        throw error;
      });
  }
}
