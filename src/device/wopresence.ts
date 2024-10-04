/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wopresence.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { motionSensorServiceData } from '../types/bledevicestatus.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoPresence device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoPresence extends SwitchbotDevice {
  /**
   * Parses the service data for WoPresence.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<motionSensorServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<motionSensorServiceData | null> {
    if (serviceData.length !== 6) {
      emitLog('error', `[parseServiceDataForWoPresence] Buffer length ${serviceData.length} !== 6!`)
      return null
    }

    const [byte1, byte2, , , , byte5] = serviceData

    const data: motionSensorServiceData = {
      model: SwitchBotBLEModel.MotionSensor,
      modelName: SwitchBotBLEModelName.MotionSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor,
      tested: !!(byte1 & 0b10000000),
      movement: !!(byte1 & 0b01000000),
      battery: byte2 & 0b01111111,
      led: (byte5 & 0b00100000) >> 5,
      iot: (byte5 & 0b00010000) >> 4,
      sense_distance: (byte5 & 0b00001100) >> 2,
      lightLevel: (byte5 & 0b00000011) === 1 ? 'dark' : (byte5 & 0b00000011) === 2 ? 'bright' : 'unknown',
      is_light: !!(byte5 & 0b00000010),
    }

    return data
  }
}
