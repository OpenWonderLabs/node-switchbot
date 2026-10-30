/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils/sensor-advertisement.ts: Passive sensor readings from BLE advertisements
 *
 * Meters, contact, motion and leak sensors report their state in their advertisements, and
 * pySwitchbot reads them that way without ever connecting (switchbot/adv_parsers/meter.py,
 * contact.py, motion.py, leak.py). Many of these sensors refuse GATT connections.
 *
 * `mfrData` is the SwitchBot manufacturer data payload after the 2-byte company ID (0x0969), as
 * pySwitchbot's `mfr_data`.
 */

import { Buffer } from 'node:buffer'

/** Readings parsed from a passive sensor advertisement */
export interface SensorAdvertisement {
  /** Set when the advertisement carried a sensor reading */
  sensor: true
  battery?: number
  temperature?: number
  humidity?: number
  fahrenheit?: boolean
  co2?: number
  openState?: 'open' | 'closed' | 'timeout'
  movement?: boolean
  brightness?: 'bright' | 'dim'
  waterLeakDetected?: boolean
  tampered?: boolean
}

const METER_MODELS = new Set(['T', 't', 'i', 'I', '4', '\x14', '5', '\x15', 'w', 'W'])
const CO2_MODELS = new Set(['5', '\x15'])
const CONTACT_MODELS = new Set(['d', 'D'])
const MOTION_MODELS = new Set(['s', 'S'])
const LEAK_MODELS = new Set(['&', '\x06'])

// Meter Pro CO2 spec range is 400-9999 ppm; higher values are parsing artifacts (pySwitchbot)
const CO2_MAX_PPM = 9999

/** Advertisement model codes whose state is read passively, without connecting */
export function isPassiveSensorModel(model: string): boolean {
  return METER_MODELS.has(model) || CONTACT_MODELS.has(model) || MOTION_MODELS.has(model) || LEAK_MODELS.has(model)
}

/**
 * The SwitchBot manufacturer data payload after the company ID, or undefined for other vendors.
 * noble includes the little-endian company ID (0x69 0x09) in `manufacturerData`.
 */
export function switchBotManufacturerPayload(manufacturerData: unknown): Buffer | undefined {
  if (!Buffer.isBuffer(manufacturerData) || manufacturerData.length < 2) {
    return undefined
  }
  if (manufacturerData[0] !== 0x69 || manufacturerData[1] !== 0x09) {
    return undefined
  }
  return manufacturerData.subarray(2)
}

function decodeTempHumidity(t: Buffer): Pick<SensorAdvertisement, 'temperature' | 'humidity' | 'fahrenheit'> | undefined {
  const sign = (t[1] & 0x80) ? 1 : -1
  const temperature = sign * ((t[1] & 0x7F) + (t[0] & 0x0F) / 10)
  const humidity = t[2] & 0x7F
  if (temperature === 0 && humidity === 0) {
    return undefined
  }
  return { temperature: Math.round(temperature * 10) / 10, humidity, fahrenheit: (t[2] & 0x80) !== 0 }
}

function parseMeter(model: string, data: Buffer, mfr?: Buffer): SensorAdvertisement | undefined {
  let tempData: Buffer | undefined
  if (mfr && mfr.length >= 11) {
    tempData = mfr.subarray(8, 11)
  } else if (data.length >= 6) {
    tempData = data.subarray(3, 6)
  }
  if (!tempData) {
    return undefined
  }
  const reading = decodeTempHumidity(tempData)
  if (!reading) {
    return undefined
  }
  const result: SensorAdvertisement = { sensor: true, ...reading }
  if (data.length >= 3) {
    result.battery = data[2] & 0x7F
  }
  if (CO2_MODELS.has(model) && mfr && mfr.length >= 15) {
    const co2 = mfr.readUInt16BE(13)
    if (co2 <= CO2_MAX_PPM) {
      result.co2 = co2
    }
  }
  return result
}

function parseContact(data: Buffer, mfr?: Buffer): SensorAdvertisement | undefined {
  const fullMfr = !!mfr && mfr.length >= 13
  const fullData = data.length >= 9
  if (!fullMfr && !fullData) {
    return undefined
  }
  let open: boolean
  let timeout: boolean
  let movement: boolean
  let light: boolean
  if (fullMfr) {
    movement = (mfr![7] & 0x80) !== 0
    open = (mfr![7] & 0x10) !== 0
    timeout = (mfr![7] & 0x20) !== 0
    light = (mfr![7] & 0x40) !== 0
  } else {
    movement = (data[1] & 0x40) !== 0
    open = (data[3] & 0x02) !== 0
    timeout = (data[3] & 0x04) !== 0
    light = (data[3] & 0x01) !== 0
  }
  return {
    sensor: true,
    battery: data.length >= 3 ? data[2] & 0x7F : undefined,
    // A timeout still means the door is open (pySwitchbot)
    openState: timeout ? 'timeout' : open ? 'open' : 'closed',
    movement,
    brightness: light ? 'bright' : 'dim',
  }
}

function parseMotion(data: Buffer, mfr?: Buffer): SensorAdvertisement | undefined {
  let movement: boolean | undefined
  let light: boolean | undefined
  let battery: number | undefined
  if (data.length >= 6) {
    movement = (data[1] & 0x40) !== 0
    battery = data[2] & 0x7F
    light = (data[5] & 0x02) !== 0
  }
  if (mfr && mfr.length >= 8) {
    movement = (mfr[7] & 0x40) !== 0
    light = (mfr[7] & 0x20) !== 0
  }
  if (movement === undefined) {
    return undefined
  }
  return { sensor: true, battery, movement, brightness: light ? 'bright' : 'dim' }
}

function parseLeak(mfr?: Buffer): SensorAdvertisement | undefined {
  if (!mfr || mfr.length < 9) {
    return undefined
  }
  return {
    sensor: true,
    battery: mfr[7] & 0x7F,
    waterLeakDetected: (mfr[8] & 0x01) !== 0,
    tampered: (mfr[8] & 0x02) !== 0,
  }
}

/**
 * Parse a passive sensor's readings from its service data and manufacturer data payload.
 * Returns undefined for other models, or when the advertisement carries no reading.
 */
export function parseSensorAdvertisement(model: string, data: Buffer, mfr?: Buffer): SensorAdvertisement | undefined {
  if (METER_MODELS.has(model)) {
    return parseMeter(model, data, mfr)
  }
  if (CONTACT_MODELS.has(model)) {
    return parseContact(data, mfr)
  }
  if (MOTION_MODELS.has(model)) {
    return parseMotion(data, mfr)
  }
  if (LEAK_MODELS.has(model)) {
    return parseLeak(mfr)
  }
  return undefined
}
