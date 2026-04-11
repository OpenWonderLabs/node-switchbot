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

describe('humidifier mode control', () => {
  it('woHumi setAuto delegates to setMode auto', async () => {
    const humidifier = new WoHumi(humidifierInfo())
    const setMode = vi.fn().mockResolvedValue({ success: true })
    ;(humidifier as any).setMode = setMode

    const result = await humidifier.setAuto()

    expect(result).toBe(true)
    expect(setMode).toHaveBeenCalledWith('auto')
  })

  it('woHumi setManual delegates to setMode manual', async () => {
    const humidifier = new WoHumi(humidifierInfo())
    const setMode = vi.fn().mockResolvedValue({ success: true })
    ;(humidifier as any).setMode = setMode

    const result = await humidifier.setManual()

    expect(result).toBe(true)
    expect(setMode).toHaveBeenCalledWith('manual')
  })

  it('woHumi getTargetLevel returns API humidity', async () => {
    const humidifier = new WoHumi(humidifierInfo())
    ;(humidifier as any).hasAPI = () => true
    ;(humidifier as any).getAPIStatus = vi.fn().mockResolvedValue({ humidity: 55 })

    const result = await humidifier.getTargetLevel()
    expect(result).toBe(55)
  })

  it('woHumi getTargetLevel returns BLE percentage', async () => {
    const humidifier = new WoHumi(humidifierInfo())
    ;(humidifier as any).hasAPI = () => false
    ;(humidifier as any).hasBLE = () => true
    ;(humidifier as any).getBLEStatus = vi.fn().mockResolvedValue({ percentage: 42 })

    const result = await humidifier.getTargetLevel()
    expect(result).toBe(42)
  })

  it('woHumi2 inherits setAuto, setManual, getTargetLevel', async () => {
    const humidifier = new WoHumi2({ ...humidifierInfo(), id: 'humi2-01', deviceType: 'Humidifier 2' })
    const setMode = vi.fn().mockResolvedValue(true)
    ;(humidifier as any).setMode = setMode
    await humidifier.setAuto()
    expect(setMode).toHaveBeenCalledWith('auto')
    await humidifier.setManual()
    expect(setMode).toHaveBeenCalledWith('manual')
    ;(humidifier as any).hasAPI = () => true
    ;(humidifier as any).getAPIStatus = vi.fn().mockResolvedValue({ humidity: 77 })
    const result = await humidifier.getTargetLevel()
    expect(result).toBe(77)
  })
})
