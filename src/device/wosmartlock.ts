/*
 * wosmartlock.ts: Switchbot BLE API registration.
 * adapted off the work done by [pySwitchbot](https://github.com/Danielhiversen/pySwitchbot)
 */
import { SwitchbotDevice } from '../device.js';
import { lockServiceData } from '../types/bledevicestatus.js';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js';
import Noble from '@stoprocent/noble';
import { WoSmartLockPro } from './wosmartlockpro.js';
import { Buffer } from 'node:buffer'
import * as Crypto from 'node:crypto'

export class WoSmartLock extends SwitchbotDevice {
  iv: Buffer | null
  key_id: string
  encryption_key: Buffer | null

  static COMMAND_GET_CKiv = '570f2103'
  static COMMAND_LOCK_INFO = '570f4f8101'
  static COMMAND_UNLOCK = '570f4e01011080'
  static COMMAND_UNLOCK_NO_UNLATCH = '570f4e010110a0'
  static COMMAND_LOCK = '570f4e01011000'
  static COMMAND_ENABLE_NOTIFICATIONS = '570e01001e00008101'
  static COMMAND_DISABLE_NOTIFICATIONS = '570e00'

  static Result = {
    ERROR: 0x00,
    SUCCESS: 0x01,
    SUCCESS_LOW_BATTERY: 0x06,
  }

  static async validateResponse(res: Buffer) {
    if (res.length >= 3) {
      switch (res.readUInt8(0)) {
        case WoSmartLock.Result.SUCCESS:
          return WoSmartLock.Result.SUCCESS
        case WoSmartLock.Result.SUCCESS_LOW_BATTERY:
          return WoSmartLock.Result.SUCCESS_LOW_BATTERY
      }
    }
    return WoSmartLock.Result.ERROR
  }

