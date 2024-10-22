/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wocurtain.ts: Switchbot BLE API registration.
 */
import type { curtain3ServiceData, curtainServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoCurtain device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/curtain.md
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/curtain3.md
 */
export class WoCurtain extends SwitchbotDevice {
  /**
   * Parses the service data for WoCurtain.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @param {boolean} [reverse] - Whether to reverse the position.
   * @returns {Promise<curtainServiceData | curtain3ServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
    reverse: boolean = false,
  ): Promise<curtainServiceData | curtain3ServiceData | null> {
    if (![5, 6].includes(serviceData.length)) {
      emitLog('debugerror', `[parseServiceDataForWoCurtain] Buffer length ${serviceData.length} !== 5 or 6!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte2 = serviceData.readUInt8(2)

    let deviceData: Buffer
    let batteryData: number | null = null

    if (manufacturerData.length >= 13) {
      deviceData = manufacturerData.subarray(8, 11)
      batteryData = manufacturerData.readUInt8(12)
    } else if (manufacturerData.length >= 11) {
      deviceData = manufacturerData.subarray(8, 11)
      batteryData = byte2
    } else {
      deviceData = serviceData.subarray(3, 6)
      batteryData = byte2
    }

    const model = serviceData.subarray(0, 1).toString('utf8') as string ? SwitchBotBLEModel.Curtain : SwitchBotBLEModel.Curtain3
    const calibration = Boolean(byte1 & 0b01000000)
    const position = Math.max(Math.min(deviceData.readUInt8(0) & 0b01111111, 100), 0)
    const inMotion = Boolean(deviceData.readUInt8(0) & 0b10000000)
    const lightLevel = (deviceData.readUInt8(1) >> 4) & 0b00001111
    const deviceChain = deviceData.readUInt8(1) & 0b00000111
    const battery = batteryData !== null ? batteryData & 0b01111111 : null

    if (model === SwitchBotBLEModel.Curtain) {
      const data: curtainServiceData = {
        model: SwitchBotBLEModel.Curtain,
        modelName: SwitchBotBLEModelName.Curtain,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain,
        calibration,
        battery: battery ?? 0,
        inMotion,
        position: reverse ? 100 - position : position,
        lightLevel,
        deviceChain,
      }
      return data
    } else {
      const data: curtain3ServiceData = {
        model: SwitchBotBLEModel.Curtain3,
        modelName: SwitchBotBLEModelName.Curtain3,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain3,
        calibration,
        battery: battery ?? 0,
        inMotion,
        position: reverse ? 100 - position : position,
        lightLevel,
        deviceChain,
      }
      return data
    }
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Opens the curtain.
   * @param {number} [mode] - Running mode (0x01 = QuietDrift, 0xFF = Default).
   * @returns {Promise<void>}
   */
  async open(mode: number = 0xFF): Promise<void> {
    await this.runToPos(0, mode)
  }

  /**
   * Closes the curtain.
   * @param {number} [mode] - Running mode (0x01 = QuietDrift, 0xFF = Default).
   * @returns {Promise<void>}
   */
  async close(mode: number = 0xFF): Promise<void> {
    await this.runToPos(100, mode)
  }

  /**
   * Pauses the curtain.
   * @returns {Promise<void>}
   */
  async pause(): Promise<void> {
    await this.operateCurtain([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
  }

  /**
   * Runs the curtain to the target position.
   * @param {number} percent - The percentage of the target position.
   * @param {number} [mode] - Running mode (0x01 = QuietDrift, 0xFF = Default).
   * @returns {Promise<void>}
   */
  async runToPos(percent: number, mode: number = 0xFF): Promise<void> {
    if (typeof percent !== 'number' || typeof mode !== 'number') {
      throw new TypeError('Invalid type for percent or mode')
    }
    percent = Math.max(0, Math.min(100, percent))
    await this.operateCurtain([0x57, 0x0F, 0x45, 0x01, 0x05, mode, percent])
  }

  /**
   * Sends a command to the curtain.
   * @param {number[]} bytes - The command bytes.
   * @returns {Promise<void>}
   */
  public async operateCurtain(bytes: number[]): Promise<void> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || code !== 0x01) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}
