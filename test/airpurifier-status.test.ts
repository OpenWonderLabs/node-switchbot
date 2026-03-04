import type { DeviceInfo } from '../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { WoAirPurifier } from '../src/devices/wo-air-purifier.js'

function airPurifierInfo(): DeviceInfo {
  return {
    id: 'air-01',
    name: 'Air Purifier',
    deviceType: 'Air Purifier',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('air purifier status', () => {
  it('returns full status from API', async () => {
    const purifier = new WoAirPurifier(airPurifierInfo())
    ;(purifier as any).hasAPI = () => true
    ;(purifier as any).getAPIStatus = vi.fn().mockResolvedValue({
      power: 'on',
      fanSpeed: 3,
      mode: 'auto',
      pm25: 42,
      version: '1.0',
    })
    const status = await purifier.getStatus()
    expect(status.power).toBe('on')
    expect(status.fanSpeed).toBe(3)
    expect(status.mode).toBe('auto')
    expect(status.pm25).toBe(42)
    expect(status.airQuality).toBe('good')
    expect(status.version).toBe('1.0')
  })

  it('returns full status from BLE', async () => {
    const purifier = new WoAirPurifier(airPurifierInfo())
    ;(purifier as any).hasAPI = () => false
    ;(purifier as any).hasBLE = () => true
    ;(purifier as any).getBLEStatus = vi.fn().mockResolvedValue({
      state: true,
      fanSpeed: 2,
      mode: 'manual',
      pm25: 120,
    })
    const status = await purifier.getStatus()
    expect(status.power).toBe('on')
    expect(status.fanSpeed).toBe(2)
    expect(status.mode).toBe('manual')
    expect(status.pm25).toBe(120)
    // BLE fallback does not compute airQuality
    expect(status.airQuality).toBeUndefined()
  })
})
