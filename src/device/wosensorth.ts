/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wosensorth.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { meterPlusServiceData, meterServiceData } from '../types/bledevicestatus.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoSensorTH extends SwitchbotDevice {
  /**
   * Parses the service data for WoSensorTH.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} [onlog] - Optional logging function.
   * @returns {Promise<meterServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    onlog?: (message: string) => void,
  ): Promise<meterServiceData | null> {
    if (serviceData.length !== 6) {
      onlog?.(`[parseServiceDataForWoSensorTH] Buffer length ${serviceData.length} !== 6!`)
      return null
    }

    const [byte2, byte3, byte4, byte5] = [serviceData.readUInt8(2), serviceData.readUInt8(3), serviceData.readUInt8(4), serviceData.readUInt8(5)]
    const tempSign = byte4 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9 / 5) + 32) * 10) / 10

    return {
      model: SwitchBotBLEModel.Meter,
      modelName: SwitchBotBLEModelName.Meter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }
  }

  /**
   * Parses the service data for WoSensorTH Plus.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} [onlog] - Optional logging function.
   * @returns {Promise<meterPlusServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData_Plus(
    serviceData: Buffer,
    onlog?: (message: string) => void,
  ): Promise<meterPlusServiceData | null> {
    if (serviceData.length !== 6) {
      onlog?.(`[parseServiceDataForWoSensorTHPlus] Buffer length ${serviceData.length} !== 6!`)
      return null
    }

    const [byte2, byte3, byte4, byte5] = [serviceData.readUInt8(2), serviceData.readUInt8(3), serviceData.readUInt8(4), serviceData.readUInt8(5)]
    const tempSign = byte4 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9 / 5) + 32) * 10) / 10

    return {
      model: SwitchBotBLEModel.MeterPlus,
      modelName: SwitchBotBLEModelName.MeterPlus,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPlus,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }
  }
}
