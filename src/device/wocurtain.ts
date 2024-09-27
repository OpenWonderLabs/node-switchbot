/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wocurtain.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';
import { Buffer } from 'node:buffer'

export class WoCurtain extends SwitchbotDevice {
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    onlog: ((message: string) => void) | undefined, reverse: boolean = false,
  ): Promise<object | null> {
    if (serviceData.length !== 5 && serviceData.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoCurtain] Buffer length ${serviceData.length} !== 5 or 6!`);
      }
      return null
    }

    const byte1 = serviceData.readUInt8(1);
    const byte2 = serviceData.readUInt8(2);
    //const byte3 = serviceData.readUInt8(3)
    //const byte4 = serviceData.readUInt8(4)

    let deviceData: Buffer;
    let batteryData: number | null = null;

    if (manufacturerData && manufacturerData.length >= 13) { // Curtain 3
      deviceData = manufacturerData.subarray(8, 11);
      batteryData = manufacturerData.readUInt8(12);
    } else if (manufacturerData && manufacturerData.length >= 11) {
      deviceData = manufacturerData.subarray(8, 11);
      batteryData = serviceData ? byte2 : null;
    } else if (serviceData) {
      deviceData = serviceData.subarray(3, 6);
      batteryData = byte2;
    } else {
      return {};
    }

    const model = serviceData.subarray(0, 1).toString('utf8');
    const modelName = model === 'c' ? SwitchBotBLEModelName.Curtain : SwitchBotBLEModelName.Curtain3;
    const modelFriendlyName = model === 'c' ? SwitchBotBLEModelFriendlyName.Curtain : SwitchBotBLEModelFriendlyName.Curtain3;
    const calibration = serviceData ? Boolean(byte1 & 0b01000000) : null; // Whether the calibration is compconsted /*OLD*/ const calibration = !!(byte1 & 0b01000000)
    const position = Math.max(Math.min(deviceData.readUInt8(0) & 0b01111111, 100), 0); // current positon % /*OLD*/ const currPosition = byte3 & 0b01111111 // current positon %
    const inMotion = Boolean(deviceData.readUInt8(0) & 0b10000000); //*OLD*/ const inMotion = !!(byte3 & 0b10000000)
    const lightLevel = (deviceData.readUInt8(1) >> 4) & 0b00001111; // light sensor level (1-10) /*OLD*/ const lightLevel = (byte4 >> 4) & 0b00001111
    const deviceChain = deviceData.readUInt8(1) & 0b00000111; //*OLD*/ const deviceChain = byte4 & 0b00000111
    const battery = batteryData !== null ? batteryData & 0b01111111 : null; //*OLD*/ const battery = byte2 & 0b01111111 // %

    const data = {
      model: model,
      modelName: modelName,
      modelFriendlyName: modelFriendlyName,
      calibration: calibration,
      battery: battery,
      inMotion: inMotion,
      position: reverse ? 100 - position : position, //*OLD*/ currPosition,
      lightLevel: lightLevel,
      deviceChain: deviceChain,
    };

    return data
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
  async open(mode?: number) {
    return await this.runToPos(0, mode);
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
  async close(mode?: number) {
    return await this.runToPos(100, mode);
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
  async pause() {
    return await this.operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x00, 0xff]);
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
  async runToPos(percent: number, mode = 0xff) {
    if (typeof percent !== 'number') {
      throw new Error('The type of target position percentage is incorrect: ' + typeof percent);
    }
    if (typeof mode !== 'number') {
      throw new Error('The type of running mode is incorrect: ' + typeof mode);
    }
    if (mode > 1) {
      mode = 0xFF
    }
    if (percent > 100) {
      percent = 100
    } else if (percent < 0) {
      percent = 0
    }
    return await this.operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x05, mode, percent]);
  }

  async operateCurtain(bytes: number[]) {
    const req_buf = Buffer.from(bytes);
    await this.command(req_buf)
      .then((res_buf) => {
        const code = res_buf.readUInt8(0);
        if (res_buf.length === 3 && code === 0x01) {
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
