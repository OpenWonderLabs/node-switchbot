/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * device-type-resolution.test.ts: resolving OpenAPI deviceType strings to device classes
 */

import { describe, expect, it } from 'vitest'

import { DEVICE_CLASS_MAP, normalizeDeviceTypeKey, resolveDeviceClassName } from '../../src/settings.js'

describe('resolveDeviceClassName', () => {
  it('resolves BLE display names exactly as before', () => {
    expect(resolveDeviceClassName('Meter Pro (CO2)')).toBe('WoSensorTHProCO2')
    expect(resolveDeviceClassName('Meter Pro')).toBe('WoSensorTHPro')
    expect(resolveDeviceClassName('Blind Tilt')).toBe('WoBlindTilt')
  })

  // The OpenAPI deviceType field uses compact spellings for models whose BLE
  // display names contain spaces. These previously failed to resolve.
  it.each([
    ['MeterPro(CO2)', 'WoSensorTHProCO2'],
    ['MeterPro', 'WoSensorTHPro'],
    ['BlindTilt', 'WoBlindTilt'],
  ])('resolves OpenAPI spelling %s', (apiType, expected) => {
    expect(resolveDeviceClassName(apiType)).toBe(expected)
  })

  it('still returns undefined for genuinely unsupported models', () => {
    // Hub Mini2 is a distinct model with no class, not a spelling variant.
    expect(resolveDeviceClassName('Hub Mini2')).toBeUndefined()
    expect(resolveDeviceClassName('Totally Made Up Device')).toBeUndefined()
  })

  it('tolerates empty and nullish input', () => {
    expect(resolveDeviceClassName('')).toBeUndefined()
    expect(resolveDeviceClassName(undefined as unknown as string)).toBeUndefined()
  })

  it('keeps every mapped display name resolvable', () => {
    for (const [displayName, className] of Object.entries(DEVICE_CLASS_MAP)) {
      expect(resolveDeviceClassName(displayName)).toBe(className)
    }
  })

  it('does not collide any two mapped names onto conflicting classes', () => {
    const seen = new Map<string, string>()
    for (const [displayName, className] of Object.entries(DEVICE_CLASS_MAP)) {
      const key = normalizeDeviceTypeKey(displayName)
      const existing = seen.get(key)
      if (existing !== undefined) {
        expect(existing).toBe(className)
      }
      seen.set(key, className)
    }
  })
})
