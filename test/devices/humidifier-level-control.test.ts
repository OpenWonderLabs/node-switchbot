import type { DeviceInfo } from '../../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { WoHumi2 } from '../../src/devices/wo-humi2.js'
import { WoHumi } from '../../src/devices/wo-humi.js'

function humidifierInfo(): DeviceInfo {
  return {
    id: 'humi-01',
    name: 'Humidifier',
    deviceType: 'Humidifier',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('humidifier level control', () => {
  it('woHumi setLevel delegates to setEfficiency', async () => {
    const humidifier = new WoHumi(humidifierInfo())
    const setEfficiency = vi.fn().mockResolvedValue(true)
    ;(humidifier as any).setEfficiency = setEfficiency

    const result = await humidifier.setLevel(65)

    expect(result).toBe(true)
    expect(setEfficiency).toHaveBeenCalledWith(65)
  })

  it('woHumi setLevel clamps to 1-100', async () => {
    const humidifier = new WoHumi(humidifierInfo())
    const setEfficiency = vi.fn().mockResolvedValue(true)
    ;(humidifier as any).setEfficiency = setEfficiency

    await humidifier.setLevel(0)
    await humidifier.setLevel(200)

    expect(setEfficiency).toHaveBeenNthCalledWith(1, 1)
    expect(setEfficiency).toHaveBeenNthCalledWith(2, 100)
  })

  it('woHumi2 setLevel remains available through inheritance', async () => {
    const humidifier = new WoHumi2({
      ...humidifierInfo(),
      id: 'humi2-01',
      deviceType: 'Humidifier 2',
    })

    const setEfficiency = vi.fn().mockResolvedValue(true)
    ;(humidifier as any).setEfficiency = setEfficiency

    const result = await humidifier.setLevel(42)

    expect(result).toBe(true)
    expect(setEfficiency).toHaveBeenCalledWith(42)
  })
})
