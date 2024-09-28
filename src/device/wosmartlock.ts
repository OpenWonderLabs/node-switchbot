/*
 * wosmartlock.ts: Switchbot BLE API registration.
 * adapted off the work done by [pySwitchbot](https://github.com/Danielhiversen/pySwitchbot)
 */
import type * as Noble from '@stoprocent/noble'

import type { lockServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'
import * as Crypto from 'node:crypto'

import { SwitchbotDevice } from '../device.js'
import { WoSmartLockCommands } from '../settings.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

export class WoSmartLock extends SwitchbotDevice {
  private iv: Buffer | null = null
  private key_id: string = ''
  private encryption_key: Buffer | null = null

  static Result = {
    ERROR: 0x00,
    SUCCESS: 0x01,
    SUCCESS_LOW_BATTERY: 0x06,
  }

  static async validateResponse(res: Buffer): Promise<number> {
    if (res.length >= 3) {
      const result = res.readUInt8(0)
      if (result === WoSmartLock.Result.SUCCESS || result === WoSmartLock.Result.SUCCESS_LOW_BATTERY) {
        return result
      }
    }
    return WoSmartLock.Result.ERROR
  }

  static getLockStatus(code: number): string {
    const statusMap: { [key: number]: string } = {
      0b0000000: 'LOCKED',
      0b0010000: 'UNLOCKED',
      0b0100000: 'LOCKING',
      0b0110000: 'UNLOCKING',
      0b1000000: 'LOCKING_STOP',
      0b1010000: 'UNLOCKING_STOP',
      0b1100000: 'NOT_FULLY_LOCKED', // Only EU lock type
    }
    return statusMap[code] || 'UNKNOWN'
  }

  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    onlog?: (message: string) => void,
  ): Promise<lockServiceData | null> {
    if (manufacturerData.length < 11) {
      onlog?.(`[parseServiceDataForWoSmartLock] Buffer length ${manufacturerData.length} is too short!`)
      return null
    }

    const byte2 = serviceData.readUInt8(2)
    const byte15 = manufacturerData.readUInt8(9)
    const byte16 = manufacturerData.readUInt8(10)

    const data: lockServiceData = {
      model: SwitchBotBLEModel.Lock,
      modelName: SwitchBotBLEModelName.Lock,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Lock,
      battery: byte2 & 0b01111111,
      calibration: !!(byte15 & 0b10000000),
      status: WoSmartLock.getLockStatus(byte15 & 0b01110000),
      update_from_secondary_lock: !!(byte15 & 0b00001000),
      door_open: !!(byte15 & 0b00000100),
      double_lock_mode: !!(byte16 & 0b10000000),
      unclosed_alarm: !!(byte16 & 0b00100000),
      unlocked_alarm: !!(byte16 & 0b00010000),
      auto_lock_paused: !!(byte16 & 0b00000010),
      night_latch: !!(manufacturerData.length > 11 && manufacturerData.readUInt8(11) & 0b00000001),
    }

    return data
  }

  constructor(peripheral: Noble.Peripheral, noble: typeof Noble) {
    super(peripheral, noble)
  }

  /**
   * Initializes the encryption key info for valid lock communication.
   * @param {string} keyId - The key ID.
   * @param {string} encryptionKey - The encryption key.
   */
  async setKey(keyId: string, encryptionKey: string): Promise<void> {
    this.iv = null
    this.key_id = keyId
    this.encryption_key = Buffer.from(encryptionKey, 'hex')
  }

  /**
   * Unlocks the Smart Lock.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlock(): Promise<number> {
    const resBuf = await this.operateLock(WoSmartLockCommands.UNLOCK)
    return resBuf ? WoSmartLock.validateResponse(resBuf) : WoSmartLock.Result.ERROR
  }

  /**
   * Unlocks the Smart Lock without unlatching the door.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlockNoUnlatch(): Promise<number> {
    const resBuf = await this.operateLock(WoSmartLockCommands.UNLOCK_NO_UNLATCH)
    return resBuf ? WoSmartLock.validateResponse(resBuf) : WoSmartLock.Result.ERROR
  }

  /**
   * Locks the Smart Lock.
   * @returns {Promise<number>} - The result of the lock operation.
   */
  async lock(): Promise<number> {
    const resBuf = await this.operateLock(WoSmartLockCommands.LOCK)
    return resBuf ? WoSmartLock.validateResponse(resBuf) : WoSmartLock.Result.ERROR
  }

  /**
   * Gets general state info from the Smart Lock.
   * @returns {Promise<object | null>} - The state object or null if an error occurred.
   */
  async info(): Promise<object | null> {
    const resBuf = await this.operateLock(WoSmartLockCommands.LOCK_INFO)
    if (resBuf) {
      return {
        calibration: Boolean(resBuf[1] & 0b10000000),
        status: WoSmartLock.getLockStatus((resBuf[1] & 0b01110000)),
        door_open: Boolean(resBuf[1] & 0b00000100),
        unclosed_alarm: Boolean(resBuf[2] & 0b00100000),
        unlocked_alarm: Boolean(resBuf[2] & 0b00010000),
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
      const res = await this.operateLock(WoSmartLockCommands.GET_CKIV + this.key_id, false)
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
    const code = WoSmartLock.validateResponse(buf)

    if (await code !== WoSmartLock.Result.ERROR) {
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
  async operateLock(key: string, encrypt: boolean = true): Promise<Buffer> {
    if (encrypt) {
      return this.encryptedCommand(key)
    }
    const req = Buffer.from(`${key.substring(0, 2)}000000${key.substring(2)}`, 'hex')
    const bytes = await this.command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLock.validateResponse(buf)

    if (await code === WoSmartLock.Result.ERROR) {
      throw new Error(`The device returned an error: 0x${buf.toString('hex')}`)
    }
    return buf
  }
}
