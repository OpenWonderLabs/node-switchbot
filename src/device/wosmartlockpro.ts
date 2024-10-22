/*
 * wosmartlockpro.ts: Switchbot BLE API registration.
 * adapted off the work done by [pySwitchbot](https://github.com/Danielhiversen/pySwitchbot)
 */
import type { lockProServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'
import * as Crypto from 'node:crypto'

import { SwitchbotDevice } from '../device.js'
import { WoSmartLockProCommands } from '../settings.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoSmartLockPro device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/lock.md
 */
export class WoSmartLockPro extends SwitchbotDevice {
  public iv: Buffer | null = null
  public key_id: string = ''
  public encryption_key: Buffer | null = null

  static Result = {
    ERROR: 0x00,
    SUCCESS: 0x01,
    SUCCESS_LOW_BATTERY: 0x06,
  }

  static async validateResponse(res: Buffer) {
    if (res.length >= 3) {
      const result = res.readUInt8(0)
      if (result === WoSmartLockPro.Result.SUCCESS || result === WoSmartLockPro.Result.SUCCESS_LOW_BATTERY) {
        return result
      }
    }
    return WoSmartLockPro.Result.ERROR
  }

  static getLockStatus(code: number) {
    const statusMap: { [key: number]: string } = {
      0b0000000: 'LOCKED',
      0b0010000: 'UNLOCKED',
      0b0100000: 'LOCKING',
      0b0110000: 'UNLOCKING',
      0b1000000: 'LOCKING_STOP',
      0b1010000: 'UNLOCKING_STOP',
      0b01100000: 'NOT_FULLY_LOCKED', // Only EU lock type
    }
    return statusMap[code] || 'UNKNOWN'
  }

  /**
   * Parses the service data from the SwitchBot Strip Light.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<lockProServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<lockProServiceData | null> {
    if (manufacturerData.length < 11) {
      emitLog('debugerror', `[parseServiceDataForWoSmartLockPro] Buffer length ${manufacturerData.length} is too short!`)
      return null
    }

    const byte2 = serviceData.readUInt8(2)
    const byte7 = manufacturerData.readUInt8(7)
    const byte8 = manufacturerData.readUInt8(8)
    const byte9 = manufacturerData.readUInt8(9)
    const byte11 = manufacturerData.readUInt8(11)

    const data: lockProServiceData = {
      model: SwitchBotBLEModel.LockPro,
      modelName: SwitchBotBLEModelName.LockPro,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.LockPro,
      battery: byte2 & 0b01111111,
      calibration: !!(byte7 & 0b10000000),
      status: WoSmartLockPro.getLockStatus((byte7 & 0b00111000) >> 3),
      door_open: !!(byte8 & 0b01100000),
      update_from_secondary_lock: false,
      double_lock_mode: false,
      unclosed_alarm: !!(byte11 & 0b10000000),
      unlocked_alarm: !!(byte11 & 0b01000000),
      auto_lock_paused: !!(byte8 & 0b100000),
      night_latch: !!(byte9 & 0b00000001),
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Initializes the encryption key info for valid lock communication.
   * @param {string} keyId - The key ID.
   * @param {string} encryptionKey - The encryption key.
   */
  async setKey(keyId: string, encryptionKey: string) {
    this.iv = null
    this.key_id = keyId
    this.encryption_key = Buffer.from(encryptionKey, 'hex')
  }

  /**
   * Unlocks the Smart Lock.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlock(): Promise<number> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.UNLOCK)
    return resBuf ? WoSmartLockPro.validateResponse(resBuf) : WoSmartLockPro.Result.ERROR
  }

  /**
   * Unlocks the Smart Lock without unlatching the door.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlockNoUnlatch(): Promise<number> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.UNLOCK_NO_UNLATCH)
    return resBuf ? WoSmartLockPro.validateResponse(resBuf) : WoSmartLockPro.Result.ERROR
  }

  /**
   * Locks the Smart Lock.
   * @returns {Promise<number>} - The result of the lock operation.
   */
  async lock(): Promise<number> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.LOCK)
    return resBuf ? WoSmartLockPro.validateResponse(resBuf) : WoSmartLockPro.Result.ERROR
  }

  /**
   * Gets general state info from the Smart Lock.
   * @returns {Promise<object | null>} - The state object or null if an error occurred.
   */
  async info(): Promise<object | null> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.LOCK_INFO)
    if (resBuf) {
      return {
        calibration: Boolean(resBuf[0] & 0b10000000),
        status: WoSmartLockPro.getLockStatus((resBuf[0] & 0b01110000) >> 4),
        door_open: Boolean(resBuf[0] & 0b00000100),
        unclosed_alarm: Boolean(resBuf[1] & 0b00100000),
        unlocked_alarm: Boolean(resBuf[1] & 0b00010000),
      }
    }
    return null
  }

  /**
   * Encrypts a string using AES-128-CTR.
   * @param {string} str - The string to encrypt.
   * @returns {Promise<string>} - The encrypted string in hex format.
   */
  async encrypt(str: string): Promise<string> {
    const cipher = Crypto.createCipheriv('aes-128-ctr', this.encryption_key!, this.iv)
    return Buffer.concat([cipher.update(str, 'hex'), cipher.final()]).toString('hex')
  }

  /**
   * Decrypts a buffer using AES-128-CTR.
   * @param {Buffer} data - The data to decrypt.
   * @returns {Promise<Buffer>} - The decrypted data.
   */
  async decrypt(data: Buffer): Promise<Buffer> {
    const decipher = Crypto.createDecipheriv('aes-128-ctr', this.encryption_key!, this.iv)
    return Buffer.concat([decipher.update(data), decipher.final()])
  }

  /**
   * Retrieves the IV from the device.
   * @returns {Promise<Buffer>} - The IV buffer.
   */
  async getIv(): Promise<Buffer> {
    if (!this.iv) {
      const res = await this.operateLockPro(WoSmartLockProCommands.GET_CKIV + this.key_id, false)
      if (res) {
        this.iv = res.subarray(4)
      } else {
        throw new Error('Failed to retrieve IV from the device.')
      }
    }
    return this.iv
  }

  /**
   * Sends an encrypted command to the device.
   * @param {string} key - The command key.
   * @returns {Promise<Buffer>} - The response buffer.
   */
  async encryptedCommand(key: string): Promise<Buffer> {
    const iv = await this.getIv()
    const req = Buffer.from(
      key.substring(0, 2) + this.key_id + Buffer.from(iv.subarray(0, 2)).toString('hex') + await this.encrypt(key.substring(2)),
      'hex',
    )

    const bytes = await this.command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLockPro.validateResponse(buf)

    if (await code !== WoSmartLockPro.Result.ERROR) {
      return Buffer.concat([buf.subarray(0, 1), await this.decrypt(buf.subarray(4))])
    } else {
      throw new Error(`The device returned an error: 0x${buf.toString('hex')}`)
    }
  }

  /**
   * Operates the lock with the given command.
   * @param {string} key - The command key.
   * @param {boolean} [encrypt] - Whether to encrypt the command.
   * @returns {Promise<Buffer>} - The response buffer.
   */
  async operateLockPro(key: string, encrypt: boolean = true): Promise<Buffer> {
    if (encrypt) {
      return this.encryptedCommand(key)
    }
    const req = Buffer.from(`${key.substring(0, 2)}000000${key.substring(2)}`, 'hex')
    const bytes = await this.command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLockPro.validateResponse(buf)

    if (await code === WoSmartLockPro.Result.ERROR) {
      throw new Error(`The device returned an error: 0x${buf.toString('hex')}`)
    }
    return buf
  }
}
