import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { isKnownLockStatus, lockStateFromStatus, LockStatusCode, parseLockAdvertisement } from '../../src/utils/lock-advertisement.js'

// Fixtures and expected values are pySwitchbot's (tests/test_adv_parser.py, the lock cases).
// `mfr` is the manufacturer data after the company ID; `data` is the service data.
const hex = (value: string) => Buffer.from(value, 'hex')

describe('parseLockAdvertisement (pySwitchbot fixtures)', () => {
  it('lock Lite', () => {
    expect(parseLockAdvertisement('lite', hex('2d8064'), hex('e9d511b26b5317930820'))).toMatchObject({
      sequenceNumber: 23,
      battery: 100,
      calibration: true,
      status: LockStatusCode.Unlocked,
      lockState: 'unlocked',
      unlockedAlarm: false,
      nightLatch: false,
    })
  })

  it('lock', () => {
    expect(parseLockAdvertisement('lock', hex('6f8064'), hex('eef5e6098fe811970820'))).toMatchObject({
      sequenceNumber: 17,
      battery: 100,
      calibration: true,
      status: LockStatusCode.Unlocked,
      doorOpen: true,
      unlockedAlarm: false,
      autoLockPaused: false,
      nightLatch: false,
    })
  })

  it('lock Pro', () => {
    expect(parseLockAdvertisement('pro', hex('248064'), hex('f7610748e6e83a8a00640000'))).toMatchObject({
      sequenceNumber: 58,
      battery: 100,
      calibration: true,
      status: LockStatusCode.Unlocked,
      doorOpen: false,
      lowTemperatureAlarm: false,
      unlockedAlarm: false,
      autoLockPaused: false,
      nightLatch: false,
    })
  })

  it('lock Ultra (Lock 2 layout)', () => {
    expect(parseLockAdvertisement('lock2', hex('0080340010a5b8'), hex('b0e9feb66a3d258230340004'))).toMatchObject({
      sequenceNumber: 37,
      battery: 52,
      calibration: true,
      status: LockStatusCode.Locked,
      lockState: 'locked',
      doorOpen: true,
      unlockedAlarm: false,
      autoLockPaused: false,
      powerAlarm: false,
      batteryStatus: 4,
    })
  })

  it('lock Vision (Lock Lite layout)', () => {
    expect(parseLockAdvertisement('lite', hex('00802e00116908'), hex('b0e9fe6fc9a60a00002e000c00000000'))).toMatchObject({
      sequenceNumber: 10,
      calibration: false,
      status: LockStatusCode.Locked,
      unlockedAlarm: false,
      nightLatch: false,
    })
  })

  it('lock Vision Pro (Lock 2 layout)', () => {
    expect(parseLockAdvertisement('lock2', hex('00803300116909'), hex('b0e9fee61a7103000033000c00000000'))).toMatchObject({
      sequenceNumber: 3,
      battery: 51,
      status: LockStatusCode.Locked,
      doorOpen: false,
      powerAlarm: false,
      batteryStatus: 4,
    })
  })

  it('lock Pro WiFi (Lock Pro layout)', () => {
    expect(parseLockAdvertisement('pro', hex('00803d0010ff90'), hex('b0e9feb05efe0e02003d0008'))).toMatchObject({
      sequenceNumber: 14,
      battery: 61,
      status: LockStatusCode.Locked,
      lowTemperatureAlarm: false,
    })
  })

  it('lock Ultra Max and UWB Lock (Lock 2 layout)', () => {
    for (const data of ['00806400119fb8', '00806400121100']) {
      expect(parseLockAdvertisement('lock2', hex(data), hex('b0e9fe1122332a8818640091'))).toMatchObject({
        sequenceNumber: 42,
        battery: 100,
        calibration: true,
        status: LockStatusCode.Unlocked,
        doorOpen: true,
        unlockedAlarm: false,
        autoLockPaused: true,
        powerAlarm: true,
        batteryStatus: 1,
      })
    }
  })

  it('lock Nano', () => {
    expect(parseLockAdvertisement('nano', hex('00806400122488'), hex('b0e9fe1122332a88086470'))).toEqual({
      sequenceNumber: 42,
      battery: 100,
      calibration: true,
      status: LockStatusCode.Unlocked,
      lockState: 'unlocked',
      autoLockPaused: true,
      nightLatch: false,
      chargingStatus: 0,
      batteryCharging: false,
      unlockedAlarm: true,
      lowTemperatureAlarm: true,
      powerAlarm: true,
      batteryStatus: 0,
      chargingFault: false,
    })
  })

  it('returns undefined for short or missing manufacturer data', () => {
    expect(parseLockAdvertisement('lock2', hex('00'), hex('b0e9fe1122'))).toBeUndefined()
    expect(parseLockAdvertisement('nano', hex('00'), undefined)).toBeUndefined()
  })
})

describe('lockStateFromStatus', () => {
  it('maps every pySwitchbot LockStatus', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(lockStateFromStatus)).toEqual([
      'locked',
      'unlocked',
      'locked',
      'unlocked',
      'jammed',
      'jammed',
      'locked',
      'locked',
    ])
  })

  it('has no state for values pySwitchbot does not define', () => {
    expect([8, 11, 13, 14, 15].map(lockStateFromStatus)).toEqual([undefined, undefined, undefined, undefined, undefined])
    expect(isKnownLockStatus(7)).toBe(true)
    expect(isKnownLockStatus(11)).toBe(false)
  })
})

// A Lock Ultra on firmware 3.1 reports status values 11, 13, 14 and 15 (SwitchBotAPI-BLE #54,
// pySwitchbot #595). They must be ignored, never read as locked (pySwitchbot PR #596).
describe('unknown lock status values', () => {
  // The Lock Ultra fixture with byte 7 (calibrated, status in bits 6-3) replaced
  const ultra = (status: number) => {
    const mfr = hex('b0e9feb66a3d258230340004')
    mfr[7] = 0x80 | (status << 3)
    return mfr
  }

  it.each([11, 13, 14, 15])('ignores status %i', (status) => {
    expect(parseLockAdvertisement('lock2', hex('0080340010a5b8'), ultra(status))).toBeNull()
  })

  it('still parses known values in the same layout', () => {
    expect(parseLockAdvertisement('lock2', hex('0080340010a5b8'), ultra(1))).toMatchObject({ status: 1, lockState: 'unlocked' })
  })

  it('ignores unknown values in the Lock Nano layout too', () => {
    const mfr = hex('b0e9fe1122332a88086470')
    mfr[7] = 0x80 | (15 << 3)
    expect(parseLockAdvertisement('nano', hex('00806400122488'), mfr)).toBeNull()
  })
})
