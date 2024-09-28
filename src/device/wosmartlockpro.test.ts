import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'
import { expect } from 'chai'
import sinon from 'sinon'

import { WoSmartLockPro } from './wosmartlockpro.js'

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
      expect(lock._key_id).to.equal(keyId)
      expect(lock._encryption_key?.toString('hex')).to.equal(encryptionKey)
    })
  })

  describe('unlock', () => {
    it('should unlock the smart lock', async () => {
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(Buffer.from([0x01]))
      const result = await lock.unlock()
      expect(result).to.equal(WoSmartLockPro.Result.SUCCESS)
      return expect(operateLockProStub.calledOnceWith(WoSmartLockPro.COMMAND_UNLOCK)).to.be.true
    })
  })

  describe('unlockNoUnlatch', () => {
    it('should unlock the smart lock without unlatching', async () => {
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(Buffer.from([0x01]))
      const result = await lock.unlockNoUnlatch()
      expect(result).to.equal(WoSmartLockPro.Result.SUCCESS)
      return expect(operateLockProStub.calledOnceWith(WoSmartLockPro.COMMAND_UNLOCK_NO_UNLATCH)).to.be.true
    })
  })

  describe('lock', () => {
    it('should lock the smart lock', async () => {
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(Buffer.from([0x01]))
      const result = await lock.lock()
      expect(result).to.equal(WoSmartLockPro.Result.SUCCESS)
      return expect(operateLockProStub.calledOnceWith(WoSmartLockPro.COMMAND_LOCK)).to.be.true
    })
  })

  describe('info', () => {
    it('should get the lock info', async () => {
      const resBuf = Buffer.from([0b10000000, 0b00100000])
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(resBuf)
      const result = await lock.info()
      expect(result).to.deep.equal({
        calibration: true,
        status: 'LOCKED',
        door_open: false,
        unclosed_alarm: true,
        unlocked_alarm: false,
      })
      return expect(operateLockProStub.calledOnceWith(WoSmartLockPro.COMMAND_LOCK_INFO)).to.be.true
    })
  })

  describe('encrypt', () => {
    it('should encrypt a string', async () => {
      const str = 'test'
      lock._encryption_key = Buffer.from('0123456789abcdef0123456789abcdef', 'hex')
      lock._iv = Buffer.from('0123456789abcdef', 'hex')
      const encrypted = await lock.encrypt(str)
      expect(encrypted).to.be.a('string')
    })
  })

  describe('decrypt', () => {
    it('should decrypt a buffer', async () => {
      const data = Buffer.from('74657374', 'hex') // 'test' in hex
      lock._encryption_key = Buffer.from('0123456789abcdef0123456789abcdef', 'hex')
      lock._iv = Buffer.from('0123456789abcdef', 'hex')
      const decrypted = await lock.decrypt(data)
      expect(decrypted.toString()).to.equal('test')
    })
  })

  describe('getIv', () => {
    it('should get the IV', async () => {
      const res = Buffer.from('00000000000000000000000000000000', 'hex')
      const operateLockProStub = sinon.stub(lock, 'operateLockPro').resolves(res)
      const iv = await lock.getIv()
      expect(iv).to.deep.equal(res.subarray(4))
      return expect(operateLockProStub.calledOnceWith(WoSmartLockPro.COMMAND_GET_CK_IV + lock._key_id, false)).to.be.true
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
      expect(result).to.be.instanceOf(Buffer)
    })
  })

  describe('operateLockPro', () => {
    it('should operate the lock with encryption', async () => {
      const key = 'testKey'
      const encryptedCommandStub = sinon.stub(lock, 'encryptedCommand').resolves(Buffer.from('01000000', 'hex'))
      const result = await lock.operateLockPro(key)
      expect(result).to.be.instanceOf(Buffer)
      return expect(encryptedCommandStub.calledOnceWith(key)).to.be.true
    })

    it('should operate the lock without encryption', async () => {
      const key = 'testKey'
      const resBuf = Buffer.from('01000000', 'hex')
      sinon.stub(lock, 'command').resolves(resBuf)
      const result = await lock.operateLockPro(key, false)
      expect(result).to.be.instanceOf(Buffer)
    })
  })
})
