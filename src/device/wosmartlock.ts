/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wosmartlock.ts: Switchbot BLE API registration.
 */

import { SwitchbotDevice } from '../device.js';

export class WoSmartLock extends SwitchbotDevice {
  static parseServiceData(manufacturerData: Buffer, onlog: ((message: string) => void) | undefined) {
    if (manufacturerData.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoSmartLock] Buffer length ${manufacturerData.length} !== 6!`,
        );
      }
      return null;
    }
    const byte2 = manufacturerData.readUInt8(2);
    const byte7 = manufacturerData.readUInt8(7);
    const byte8 = manufacturerData.readUInt8(8);


    const LockStatus = {
      LOCKED: 0b0000000,
      UNLOCKED: 0b0010000,
      LOCKING: 0b0100000,
      UNLOCKING: 0b0110000,
      LOCKING_STOP: 0b1000000,
      UNLOCKING_STOP: 0b1010000,
      NOT_FULLY_LOCKED: 0b1100000,  //Only EU lock type
    };

    const battery = byte2 & 0b01111111; // %
    const calibration = byte7 & 0b10000000 ? true : false;
    const status = LockStatus[byte7 & 0b01110000];
    const update_from_secondary_lock = byte7 & 0b00001000 ? true : false;
    const door_open = byte7 & 0b00000100 ? true : false;
    const double_lock_mode = byte8 & 0b10000000 ? true : false;
    const unclosed_alarm = byte8 & 0b00100000 ? true : false;
    const unlocked_alarm = byte8 & 0b00010000 ? true : false;
    const auto_lock_paused = byte8 & 0b00000010 ? true : false;

    const data = {
      model: 'o',
      modelName: 'WoSmartLock',
      battery: battery,
      calibration: calibration,
      status: status,
      update_from_secondary_lock: update_from_secondary_lock,
      door_open: door_open,
      double_lock_mode: double_lock_mode,
      unclosed_alarm: unclosed_alarm,
      unlocked_alarm: unlocked_alarm,
      auto_lock_paused: auto_lock_paused,
    };

    return data;
  }

}

