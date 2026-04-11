import type { DeviceInfo } from '../../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { WoHand } from '../../src/devices/wo-hand.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'test-bot-override',
    name: 'Test Bot Override',
    deviceType: 'WoHand',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
    bleServiceData: {
      model: 'H',
      modelName: 'WoHand',
      state: false,
      battery: 55,
    },
    battery: 55,
    rssi: -70,
  }
}

describe('device override state during connection', () => {
  it('ignores advertisement bleServiceData updates while connected', () => {
    const bleConnection = {
      isConnected: vi.fn().mockReturnValue(true),
    } as any

    const bot = new WoHand(baseInfo(), { bleConnection })

    bot.updateInfo({
      bleServiceData: {
        model: 'H',
        modelName: 'WoHand',
        state: true,
        battery: 99,
      },
      battery: 99,
      rssi: -45,
    })

    const info = bot.getInfo()
    expect(info.bleServiceData?.state).toBe(false)
    expect(info.battery).toBe(55)
    expect(info.rssi).toBe(-70)
  })

  it('accepts advertisement updates when not connected', () => {
    const bleConnection = {
      isConnected: vi.fn().mockReturnValue(false),
    } as any

    const bot = new WoHand(baseInfo(), { bleConnection })

    bot.updateInfo({
      bleServiceData: {
        model: 'H',
        modelName: 'WoHand',
        state: true,
        battery: 80,
      },
      battery: 80,
      rssi: -40,
    })

    const info = bot.getInfo()
    expect(info.bleServiceData?.state).toBe(true)
    expect(info.battery).toBe(80)
    expect(info.rssi).toBe(-40)
  })

  it('returns empty fallback status payload while connected', () => {
    const bleConnection = {
      isConnected: vi.fn().mockReturnValue(true),
    } as any

    const bot = new WoHand(baseInfo(), { bleConnection })

    const normalized = (bot as any).normalizeBLEStatusData(undefined)
    expect(normalized).toEqual({})
  })
})
