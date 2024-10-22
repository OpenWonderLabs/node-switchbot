/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woplugmini.ts: Switchbot BLE API registration.
 */
import type { plugMiniJPServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoPlugMini device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/plugmini.md
 */
export class WoPlugMiniJP extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoPlugMini JP.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<plugMiniJPServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<plugMiniJPServiceData | null> {
    if (manufacturerData.length !== 14) {
      emitLog('debugerror', `[parseServiceDataForWoPlugMiniJP] Buffer length ${manufacturerData.length} should be 14`)
      return null
    }

    const [byte9, byte10, byte11, byte12, byte13] = [
      manufacturerData.readUInt8(9),
      manufacturerData.readUInt8(10),
      manufacturerData.readUInt8(11),
      manufacturerData.readUInt8(12),
      manufacturerData.readUInt8(13),
    ]

    const state = byte9 === 0x00 ? 'off' : byte9 === 0x80 ? 'on' : null
    const delay = !!(byte10 & 0b00000001)
    const timer = !!(byte10 & 0b00000010)
    const syncUtcTime = !!(byte10 & 0b00000100)
    const wifiRssi = byte11
    const overload = !!(byte12 & 0b10000000)
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10 // in watt

    const data = {
      model: SwitchBotBLEModel.PlugMiniJP,
      modelName: SwitchBotBLEModelName.PlugMini,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini,
      state: state ?? 'unknown',
      delay,
      timer,
      syncUtcTime,
      wifiRssi,
      overload,
      currentPower,
    }

    return data as plugMiniJPServiceData
  }

  /**
   * Reads the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async readState(): Promise<boolean> {
    return this.operatePlug([0x57, 0x0F, 0x51, 0x01])
  }

  /**
   * Sets the state of the plug.
   * @private
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  private async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x50, 0x01]
    return this.operatePlug([...base, ...reqByteArray])
  }

  /**
   * Turns on the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x80])
  }

  /**
   * Turns off the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x00])
  }

  /**
   * Toggles the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async toggle(): Promise<boolean> {
    return this.setState([0x02, 0x80])
  }

  /**
   * Operates the plug with the given bytes.
   * @param {number[]} bytes - The byte array to send to the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async operatePlug(bytes: number[]): Promise<boolean> {
    const reqBuf = Buffer.from(bytes)
    const resBytes = await this.command(reqBuf)
    const resBuf = Buffer.from(resBytes)

    if (resBuf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${resBuf.toString('hex')}`)
    }

    const code = resBuf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}
