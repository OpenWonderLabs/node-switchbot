/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wocontact.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';

export class WoContact extends SwitchbotDevice {
  static async parseServiceData(
    serviceData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<object | null> {
    if (serviceData.length !== 9) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoContact] Buffer length ${serviceData.length} !== 9!`);
      }
      return null;
    }

    const byte1 = serviceData.readUInt8(1);
    const byte2 = serviceData.readUInt8(2);
    const byte3 = serviceData.readUInt8(3);
    const byte8 = serviceData.readUInt8(8);

    const hallState = (byte3 >> 1) & 0b00000011;
    const tested = byte1 & 0b10000000;
    const movement = byte1 & 0b01000000 ? true : false; // 1 - Movement detected
    const battery = byte2 & 0b01111111; // %
    const contact_open = (byte3 & 0b00000010) === 0b00000010;
    const contact_timeout = (byte3 & 0b00000100) === 0b00000100;
    const lightLevel = byte3 & 0b00000001;
    const button_count = byte8 & 0b00001111;

    const data = {
      model: SwitchBotBLEModel.ContactSensor,
      modelName: SwitchBotBLEModelName.ContactSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor,
      movement: movement,
      tested: tested,
      battery: battery,
      contact_open: contact_open,
      contact_timeout: contact_timeout,
      lightLevel: lightLevel === 0 ? 'dark' : 'bright',
      button_count: button_count,
      doorState:
        hallState === 0
          ? 'close'
          : hallState === 1
            ? 'open'
            : 'timeout no closed',
    };

    return data;
  }
}
