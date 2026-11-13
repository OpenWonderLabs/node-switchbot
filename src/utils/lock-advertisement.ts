/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils/lock-advertisement.ts: Lock state from BLE advertisements
 *
 * Ported from pySwitchbot (switchbot/adv_parsers/lock.py). Locks report their state in the
 * manufacturer data, with a layout that depends on the lock family. `mfr` is the SwitchBot
 * manufacturer data payload after the 2-byte company ID (0x0969), as pySwitchbot's `mfr_data`.
 */

import type { Buffer } from 'node:buffer'

/**
 * Lock status values, as pySwitchbot's LockStatus (switchbot/const/lock.py)
 */
export enum LockStatusCode {
  Locked = 0,
  Unlocked = 1,
  Locking = 2,
  Unlocking = 3,
  /** Locking blocked (jammed) */
  LockingStop = 4,
  /** Unlocking blocked (jammed) */
  UnlockingStop = 5,
  /** Latch locked; EU lock type only */
  NotFullyLocked = 6,
  /** Half locked; Lock Ultra EU lock type only */
  HalfLocked = 7,
}

/**
 * Lock families with different advertisement layouts, named after pySwitchbot's parsers:
 * - `lock`: Lock (process_wolock)
 * - `lite`: Lock Lite, Lock Vision (process_locklite)
 * - `pro`: Lock Pro, Lock Pro WiFi (process_wolock_pro)
 * - `lock2`: Lock Ultra, Lock Ultra Max, UWB Lock, Lock Vision Pro (process_lock2)
 * - `nano`: Lock Nano (process_lock_nano)
 */
export type LockFamily = 'lock' | 'lite' | 'pro' | 'lock2' | 'nano'

/** Lock state parsed from an advertisement */
export interface LockAdvertisement {
  sequenceNumber: number
  /** LockStatusCode */
  status: number
  lockState: 'locked' | 'unlocked' | 'jammed'
  calibration: boolean
  battery?: number
  doorOpen?: boolean
  autoLockPaused?: boolean
  nightLatch?: boolean
  doubleLockMode?: boolean
  unlockedAlarm?: boolean
  unclosedAlarm?: boolean
  updateFromSecondaryLock?: boolean
  isSecondaryLock?: boolean
  manualUnlockLinkage?: boolean
  lowTemperatureAlarm?: boolean
  powerAlarm?: boolean
  batteryStatus?: number
  /** Lock Nano */
  chargingStatus?: number
  batteryCharging?: boolean
  chargingFault?: boolean
}

/**
 * The lock state reported to consumers. Moving states report where the lock is heading, and a
 * blocked motor reports `jammed`; latch locked and half locked are locked.
 */
export function lockStateFromStatus(status: number): 'locked' | 'unlocked' | 'jammed' {
  switch (status) {
    case LockStatusCode.Unlocked:
    case LockStatusCode.Unlocking:
      return 'unlocked'
    case LockStatusCode.LockingStop:
    case LockStatusCode.UnlockingStop:
      return 'jammed'
    default:
      return 'locked'
  }
}

function withState(status: number, fields: Omit<LockAdvertisement, 'status' | 'lockState'>): LockAdvertisement {
  return { ...fields, status, lockState: lockStateFromStatus(status) }
}

/** process_locklite */
function parseLite(data: Buffer | undefined, mfr: Buffer): LockAdvertisement | undefined {
  if (mfr.length < 9) {
    return undefined
  }
  return withState((mfr[7] & 0b01110000) >> 4, {
    sequenceNumber: mfr[6],
    battery: data && data.length >= 3 ? data[2] & 0x7F : undefined,
    calibration: (mfr[7] & 0b10000000) !== 0,
    updateFromSecondaryLock: (mfr[7] & 0b00001000) !== 0,
    doubleLockMode: (mfr[8] & 0b10000000) !== 0,
    unlockedAlarm: (mfr[8] & 0b00010000) !== 0,
    nightLatch: mfr.length > 9 ? (mfr[9] & 0b00000001) !== 0 : false,
  })
}

