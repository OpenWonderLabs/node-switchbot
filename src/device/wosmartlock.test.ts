import type { lockServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoSmartLock } from '../device/wosmartlock.js'
import { WoSmartLockCommands } from '../settings.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woSmartLock', () => {
  let mockPeripheral: NobleTypes['peripheral']
  let mockNoble: NobleTypes['noble']
  let lock: WoSmartLock

  beforeEach(() => {
    mockPeripheral = {} as NobleTypes['peripheral']
    mockNoble = {} as NobleTypes['noble']
    lock = new WoSmartLock(mockPeripheral, mockNoble)
  })

  describe('parseServiceData', () => {
    it('should return null if buffer length is not 18', async () => {
      const serviceData = Buffer.alloc(10)
      const manufacturerData = Buffer.alloc(0)
      const emitLog = vi.fn()
      const result = await WoSmartLock.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoLock] Buffer length 10 !== 18!')
    })

    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0, 0, 0, 255, 128, 64, 0, 129, 136, 127, 254, 0, 0, 0, 0, 0, 0, 0])
      const manufacturerData = Buffer.alloc(0)
      const emitLog = vi.fn()
      const result = await WoSmartLock.parseServiceData(serviceData, manufacturerData, emitLog)
      const expected: lockServiceData = {
        model: SwitchBotBLEModel.Lock,
        modelName: SwitchBotBLEModelName.Lock,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Lock,
        battery: 100,
        calibration: true,
        status: 'LOCKED',
        door_open: false,
        update_from_secondary_lock: false,
        double_lock_mode: false,
        unclosed_alarm: false,
        unlocked_alarm: false,
        auto_lock_paused: false,
        night_latch: false,
      }
      expect(result).toEqual(expected)
    })
  })

  it('should initialize with default values', () => {
    expect(lock.iv).toBeNull()
    expect(lock.key_id).toBe('')
    expect(lock.encryption_key).toBeNull()
  })

  it('should set key correctly', async () => {
    const keyId = 'testKeyId'
    const encryptionKey = '0123456789abcdef0123456789abcdef'
    await lock.setKey(keyId, encryptionKey)
    expect(lock.key_id).toBe(keyId)
    expect(lock.encryption_key?.toString('hex')).toBe(encryptionKey)
  })

  it('should validate response correctly', async () => {
    const res = Buffer.from([0x01, 0x00, 0x00])
    const result = await WoSmartLock.validateResponse(res)
    expect(result).toBe(WoSmartLock.Result.SUCCESS)
  })

  it('should get lock status correctly', () => {
    const status = WoSmartLock.getLockStatus(0b0010000)
    expect(status).toBe('UNLOCKED')
  })

  it('should parse service data correctly', async () => {
    const serviceData = Buffer.from([0x00, 0x00, 0x7F])
    const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00])
    const emitLog = vi.fn()
    const data = await WoSmartLock.parseServiceData(serviceData, manufacturerData, emitLog)
    expect(data).toEqual({
      model: 'Lock',
      modelName: 'Lock',
      modelFriendlyName: 'Lock',
      battery: 127,
      calibration: true,
      status: 'LOCKED',
      update_from_secondary_lock: false,
      door_open: false,
      double_lock_mode: false,
      unclosed_alarm: false,
      unlocked_alarm: false,
      auto_lock_paused: false,
      night_latch: false,
    })
  })

  it('should unlock the smart lock', async () => {
    vi.spyOn(lock, 'operateLock').mockResolvedValue(Buffer.from([0x01]))
    const result = await lock.unlock()
    expect(result).toBe(WoSmartLock.Result.SUCCESS)
  })

  it('should lock the smart lock', async () => {
    vi.spyOn(lock, 'operateLock').mockResolvedValue(Buffer.from([0x01]))
    const result = await lock.lock()
    expect(result).toBe(WoSmartLock.Result.SUCCESS)
  })

  it('should get lock info', async () => {
    vi.spyOn(lock, 'operateLock').mockResolvedValue(Buffer.from([0x01, 0b10000000, 0b00100000]))
    const info = await lock.info()
    expect(info).toEqual({
      calibration: true,
      status: 'LOCKED',
      door_open: false,
      unclosed_alarm: true,
      unlocked_alarm: false,
    })
  })

  it('should encrypt data correctly', async () => {
    const keyId = 'testKeyId'
    const encryptionKey = '0123456789abcdef0123456789abcdef'
    await lock.setKey(keyId, encryptionKey)
    lock.iv = Buffer.from('0123456789abcdef', 'hex')
    const encrypted = await lock.encrypt('testdata')
    expect(encrypted).toBe('expectedEncryptedHexString') // Replace with actual expected encrypted string
  })

  it('should decrypt data correctly', async () => {
    const keyId = 'testKeyId'
    const encryptionKey = '0123456789abcdef0123456789abcdef'
    await lock.setKey(keyId, encryptionKey)
    lock.iv = Buffer.from('0123456789abcdef', 'hex')
    const decrypted = await lock.decrypt(Buffer.from('expectedEncryptedHexString', 'hex')) // Replace with actual encrypted string
    expect(decrypted.toString()).toBe('testdata')
  })

  it('should retrieve IV from the device', async () => {
    vi.spyOn(lock, 'operateLock').mockResolvedValue(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]))
    const iv = await lock.getIv()
    expect(iv.toString('hex')).toBe('01020304')
  })

  it('should send encrypted command to the device', async () => {
    vi.spyOn(lock, 'getIv').mockResolvedValue(Buffer.from('01020304', 'hex'))
    vi.spyOn(lock, 'encrypt').mockResolvedValue('encryptedCommand')
    vi.spyOn(lock, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x05, 0x06, 0x07, 0x08]))
    const response = await lock.encryptedCommand('testCommand')
    expect(response.toString('hex')).toBe('expectedResponseHexString') // Replace with actual expected response
  })

  describe('operateLock', () => {
    it('should operate the lock with encryption', async () => {
      vi.spyOn(lock, 'encryptedCommand').mockResolvedValue(Buffer.from([0x01]))
      const response = await lock.operateLock(WoSmartLockCommands.LOCK)
      expect(response).toBeDefined()
    })

    it('should operate the lock without encryption', async () => {
      vi.spyOn(lock, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00, 0x00]))
      const response = await lock.operateLock(WoSmartLockCommands.LOCK, false)
      expect(response).toBeDefined()
    })
  })
})
