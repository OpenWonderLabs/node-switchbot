/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wopresence.ts: Switchbot BLE API registration.
 */
import { SwitchbotDevice } from '../device.js';
import { motionSensorServiceData } from '../types/bledevicestatus.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';
import type { Buffer } from 'node:buffer'

export class WoPresence extends SwitchbotDevice {
  static async parseServiceData(
    serviceData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<motionSensorServiceData | null> {
    if (serviceData.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoPresence] Buffer length ${serviceData.length} !== 6!`);
      }
      return null
    }

    const byte1 = serviceData.readUInt8(1);
    const byte2 = serviceData.readUInt8(2);
    const byte5 = serviceData.readUInt8(5);

    const tested = !!(byte1 & 0b10000000)
    const movement = !!(byte1 & 0b01000000)
    const battery = byte2 & 0b01111111
    const led = (byte5 & 0b00100000) >> 5
    const iot = (byte5 & 0b00010000) >> 4
    const sense_distance = (byte5 & 0b00001100) >> 2
    const lightLevel = byte5 & 0b00000011
    const is_light = !!(byte5 & 0b00000010)

    const data: motionSensorServiceData = {
      model: SwitchBotBLEModel.MotionSensor,
      modelName: SwitchBotBLEModelName.MotionSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor,
      tested: tested,
      movement: movement,
      battery: battery,
      led: led,
      iot: iot,
      sense_distance: sense_distance,
      lightLevel: lightLevel === 1 ? 'dark' : lightLevel === 2 ? 'bright' : 'unknown',
      is_light: is_light,
    };

    return data
  }
}
