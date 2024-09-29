/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wosmartlockpro.test.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'
import sinon from 'sinon'

import { WoSmartLockPro } from '../device/wosmartlockpro.js'
import { WoSmartLockProCommands } from '../settings.js'

describe('woSmartLockPro', () => {
  let lock: WoSmartLockPro
  let mockPeripheral: any
  let mockNoble: any

  beforeEach(() => {
    mockPeripheral = {}
    mockNoble = sinon.stub(Noble)
    lock = new WoSmartLockPro(mockPeripheral, mockNoble)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('setKey', () => {
    it('should set the key id and encryption key', async () => {
      const keyId = 'testKeyId'
      const encryptionKey = '0123456789abcdef0123456789abcdef'
      await lock.setKey(keyId, encryptionKey)
      expect(lock.key_id).toBe(keyId)
      expect(lock.encryption_key?.toString('hex')).toBe(encryptionKey)
    })
  })

  describe('unlock', () => {
    it('should unlock the smart lock', async () => {
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(Buffer.from([0x01]))
      const result = await lock.unlock()
      expect(result).toBe(WoSmartLockPro.Result.SUCCESS)
      expect(operateLockProStub.calledOnceWith(WoSmartLockProCommands.UNLOCK)).toBe(true)
    })
  })

  describe('unlockNoUnlatch', () => {
    it('should unlock the smart lock without unlatching', async () => {
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(Buffer.from([0x01]))
      const result = await lock.unlockNoUnlatch()
      expect(result).toBe(WoSmartLockPro.Result.SUCCESS)
      expect(operateLockProStub.calledOnceWith(WoSmartLockProCommands.UNLOCK_NO_UNLATCH)).toBe(true)
    })
  })

  describe('lock', () => {
    it('should lock the smart lock', async () => {
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(Buffer.from([0x01]))
      const result = await lock.lock()
      expect(result).toBe(WoSmartLockPro.Result.SUCCESS)
      expect(operateLockProStub.calledOnceWith(WoSmartLockProCommands.LOCK)).toBe(true)
    })
  })

  describe('info', () => {
    it('should get the lock info', async () => {
      const resBuf = Buffer.from([0b10000000, 0b00100000])
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(resBuf)
      const result = await lock.info()
      expect(result).toEqual({
        calibration: true,
        status: 'LOCKED',
        door_open: false,
        unclosed_alarm: true,
        unlocked_alarm: false,
      })
      expect(operateLockProStub.calledOnceWith(WoSmartLockProCommands.LOCK_INFO)).toBe(true)
    })
  })

  describe('encrypt', () => {
    it('should encrypt a string', async () => {
      const str = 'test'
      lock.encryption_key = Buffer.from('0123456789abcdef0123456789abcdef', 'hex')
      lock.iv = Buffer.from('0123456789abcdef', 'hex')
      const encrypted = await lock.encrypt(str)
      expect(typeof encrypted).toBe('string')
    })
  })

  describe('decrypt', () => {
    it('should decrypt a buffer', async () => {
      const data = Buffer.from('74657374', 'hex') // 'test' in hex
      lock.encryption_key = Buffer.from('0123456789abcdef0123456789abcdef', 'hex')
      lock.iv = Buffer.from('0123456789abcdef', 'hex')
      const decrypted = await lock.decrypt(data)
      expect(decrypted.toString()).toBe('test')
    })
  })

  describe('getIv', () => {
    it('should get the IV', async () => {
      const res = Buffer.from('00000000000000000000000000000000', 'hex')
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(res)
      const iv = await lock.getIv()
      expect(iv).toEqual(res.subarray(4))
      expect(operateLockProStub.calledOnceWith(WoSmartLockProCommands.GET_CKIV + lock.key_id, false)).toBe(true)
    })
  })

  describe('encryptedCommand', () => {
    it('should send an encrypted command', async () => {
      const key = 'testKey'
      const iv = Buffer.from('0123456789abcdef', 'hex')
      const encrypted = 'encryptedString'
      const resBuf = Buffer.from('01000000', 'hex')
      sinon.stub(lock, 'getIv').resolves(iv)
      sinon.stub(lock, 'encrypt').resolves(encrypted)
      sinon.stub(lock, 'command').resolves(resBuf)
      sinon.stub(lock, 'decrypt').resolves(Buffer.from('decrypted', 'hex'))
      const result = await lock.encryptedCommand(key)
      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('operateLock', () => {
    it('should operate the lock with encryption', async () => {
      const key = 'testKey'
      const encryptedCommandStub = sinon.stub(lock, 'encryptedCommand').resolves(Buffer.from('01000000', 'hex'))
      const result = await lock.operateLockPro(key)
      expect(result).toBeInstanceOf(Buffer)
      expect(encryptedCommandStub.calledOnceWith(key)).toBe(true)
    })

    it('should operate the lock without encryption', async () => {
      const key = 'testKey'
      const resBuf = Buffer.from('01000000', 'hex')
      sinon.stub(lock, 'command').resolves(resBuf)
      const result = await lock.operateLockPro(key, false)
      expect(result).toBeInstanceOf(Buffer)
    })
  })
})
