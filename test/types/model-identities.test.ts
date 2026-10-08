/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * model-identities.test.ts: product-specific model identities (parity with pySwitchbot 3.0.0)
 */

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { BLEScanner } from '../../src/ble.js'
import { DEVICE_MODEL_MAP, resolveDeviceClassName } from '../../src/settings.js'
import { SwitchBotBLEModel, SwitchBotBLEModelName } from '../../src/types/ble.js'

function parse(firstByte: number, rest: number[] = [0x00, 0x64, 0x00, 0x00]) {
  const scanner = new BLEScanner({ noble: new EventEmitter() })
  return (scanner as any).parseServiceData(Buffer.from([firstByte, ...rest]))
}

describe('bLE advertisement model identities', () => {
  it.each([
    ['{', 'Curtain3'],
    ['[', 'Curtain3'],
    ['c', 'Curtain'],
    ['C', 'Curtain'],
    ['g', 'Plug Mini (US)'],
    ['G', 'Plug Mini (US)'],
    ['j', 'Plug Mini (JP)'],
    ['J', 'Plug Mini (JP)'],
    ['i', 'Meter Plus'],
    ['I', 'Meter Plus'],
    ['5', 'Meter Pro (CO2)'],
    ['\x15', 'Meter Pro (CO2)'],
    ['w', 'Indoor/Outdoor Thermo-Hygrometer'],
    ['W', 'Indoor/Outdoor Thermo-Hygrometer'],
    ['q', 'Ceiling Light'],
    ['Q', 'Ceiling Light'],
    ['n', 'Ceiling Light Pro'],
    ['N', 'Ceiling Light Pro'],
    ['r', 'Strip Light'],
    ['R', 'Strip Light'],
  ])('maps model byte %j to %s', (code, displayName) => {
    expect(DEVICE_MODEL_MAP[code]).toBe(displayName)
    expect(parse(code.charCodeAt(0))?.modelName).toBe(displayName)
  })

  it('ignores the encryption/high bit when reading the model byte', () => {
    expect(parse('j'.charCodeAt(0) | 0x80)?.modelName).toBe('Plug Mini (JP)')
  })

  it('distinguishes US and JP Plug Mini advertisements', () => {
    expect(parse('g'.charCodeAt(0))?.modelName).not.toBe(parse('j'.charCodeAt(0))?.modelName)
  })

  it('parses Curtain 3 status from the alternate "[" model byte', () => {
    const data = parse('['.charCodeAt(0), [0x40, 0x5A, 0x32, 0x0A])
    expect(data?.inMotion).toBe(true)
    expect(data?.position).toBe(50)
  })

  it('resolves every advertised display name to a device class', () => {
    for (const displayName of new Set(Object.values(DEVICE_MODEL_MAP))) {
      expect(resolveDeviceClassName(displayName), displayName).toBeDefined()
    }
  })
})

describe('product model codes resolve to device classes', () => {
  it.each([
    ['WoCurtain3', 'WoCurtain'],
    ['WoPlugUS', 'WoPlugMiniUS'],
    ['WoPlugJP', 'WoPlugMiniJP'],
    ['WoMeterPlus', 'WoSensorTHPlus'],
    ['WoCeilingPro', 'WoCeilingLight'],
    ['WoIOSensor', 'WoIOSensorTH'],
    ['Indoor/Outdoor Thermo-Hygrometer', 'WoIOSensorTH'],
    ['Outdoor Meter', 'WoIOSensorTH'],
    ['WoTHPc', 'WoSensorTHProCO2'],
    ['WoLinkMini', 'WoHub2'],
    ['Hub Mini', 'WoHub2'],
    ['WoLinkMatter', 'WoHubMiniMatter'],
    ['HubMini Matter', 'WoHubMiniMatter'],
  ])('%s -> %s', (code, className) => {
    expect(resolveDeviceClassName(code)).toBe(className)
  })

  it('keeps ordinary Hub Mini distinct from HubMini Matter', () => {
    expect(resolveDeviceClassName('WoLinkMini')).not.toBe(resolveDeviceClassName('WoLinkMatter'))
  })
})

describe('deprecated enum aliases', () => {
  it('keeps Plug and OutdoorMeter importable with the new canonical values', () => {
    expect(SwitchBotBLEModel.Plug).toBe(SwitchBotBLEModel.PlugMiniUS)
    expect(SwitchBotBLEModel.PlugMiniUS).not.toBe(SwitchBotBLEModel.PlugMiniJP)
    expect(SwitchBotBLEModel.OutdoorMeter).toBe(SwitchBotBLEModel.IndoorOutdoorThermoHygrometer)
    expect(SwitchBotBLEModelName.OutdoorMeter).toBe(SwitchBotBLEModelName.IndoorOutdoorThermoHygrometer)
  })

  it('uses the pySwitchbot advertisement bytes for the split models', () => {
    expect(SwitchBotBLEModel.MeterProCO2).toBe('5')
    expect(SwitchBotBLEModel.IndoorOutdoorThermoHygrometer).toBe('w')
    expect(SwitchBotBLEModel.CeilingLightPro).toBe('n')
    expect(SwitchBotBLEModel.PlugMiniJP).toBe('j')
  })
})
