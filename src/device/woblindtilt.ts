/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woblindtilt.ts: Switchbot BLE API registration.
 */
import type { SwitchBotBLE } from '../switchbot-ble.js'

import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoBlindTilt device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/curtain.md
 */
export class WoBlindTilt extends SwitchbotDevice {
  private _reverse: boolean = false
  static switchBotBLE: SwitchBotBLE

  /**
   * Parses the service data and manufacturer data for the WoBlindTilt device.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {boolean} [reverse] - Whether to reverse the tilt percentage.
   * @returns {Promise<object | null>} - The parsed data object or null if the data is invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    reverse: boolean = false,
  ): Promise<object | null> {
    if (![5, 6].includes(manufacturerData.length)) {
      this.switchBotBLE.emitLog('error', `[parseServiceDataForWoBlindTilt] Buffer length ${manufacturerData.length} !== 5 or 6!`)
      return null
    }

    const byte2 = serviceData.readUInt8(2)
    const byte6 = manufacturerData.subarray(6)

    const tilt = Math.max(Math.min(byte6.readUInt8(2) & 0b01111111, 100), 0)
    const inMotion = !!(byte2 & 0b10000000)
    const lightLevel = (byte6.readUInt8(1) >> 4) & 0b00001111
    const calibration = !!(byte6.readUInt8(1) & 0b00000001)
    const sequenceNumber = byte6.readUInt8(0)
    const battery = serviceData.length > 2 ? byte2 & 0b01111111 : null

    return {
      model: SwitchBotBLEModel.BlindTilt,
      modelName: SwitchBotBLEModelName.BlindTilt,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.BlindTilt,
      calibration,
      battery,
      inMotion,
      tilt: reverse ? 100 - tilt : tilt,
      lightLevel,
      sequenceNumber,
    }
  }

  /**
   * Opens the blind tilt to the fully open position.
   * @returns {Promise<void>}
   */
  async open(): Promise<void> {
    await this.operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x32])
  }

  /**
   * Closes the blind tilt up to the nearest endpoint.
   * @returns {Promise<void>}
   */
  async closeUp(): Promise<void> {
    await this.operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x64])
  }

  /**
   * Closes the blind tilt down to the nearest endpoint.
   * @returns {Promise<void>}
   */
  async closeDown(): Promise<void> {
    await this.operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x00])
  }

  /**
   * Closes the blind tilt to the nearest endpoint.
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    const position = await this.getPosition()
    if (position > 50) {
      await this.closeUp()
    } else {
      await this.closeDown()
    }
  }

  /**
   * Retrieves the current position of the blind tilt.
   * @returns {Promise<number>} - The current position of the blind tilt (0-100).
   */
  async getPosition(): Promise<number> {
    const tiltPosition = await this._getAdvValue('tilt')
    return Math.max(0, Math.min(tiltPosition, 100))
  }

  /**
   * Retrieves the advertised value for a given key.
   * @param {string} key - The key for the advertised value.
   * @returns {Promise<number>} - The advertised value.
   * @private
   */
  private async _getAdvValue(key: string): Promise<number> {
    if (key === 'tilt') {
      return 50 // Example value
    }
    throw new Error(`Unknown key: ${key}`)
  }

  /**
   * Retrieves the basic information of the blind tilt.
   * @returns {Promise<object | null>} - A promise that resolves to an object containing the basic information of the blind tilt.
   */
  async getBasicInfo(): Promise<object | null> {
    const data: any = await this.getBasicInfo()
    if (!data) {
      return null
    }

    const tilt = Math.max(Math.min(data[6], 100), 0)
    const moving = Boolean(data[5] & 0b00000011)
    let opening = false
    let closing = false
    let up = false

    if (moving) {
      opening = Boolean(data[5] & 0b00000010)
      closing = !opening && Boolean(data[5] & 0b00000001)
      if (opening) {
        const flag = Boolean(data[5] & 0b00000001)
        up = flag ? this._reverse : !flag
      } else {
        up = tilt < 50 ? this._reverse : tilt > 50
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
    }
  }

  /**
   * Pauses the blind tilt operation.
   * @returns {Promise<void>}
   */
  async pause(): Promise<void> {
    await this.operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
  }

  /**
   * Runs the blind tilt to the specified position.
   * @param {number} percent - The target position percentage (0-100).
   * @param {number} mode - The running mode (0 or 1).
   * @returns {Promise<void>}
   */
  async runToPos(percent: number, mode: number): Promise<void> {
    if (typeof percent !== 'number' || percent < 0 || percent > 100) {
      throw new RangeError('Percent must be a number between 0 and 100')
    }
    if (typeof mode !== 'number' || mode < 0 || mode > 1) {
      throw new RangeError('Mode must be a number between 0 and 1')
    }
    await this.operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, mode, percent])
  }

  /**
   * Sends a command to operate the blind tilt and handles the response.
   * @param {number[]} bytes - The byte array representing the command to be sent to the device.
   * @returns {Promise<void>}
   * @private
   */
  private async operateBlindTilt(bytes: number[]): Promise<void> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    if (resBuf.length !== 3 || resBuf.readUInt8(0) !== 0x01) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}
