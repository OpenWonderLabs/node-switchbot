/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wocontact.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../switchbot.js';

export class WoContact extends SwitchbotDevice {
  static parseServiceData(buf, onlog) {
    if (buf.length !== 9) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoContact] Buffer length ${buf.length} !== 9!`,
        );
      }
      return null;
    }

    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte8 = buf.readUInt8(8);

    const hallState = (byte3 >> 1) & 0b00000011;
    const tested = byte1 & 0b10000000;
    const movement = byte1 & 0b01000000 ? true : false; // 1 - Movement detected
    const battery = byte2 & 0b01111111; // %
    const contact_open = (byte3 & 0b00000010) === 0b00000010;
    const contact_timeout = (byte3 & 0b00000100) === 0b00000100;
    const lightLevel = byte3 & 0b00000001;
    const button_count = byte8 & 0b00001111;

    const data = {
      model: 'd',
      modelName: 'WoContact',
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
