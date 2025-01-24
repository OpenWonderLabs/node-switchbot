import type { lockProServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoSmartLockPro } from '../device/wosmartlockpro.js'
import { WoSmartLockProCommands } from '../settings.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woSmartLockPro', () => {
  let lock: WoSmartLockPro
  let mockPeripheral: NobleTypes['peripheral']
  let mockNoble: NobleTypes['noble']

  beforeEach(() => {
    mockPeripheral = {} as NobleTypes['peripheral']
    mockNoble = {} as NobleTypes['noble']
    lock = new WoSmartLockPro(mockPeripheral, mockNoble)
  })

  describe('parseServiceData', () => {
    it('should return null if buffer length is not 18', async () => {
      const serviceData = Buffer.alloc(10)
      const manufacturerData = Buffer.alloc(0)
      const emitLog = vi.fn()
      const result = await WoSmartLockPro.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoLockPro] Buffer length 10 !== 18!')
    })

    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0, 0, 0, 255, 128, 64, 0, 129, 136, 127, 254, 0, 0, 0, 0, 0, 0, 0])
      const manufacturerData = Buffer.alloc(0)
      const emitLog = vi.fn()
      const result = await WoSmartLockPro.parseServiceData(serviceData, manufacturerData, emitLog)
      const expected: lockProServiceData = {
        model: SwitchBotBLEModel.LockPro,
        modelName: SwitchBotBLEModelName.LockPro,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.LockPro,
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

  describe('validateResponse', () => {
    it('should return SUCCESS for valid response', async () => {
      const res = Buffer.from([0x01, 0x00, 0x00])
      const result = await WoSmartLockPro.validateResponse(res)
      expect(result).toBe(WoSmartLockPro.Result.SUCCESS)
    })

    it('should return ERROR for invalid response', async () => {
      const res = Buffer.from([0x00, 0x00, 0x00])
      const result = await WoSmartLockPro.validateResponse(res)
      expect(result).toBe(WoSmartLockPro.Result.ERROR)
    })
  })

  describe('getLockStatus', () => {
    it('should return LOCKED for code 0b0000000', () => {
      const status = WoSmartLockPro.getLockStatus(0b0000000)
      expect(status).toBe('LOCKED')
    })

    it('should return UNKNOWN for unknown code', () => {
      const status = WoSmartLockPro.getLockStatus(0b1111111)
      expect(status).toBe('UNKNOWN')
    })
  })

  describe('setKey', () => {
    it('should set the key ID and encryption key', async () => {
      await lock.setKey('keyId', 'encryptionKey')
      expect(lock.key_id).toBe('keyId')
      expect(lock.encryption_key).toEqual(Buffer.from('encryptionKey', 'hex'))
    })
  })

  describe('unlock', () => {
    it('should unlock the lock', async () => {
      vi.spyOn(lock, 'operateLockPro').mockResolvedValue(Buffer.from([0x01]))
      const result = await lock.unlock()
      expect(result).toBe(WoSmartLockPro.Result.SUCCESS)
    })
  })

  describe('lock', () => {
    it('should lock the lock', async () => {
      vi.spyOn(lock, 'operateLockPro').mockResolvedValue(Buffer.from([0x01]))
      const result = await lock.lock()
      expect(result).toBe(WoSmartLockPro.Result.SUCCESS)
    })
  })

  describe('info', () => {
    it('should return lock info', async () => {
      const mockResponse = Buffer.from([0b10000000, 0b00100000])
      vi.spyOn(lock, 'operateLockPro').mockResolvedValue(mockResponse)
      const info = await lock.info()
      expect(info).toEqual({
        calibration: true,
        status: 'LOCKED',
        door_open: false,
        unclosed_alarm: true,
        unlocked_alarm: false,
      })
    })
  })

  describe('encrypt', () => {
    it('should encrypt a string', async () => {
      lock.encryption_key = Buffer.from('encryptionKey', 'hex')
      lock.iv = Buffer.from('iv', 'hex')
      const encrypted = await lock.encrypt('test')
      expect(encrypted).toBeDefined()
    })
  })

  describe('decrypt', () => {
    it('should decrypt a buffer', async () => {
      lock.encryption_key = Buffer.from('encryptionKey', 'hex')
      lock.iv = Buffer.from('iv', 'hex')
      const decrypted = await lock.decrypt(Buffer.from('test', 'hex'))
      expect(decrypted).toBeDefined()
    })
  })

  describe('getIv', () => {
    it('should retrieve the IV from the device', async () => {
      const mockResponse = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01, 0x02])
      vi.spyOn(lock, 'operateLockPro').mockResolvedValue(mockResponse)
      const iv = await lock.getIv()
      expect(iv).toEqual(Buffer.from([0x01, 0x02]))
    })
  })

  describe('encryptedCommand', () => {
    it('should send an encrypted command to the device', async () => {
      vi.spyOn(lock, 'getIv').mockResolvedValue(Buffer.from([0x01, 0x02]))
      vi.spyOn(lock, 'encrypt').mockResolvedValue('encrypted')
      vi.spyOn(lock, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x01, 0x02]))
      const response = await lock.encryptedCommand('key')
      expect(response).toBeDefined()
    })
  })

  describe('operateLockPro', () => {
    it('should operate the lock with encryption', async () => {
      vi.spyOn(lock, 'encryptedCommand').mockResolvedValue(Buffer.from([0x01]))
      const response = await lock.operateLockPro(WoSmartLockProCommands.LOCK)
      expect(response).toBeDefined()
    })

    it('should operate the lock without encryption', async () => {
      vi.spyOn(lock, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00, 0x00]))
      const response = await lock.operateLockPro(WoSmartLockProCommands.LOCK, false)
      expect(response).toBeDefined()
    })
  })
})