  static getLockStatus(code: number): string {
    switch (code) {
      case 0b0000000:
        return 'LOCKED'
      case 0b0010000:
        return 'UNLOCKED'
      case 0b0100000:
        return 'LOCKING'
      case 0b0110000:
        return 'UNLOCKING'
      case 0b1000000:
        return 'LOCKING_STOP'
      case 0b1010000:
        return 'UNLOCKING_STOP'
      case 0b1100000: // Only EU lock type
        return 'NOT_FULLY_LOCKED'
      default:
        return 'UNKNOWN'
    }
  }

  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    onlog: ((message: string) => void) | undefined,
  ): Promise<lockServiceData | null> {
    if (manufacturerData.length < 11) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseServiceDataForWoSmartLock] Buffer length ${manufacturerData.length} is too short!`);
      }
      return null
    }

    // adv data needs both service data and manufacturer data
    // byte var names based on documentation
    const byte2 = serviceData.readUInt8(2)
    const byte15 = manufacturerData.readUInt8(9)
    const byte16 = manufacturerData.readUInt8(10)

    const battery = byte2 & 0b01111111; // %
    const calibration = !!(byte15 & 0b10000000)
    const status = WoSmartLock.getLockStatus(byte15 & 0b01110000)
    const update_from_secondary_lock = !!(byte15 & 0b00001000)
    const door_open = !!(byte15 & 0b00000100)
    const double_lock_mode = !!(byte16 & 0b10000000)
    const unclosed_alarm = !!(byte16 & 0b00100000)
    const unlocked_alarm = !!(byte16 & 0b00010000)
    const auto_lock_paused = !!(byte16 & 0b00000010)
    const night_latch = !!(manufacturerData.length > 11 && manufacturerData.readUInt8(11) & 0b00000001)

    const data: lockServiceData = {
      model: SwitchBotBLEModel.Lock,
      modelName: SwitchBotBLEModelName.Lock,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Lock,
      battery: battery,
      calibration: calibration,
      status: status,
      update_from_secondary_lock: update_from_secondary_lock,
      door_open: door_open,
      double_lock_mode: double_lock_mode,
      unclosed_alarm: unclosed_alarm,
      unlocked_alarm: unlocked_alarm,
      auto_lock_paused: auto_lock_paused,
      night_latch: night_latch,
    }

    return data
  }

  constructor(peripheral: Noble.Peripheral, noble: typeof Noble) {
    super(peripheral, noble);
    this.iv = null;
    this.key_id = '';
    this.encryption_key = null;
  }

  /* ------------------------------------------------------------------
   * setKey()
   * - initialise the encryption key info for valid lock communication, this currently must be retrived externally
   *
   * [Arguments]
   * - keyId, encryptionKey
   *
   * [Return value]
   * - void
   * ---------------------------------------------------------------- */
  async setKey(keyId: string, encryptionKey: string) {
    this.iv = null;
    this.key_id = keyId;
    this.encryption_key = Buffer.from(encryptionKey, 'hex');
  }

  /* ------------------------------------------------------------------
   * unlock()
   * - Unlock the Smart Lock
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   WoSmartLock.LockResult will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  async unlock() {
    await this.operateLock(WoSmartLock.COMMAND_UNLOCK)
      .then((resBuf) => {
        if (resBuf) {
          return WoSmartLock.validateResponse(resBuf);
        } else {
          return WoSmartLockPro.Result.ERROR;
        }
      }).catch((error) => {
        return error;
      });
  }

  /* ------------------------------------------------------------------
   * unlockNoUnlatch()
   * - Unlock the Smart Lock without unlatching door
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   WoSmartLock.LockResult will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  async unlockNoUnlatch() {
    await this.operateLock(WoSmartLock.COMMAND_UNLOCK_NO_UNLATCH)
      .then((resBuf) => {
        if (resBuf) {
          return WoSmartLock.validateResponse(resBuf);
        } else {
          throw new Error('Failed to retrieve response buffer from the device.');
        }
      }).catch((error) => {
        return error;
      });
  }

  /* ------------------------------------------------------------------
   * lock()
   * - Lock the Smart Lock
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   WoSmartLock.LockResult will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  async lock() {
    await this.operateLock(WoSmartLock.COMMAND_LOCK)
      .then((resBuf) => {
        if (resBuf) {
          return WoSmartLock.validateResponse(resBuf);
        } else {
          throw new Error('Failed to retrieve response buffer from the device.');
        }
      }).catch((error) => {
        return error;
      });
  }

  /* ------------------------------------------------------------------
   * info()
   * - Get general state info from the Smart Lock
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   state object will be passed to the `resolve()`
   * ---------------------------------------------------------------- */
  async info() {
    await this.operateLock(WoSmartLock.COMMAND_LOCK_INFO)
      .then((resBuf) => {
        if (resBuf) {
          const data = {
            'calibration': Boolean(resBuf[1] & 0b10000000),
            'status': WoSmartLock.getLockStatus((resBuf[1] & 0b01110000)),
            'door_open': Boolean(resBuf[1] & 0b00000100),
            'unclosed_alarm': Boolean(resBuf[2] & 0b00100000),
            'unlocked_alarm': Boolean(resBuf[2] & 0b00010000),
          };
          return data;
        } else {
          throw new Error('Failed to retrieve response buffer from the device.');
        }
      })
      .catch((error) => {
        return error;
      });
  }

  async encrypt(str:string) {
    const cipher = Crypto.createCipheriv('aes-128-ctr', this.encryption_key!, this.iv);
    return Buffer.concat([cipher.update(str, 'hex'), cipher.final()]).toString('hex');
  }

  async decrypt(data:Buffer) {
    const decipher = Crypto.createDecipheriv('aes-128-ctr', this.encryption_key!, this.iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  async getIv(): Promise<Buffer> {
    if (this.iv === null) {
      const res = await this.operateLock(WoSmartLock.COMMAND_GET_CKiv + this.key_id, false);
      if (res) {
        this.iv = res.subarray(4);
      } else {
        // Handle the case when 'res' is undefined
        // For example, you can throw an error or set a default value for 'this.iv'
        throw new Error('Failed to retrieve IV from the device.');
      }
    }
    return this.iv
  }

  async encryptedCommand(key: string) {
    const iv = await this.getIv();
    const req = Buffer.from(
      key.substring(0, 2) + this.key_id + Buffer.from(iv.subarray(0, 2)).toString('hex') + this.encrypt(key.substring(2))
      , 'hex');

    const bytes: unknown = await this.command(req);
    const buf = Buffer.from(bytes as Uint8Array);
    const code = WoSmartLock.validateResponse(buf);

    if (await code !== WoSmartLock.Result.ERROR) {
      return Buffer.concat([buf.subarray(0, 1), await this.decrypt(buf.subarray(4))]);
    } else {
      throw new Error('The device returned an error: 0x' + buf.toString('hex'));
    }
  }

  async operateLock(key: string, encrypt: boolean = true) {
    //encrypted command
    if (encrypt) {
      return await this.encryptedCommand(key);
    }

    const req = Buffer.from(key.substring(0, 2) + '000000' + key.substring(2), 'hex');
    await this.command(req).then(async bytes => {
      const buf = Buffer.from(bytes as Uint8Array);
      const code = WoSmartLock.validateResponse(buf);
      if (await code === WoSmartLock.Result.ERROR) {
        return new Error('The device returned an error: 0x' + buf.toString('hex'));
      } else {
        return buf;
      }
    })
      .catch(error => {
        return error;
      });
  }
}
