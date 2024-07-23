/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woblindtilt.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';

export class WoBlindTilt extends SwitchbotDevice {
  /**
   * Parses the service data and manufacturer data for the WoBlindTilt device.
   *
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {(message: string) => void} [onlog] - Optional logging function.
   * @param {boolean} [reverse=false] - Whether to reverse the tilt percentage.
   * @returns {object | null} The parsed data object or null if the data is invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    onlog: ((message: string) => void) | undefined,
    reverse: boolean = false,
  ): Promise<object | null> {
    if (manufacturerData.length !== 5 && manufacturerData.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoBlindTilt] Buffer length ${manufacturerData.length} !== 5 or 6!`);
      }
      return null;
    }

    const byte2 = serviceData.readUInt8(2);
    const byte6 = manufacturerData.subarray(6);

    const tilt = Math.max(Math.min(byte6.readUInt8(2) & 0b01111111, 100), 0); // current tilt % (100 - _tilt) if reverse else _tilt,
    const inMotion = byte6.readUInt8(2) & 0b10000000 ? true : false;
    const lightLevel = (byte6.readUInt8(1) >> 4) & 0b00001111; // light sensor level (1-10)
    const calibration = byte6.readUInt8(1) & 0b00000001 ? true : false; // Whether the calibration is completed
    const sequenceNumber = byte6.readUInt8(0);

    const battery = serviceData.length > 2 ? byte2 & 0b01111111 : null;

    const data = {
      model: SwitchBotBLEModel.BlindTilt,
      modelName: SwitchBotBLEModelName.BlindTilt,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.BlindTilt,
      calibration: calibration,
      battery: battery,
      inMotion: inMotion,
      tilt: reverse ? (100 - tilt) : tilt,
      lightLevel: lightLevel,
      sequenceNumber: sequenceNumber,
    };

    return data;
  }

  /**
   * open
   *
   * Opens the blind tilt to the fully open position.
   *
   * @returns {Promise<void>} - A promise that resolves when the operation is complete. Nothing will be passed to the `resolve()`.
   */
  async open() {
    return await this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0x32]);
  }

  /**
   * closeUp
   *
   * Closes the blind tilt up to the nearest endpoint.
   *
   * @returns {Promise<void>} - A promise that resolves when the operation is complete. Nothing will be passed to the `resolve()`.
   */
  async closeUp() {
    return await this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0x64]);
  }

  /**
   * closeDown
   *
   * Closes the blind tilt down to the nearest endpoint.
   *
   * @returns {Promise<void>} - A promise that resolves when the operation is complete. Nothing will be passed to the `resolve()`.
   */
  async closeDown() {
    return await this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0x00]);
  }

  /**
   * close
   *
   * Closes the blind tilt to the nearest endpoint.
   *
   * @returns {Promise<void>} - A promise that resolves when the operation is complete. Nothing will be passed to the `resolve()`.
   */
  async close(): Promise<void> {
    const position = await this.getPosition();
    if (position > 50) {
      return await this.closeUp();
    } else {
      return await this.closeDown();
    }
  }

  /**
   * getPosition
   *
   * Retrieves the current position of the blind tilt.
   *
   * @returns {number} - The current position of the blind tilt (0-100).
   */
  async getPosition(): Promise<number> {
    // Retrieve the current tilt position using the _getAdvValue method
    const tiltPosition = await this._getAdvValue('tilt');

    // Ensure the tilt position is within the valid range (0-100)
    return Math.max(0, Math.min(tiltPosition, 100));
  }

  /**
   * getBasicInfo
   *
   * Retrieves the basic information of the blind tilt.
   *
   * @returns {Promise<object>} - A promise that resolves to an object containing the basic information of the blind tilt.
   */
  async getBasicInfo() {
    const data = await this._getBasicInfo();
    if (!data) {
      return null;
    }

    const tilt = Math.max(Math.min(data[6], 100), 0);
    const moving = Boolean(data[5] & 0b00000011);
    let opening = false;
    let closing = false;
    let up = false;

    if (moving) {
      opening = Boolean(data[5] & 0b00000010);
      closing = !opening && Boolean(data[5] & 0b00000001);
      if (opening) {
        const flag = Boolean(data[5] & 0b00000001);
        up = flag ? this._reverse : !flag;
      } else {
        up = tilt < 50 ? this._reverse : tilt > 50;
      }
    }

    return {
      battery: data[1],
      firmware: data[2] / 10.0,
      light: Boolean(data[4] & 0b00100000),
      fault: Boolean(data[4] & 0b00001000),
      solarPanel: Boolean(data[5] & 0b00001000),
      calibration: Boolean(data[5] & 0b00000100),
      calibrated: Boolean(data[5] & 0b00000100),
      inMotion: moving,
      motionDirection: {
        opening: moving && opening,
        closing: moving && closing,
        up: moving && up,
        down: moving && !up,
      },
      tilt: this._reverse ? 100 - tilt : tilt,
      timers: data[7],
    };
  }

  /**
   * Pauses the blind tilt operation.
   *
   * This method sends a command to pause the current operation of the blind tilt.
   *
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   * No value is passed to the `resolve()` function.
   */
  async pause(): Promise<void> {
    await this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x00, 0xff]);
  }

  /**
   * runToPos the blind tilt operation.
   *
   * This method sends a command to run the blind tilt to the specified position.
   *
   * @param {number} percent - The target position percentage (0-100).
   * @param {number} mode - The running mode (0 or 1).
   * @returns {Promise<void>} - A promise that resolves when the operation is complete.
   */
  async runToPos(percent: number, mode: number): Promise<void> {
    if (typeof percent !== 'number') {
      throw new Error('The type of target position percentage is incorrect: ' + typeof percent);
    }
    if (mode === null) {
      mode = 0xff;
    } else {
      if (typeof mode !== 'number') {
        throw new Error('The type of running mode is incorrect: ' + typeof mode);
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
    await this._operateBlindTilt([0x57, 0x0f, 0x45, 0x01, 0x05, mode, percent]);
  }

  /**
 * Sends a command to operate the blind tilt and handles the response.
 *
 * This method constructs a buffer from the provided byte array and sends it as a command to the device.
 * It returns a promise that resolves if the device responds with a success code (0x01) and rejects if the device
 * returns an error or if the command fails.
 *
 * @param {number[]} bytes - The byte array representing the command to be sent to the device.
 * @returns {Promise<void>} A promise that resolves when the command is successfully executed or rejects with an
 * error if the command fails.
 *
 * @throws {Error} Throws an error if the device returns an error code or if the command fails.
 */
  async _operateBlindTilt(bytes: number[]): Promise<void> {
    const req_buf = Buffer.from(bytes);
    this._command(req_buf).then((res_buf) => {
      const code = res_buf.readUInt8(0);
      if (res_buf.length === 3 && code === 0x01) {
        return;
      } else {
        throw new Error('The device returned an error: 0x' + res_buf.toString('hex'));
      }
    }).catch((error) => {
      throw error;
    });
  }
}
