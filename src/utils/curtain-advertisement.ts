/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils/curtain-advertisement.ts: Curtain and Curtain 3 state from BLE advertisements
 *
 * Ported from pySwitchbot (switchbot/adv_parsers/curtain.py, process_wocurtain). The state is read
 * from the manufacturer data when it carries it, otherwise from the service data. `mfr` is the
 * SwitchBot manufacturer data payload after the 2-byte company ID (0x0969), as pySwitchbot's
 * `mfr_data`.
 */

import type { Buffer } from 'node:buffer'

/** Curtain state parsed from an advertisement */
export interface CurtainAdvertisement {
  /**
   * Position as the curtain reports it, 0 (open) to 100 (closed). pySwitchbot reverses it by
   * default; node-switchbot keeps the reported value, as it always has.
   */
  position: number
  inMotion: boolean
  /** Light level, 1-10 */
  lightLevel: number
  deviceChain: number
  calibration?: boolean
  battery?: number
}

/**
 * Parse a Curtain or Curtain 3 advertisement. Returns undefined when neither the manufacturer
 * data nor the service data is long enough to carry the state.
 */
export function parseCurtainAdvertisement(data: Buffer | undefined, mfr: Buffer | undefined): CurtainAdvertisement | undefined {
  let deviceData: Buffer
  let batteryByte: number | undefined
  if (mfr && mfr.length >= 13) {
    // Curtain 3: state and battery in the manufacturer data
    deviceData = mfr.subarray(8, 11)
    batteryByte = mfr[12]
  } else if (mfr && mfr.length >= 11) {
    deviceData = mfr.subarray(8, 11)
    batteryByte = data && data.length >= 3 ? data[2] : undefined
  } else if (data && data.length >= 6) {
    deviceData = data.subarray(3, 6)
    batteryByte = data[2]
  } else {
    return undefined
  }

  return {
    position: Math.max(0, Math.min(100, deviceData[0] & 0x7F)),
    inMotion: (deviceData[0] & 0x80) !== 0,
    lightLevel: (deviceData[1] >> 4) & 0x0F,
    deviceChain: deviceData[1] & 0x07,
    calibration: data && data.length >= 2 ? (data[1] & 0x40) !== 0 : undefined,
    battery: batteryByte === undefined ? undefined : batteryByte & 0x7F,
  }
}
