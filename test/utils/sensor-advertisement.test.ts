import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { isPassiveSensorModel, parseSensorAdvertisement, switchBotManufacturerPayload } from '../../src/utils/sensor-advertisement.js'

// Fixtures are pySwitchbot's own (tests/test_adv_parser.py), with the values it expects.
const hex = (value: string) => Buffer.from(value, 'hex')
const COMPANY_ID = hex('6909')

describe('parseSensorAdvertisement (pySwitchbot fixtures)', () => {
  it('meter: reads temperature and humidity from manufacturer data', () => {
    expect(parseSensorAdvertisement('T', hex('5400e4069835'), hex('d7c17d5deb43de03069835'))).toEqual({
      sensor: true,
      battery: 100,
      temperature: 24.6,
      humidity: 53,
      fahrenheit: false,
    })
  })

  it('meter: falls back to service data without manufacturer data', () => {
    expect(parseSensorAdvertisement('T', hex('5400e4069835'))).toMatchObject({ temperature: 24.6, humidity: 53, battery: 100 })
  })

  it('meter: no reading from an all-zero payload', () => {
    expect(parseSensorAdvertisement('T', hex('5400e4000000'))).toBeUndefined()
  })

  it('meter pro CO2: reads CO2 and the fahrenheit flag', () => {
    expect(parseSensorAdvertisement('5', hex('350064'), hex('b0e9fe543215b7e4079ba4003702d500'))).toEqual({
      sensor: true,
      battery: 100,
      temperature: 27.7,
      humidity: 36,
      fahrenheit: true,
      co2: 725,
    })
  })

  it('meter pro CO2: drops out-of-range CO2', () => {
    const result = parseSensorAdvertisement('5', hex('350064'), hex('b0e9fe543215b7e4079ba400379c4000'))
    expect(result?.co2).toBeUndefined()
    expect(result?.temperature).toBe(27.7)
  })

  it('contact: a timeout reports the door as open', () => {
    expect(parseSensorAdvertisement('d', hex('6400da040046018fc4'), hex('cb39cdc43d46412c0046018fc4'))).toEqual({
      sensor: true,
      battery: 90,
      openState: 'timeout',
      movement: false,
      brightness: 'dim',
    })
  })

  it('motion: motion detected', () => {
    expect(parseSensorAdvertisement('s', hex('7340e2003801'), hex('c0219ae8bc49695c0038'))).toMatchObject({
      movement: true,
      brightness: 'dim',
      battery: 98,
    })
  })

  it('leak: no leak, battery 78', () => {
    expect(parseSensorAdvertisement('&', hex('26004e'), hex('c43430374c7a184e98675e94513c0500000000'))).toEqual({
      sensor: true,
      battery: 78,
      waterLeakDetected: false,
      tampered: false,
    })
  })

  it('leak: leak detected', () => {
    expect(parseSensorAdvertisement('&', hex('260064'), hex('c43430374c7a4764f96761c4083c0500000000'))).toMatchObject({
      waterLeakDetected: true,
      battery: 100,
    })
  })

  it('ignores other models', () => {
    expect(parseSensorAdvertisement('H', hex('48000064'))).toBeUndefined()
    expect(isPassiveSensorModel('H')).toBe(false)
    expect(isPassiveSensorModel('T')).toBe(true)
  })
})

describe('switchBotManufacturerPayload', () => {
  it('strips the SwitchBot company ID', () => {
    expect(switchBotManufacturerPayload(Buffer.concat([COMPANY_ID, hex('aabb')]))?.toString('hex')).toBe('aabb')
  })

  it('ignores other vendors', () => {
    expect(switchBotManufacturerPayload(hex('4c000215'))).toBeUndefined()
    expect(switchBotManufacturerPayload(undefined)).toBeUndefined()
  })
})