/** process_wolock: Lock Lite fields plus door and alarm bits */
function parseLock(data: Buffer | undefined, mfr: Buffer): LockAdvertisement | undefined {
  const common = parseLite(data, mfr)
  if (!common) {
    return undefined
  }
  return {
    ...common,
    doorOpen: (mfr[7] & 0b00000100) !== 0,
    unclosedAlarm: (mfr[8] & 0b00100000) !== 0,
    autoLockPaused: (mfr[8] & 0b00000010) !== 0,
  }
}

/** parse_common_data: shared by Lock Pro and Lock 2 */
function parseCommon(mfr: Buffer): LockAdvertisement | undefined {
  if (mfr.length < 12) {
    return undefined
  }
  return withState((mfr[7] & 0b01111000) >> 3, {
    sequenceNumber: mfr[6],
    calibration: (mfr[7] & 0b10000000) !== 0,
    updateFromSecondaryLock: (mfr[8] & 0b11000000) !== 0,
    doorOpen: (mfr[8] & 0b00010000) !== 0,
    autoLockPaused: (mfr[8] & 0b00001000) !== 0,
    battery: mfr[9] & 0x7F,
    doubleLockMode: (mfr[10] & 0b10000000) !== 0,
    isSecondaryLock: (mfr[10] & 0b01000000) !== 0,
    manualUnlockLinkage: (mfr[10] & 0b00100000) !== 0,
    unclosedAlarm: (mfr[11] & 0b10000000) !== 0,
    unlockedAlarm: (mfr[11] & 0b01000000) !== 0,
    nightLatch: false,
  })
}

/** process_lock_nano */
function parseNano(mfr: Buffer): LockAdvertisement | undefined {
  if (mfr.length < 11) {
    return undefined
  }
  const chargingStatus = ((mfr[8] & 1) << 1) | (mfr[9] >> 7)
  return withState((mfr[7] & 0x78) >> 3, {
    sequenceNumber: mfr[6],
    calibration: (mfr[7] & 0x80) !== 0,
    autoLockPaused: (mfr[8] & 0x08) !== 0,
    nightLatch: (mfr[8] & 0x02) !== 0,
    battery: mfr[9] & 0x7F,
    chargingStatus,
    batteryCharging: chargingStatus === 1,
    unlockedAlarm: (mfr[10] & 0x40) !== 0,
    lowTemperatureAlarm: (mfr[10] & 0x20) !== 0,
    powerAlarm: (mfr[10] & 0x10) !== 0,
    batteryStatus: (mfr[10] >> 1) & 0x03,
    chargingFault: (mfr[10] & 0x01) !== 0,
  })
}

/**
 * Parse a lock's advertisement. Returns undefined when the manufacturer data is missing or too
 * short for the family's layout.
 */
export function parseLockAdvertisement(family: LockFamily, data: Buffer | undefined, mfr: Buffer | undefined): LockAdvertisement | undefined {
  if (!mfr) {
    return undefined
  }
  switch (family) {
    case 'lite':
      return parseLite(data, mfr)
    case 'lock':
      return parseLock(data, mfr)
    case 'pro': {
      const common = parseCommon(mfr)
      return common && { ...common, lowTemperatureAlarm: (mfr[11] & 0b00100000) !== 0 }
    }
    case 'lock2': {
      const common = parseCommon(mfr)
      return common && { ...common, powerAlarm: (mfr[11] & 0b00010000) !== 0, batteryStatus: mfr[11] & 0b00000111 }
    }
    case 'nano':
      return parseNano(mfr)
  }
}

/** The advertisement layout for each lock device type (DEVICE_MODEL_MAP / product ID names) */
export const LOCK_FAMILY_BY_DEVICE_TYPE: Record<string, LockFamily> = {
  'Lock': 'lock',
  'Lock Lite': 'lite',
  'Lock Vision': 'lite',
  'Lock Pro': 'pro',
  'Lock Pro WiFi': 'pro',
  'Lock Ultra': 'lock2',
  'Lock Ultra Max': 'lock2',
  'UWB Lock': 'lock2',
  'Lock Vision Pro': 'lock2',
  'Lock Nano': 'nano',
}
