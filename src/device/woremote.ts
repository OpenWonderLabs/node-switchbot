/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * WoRemote.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { remoteServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoRemote device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/
 */
export class WoRemote extends SwitchbotDevice {
  /**
   * Parses the service data for WoRemote.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<remoteServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<remoteServiceData | null> {
    if (serviceData.length !== 9) {
      emitLog('debugerror', `[parseServiceDataForWoRemote] Buffer length ${serviceData.length} !== 9!`)
      return null
    }

    const [byte2] = serviceData

    const battery = byte2 & 0b01111111

    const data: remoteServiceData = {
      model: SwitchBotBLEModel.Remote,
      modelName: SwitchBotBLEModelName.Remote,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Remote,
      battery,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}
