/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woiosensorth.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoIOSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md#outdoor-temperaturehumidity-sensor
 */
export class WoIOSensorTH extends SwitchbotDevice {
  /**
   * Parses the service data for WoIOSensorTH.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} [onlog] - Optional logging function.
   * @returns {Promise<object | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    onlog?: (message: string) => void,
  ): Promise<object | null> {
    if (serviceData.length !== 3) {
      onlog?.(`[parseServiceDataForWoIOSensorTH] Service Data Buffer length ${serviceData.length} !== 3!`)
      return null
    }
    if (manufacturerData.length !== 14) {
      onlog?.(`[parseServiceDataForWoIOSensorTH] Manufacturer Data Buffer length ${manufacturerData.length} !== 14!`)
      return null
    }

    const [mdByte10, mdByte11, mdByte12] = [
      manufacturerData.readUInt8(10),
      manufacturerData.readUInt8(11),
      manufacturerData.readUInt8(12),
    ]
    const sdByte2 = serviceData.readUInt8(2)

    const tempSign = mdByte11 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((mdByte11 & 0b01111111) + (mdByte10 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

    return {
      model: SwitchBotBLEModel.OutdoorMeter,
      modelName: SwitchBotBLEModelName.OutdoorMeter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.OutdoorMeter,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(mdByte12 & 0b10000000),
      humidity: mdByte12 & 0b01111111,
      battery: sdByte2 & 0b01111111,
    }
  }
}
