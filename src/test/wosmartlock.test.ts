import type { lockServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'
// wosmartlock.test.ts
import { WoSmartLock } from '../device/wosmartlock.js'

jest.mock('@stoprocent/noble')
jest.mock('crypto')

describe('woSmartLock', () => {
  let peripheral: Noble.Peripheral
  let noble: typeof Noble
  let smartLock: WoSmartLock

  beforeEach(() => {
    peripheral = {} as Noble.Peripheral
    noble = Noble
    smartLock = new WoSmartLock(peripheral, noble)
  })

  describe('getLockStatus', () => {
    it('should return correct lock status', () => {
      expect(WoSmartLock.getLockStatus(0b0000000)).toBe('LOCKED')
      expect(WoSmartLock.getLockStatus(0b0010000)).toBe('UNLOCKED')
      expect(WoSmartLock.getLockStatus(0b0100000)).toBe('LOCKING')
      expect(WoSmartLock.getLockStatus(0b0110000)).toBe('UNLOCKING')
      expect(WoSmartLock.getLockStatus(0b1000000)).toBe('LOCKING_STOP')
      expect(WoSmartLock.getLockStatus(0b1010000)).toBe('UNLOCKING_STOP')
      expect(WoSmartLock.getLockStatus(0b1100000)).toBe('NOT_FULLY_LOCKED')
      expect(WoSmartLock.getLockStatus(0b1110000)).toBe('UNKNOWN')
    })
  })

  describe('parseServiceData', () => {
    it('should parse service data correctly', async () => {
      const serviceData = Buffer.from([0x00, 0x00, 0x7F, 0x0A, 0x81, 0x80])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x20])
      const expectedData: lockServiceData = {
        model: SwitchBotBLEModel.Lock,
        modelName: SwitchBotBLEModelName.Lock,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Lock,
        battery: 127,
        calibration: false,
        status: 'UNLOCKED',
        update_from_secondary_lock: false,
        door_open: false,
        double_lock_mode: false,
        unclosed_alarm: false,
        unlocked_alarm: false,
        auto_lock_paused: false,
        night_latch: false,
      }

      const result = await WoSmartLock.parseServiceData(serviceData, manufacturerData, undefined)
      expect(result).toEqual(expectedData)
    })

    it('should return null if manufacturer data is too short', async () => {
      const serviceData = Buffer.from([0x00, 0x00, 0x7F, 0x0A, 0x81, 0x80])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00])
      const result = await WoSmartLock.parseServiceData(serviceData, manufacturerData, undefined)
      expect(result).toBeNull()
    })
  })

  describe('lock and unlock methods', () => {
    beforeEach(() => {
      jest.spyOn(smartLock, 'operateLock').mockResolvedValue(Buffer.from([0x01]))
    })

    it('should unlock the smart lock', async () => {
      const result = await smartLock.unlock()
      expect(result).toBe(WoSmartLock.Result.SUCCESS)
    })

    it('should lock the smart lock', async () => {
      const result = await smartLock.lock()
      expect(result).toBe(WoSmartLock.Result.SUCCESS)
    })

    it('should get lock info', async () => {
      const expectedData = {
        calibration: true,
        status: 'LOCKED',
        door_open: false,
        unclosed_alarm: false,
        unlocked_alarm: false,
      }
      jest.spyOn(smartLock, 'operateLock').mockResolvedValue(Buffer.from([0x01, 0b10000000, 0b00000000]))
      const result = await smartLock.info()
      expect(result).toEqual(expectedData)
    })
  })
})
