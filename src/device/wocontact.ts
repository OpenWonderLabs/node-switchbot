/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wocontact.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { SwitchBotBLE } from '../switchbot-ble.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoContact device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/contactsensor.md
 */
export class WoContact extends SwitchbotDevice {
  static switchBotBLE: SwitchBotBLE
  /**
   * Parses the service data for WoContact.
   * @param {Buffer} serviceData - The service data buffer.
   * @returns {Promise<object | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
  ): Promise<object | null> {
    if (serviceData.length !== 9) {
      this.switchBotBLE.emitLog('error', `[parseServiceDataForWoContact] Buffer length ${serviceData.length} !== 9!`)
      return null
    }

    const [byte1, byte2, byte3, , , , , , byte8] = serviceData

    const hallState = (byte3 >> 1) & 0b00000011
    const tested = Boolean(byte1 & 0b10000000)
    const movement = Boolean(byte1 & 0b01000000)
    const battery = byte2 & 0b01111111
    const contact_open = Boolean(byte3 & 0b00000010)
    const contact_timeout = Boolean(byte3 & 0b00000100)
    const lightLevel = byte3 & 0b00000001 ? 'bright' : 'dark'
    const button_count = byte8 & 0b00001111
    const doorState = hallState === 0 ? 'close' : hallState === 1 ? 'open' : 'timeout no closed'

    return {
      model: SwitchBotBLEModel.ContactSensor,
      modelName: SwitchBotBLEModelName.ContactSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor,
      movement,
      tested,
      battery,
      contact_open,
      contact_timeout,
      lightLevel,
      button_count,
      doorState,
    }
  }
}
