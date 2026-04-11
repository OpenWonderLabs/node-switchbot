import type { DeviceInfo } from '../../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { WoHumi2 } from '../../src/devices/wo-humi2.js'
import { SwitchBot } from '../../src/switchbot.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'test-humi2',
    name: 'Test Humidifier 2',
    deviceType: 'Humidifier 2',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('humidifier 2 enhancement', () => {
  it('setAuto delegates to setMode auto', async () => {
    const humidifier = new WoHumi2(baseInfo())
    const setMode = vi.fn().mockResolvedValue({ success: true })
    ;(humidifier as any).setMode = setMode

    const result = await humidifier.setAuto()

    expect(result).toBe(true)
    expect(setMode).toHaveBeenCalledWith('auto')
  })

  it('setManual delegates to setMode manual', async () => {
    const humidifier = new WoHumi2(baseInfo())
    const setMode = vi.fn().mockResolvedValue({ success: true })
    ;(humidifier as any).setMode = setMode

    const result = await humidifier.setManual()

    expect(result).toBe(true)
    expect(setMode).toHaveBeenCalledWith('manual')
  })

  it('setLevel delegates to setEfficiency', async () => {
    const humidifier = new WoHumi2(baseInfo())
    const setEfficiency = vi.fn().mockResolvedValue(true)
    ;(humidifier as any).setEfficiency = setEfficiency

    const result = await humidifier.setLevel(65)

    expect(result).toBe(true)
    expect(setEfficiency).toHaveBeenCalledWith(65)
  })

  it('maps Evaporative Humidifier (Auto-refill) to WoHumi2', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      deviceId: 'api-humi2-01',
      deviceName: 'Humidifier',
      deviceType: 'Evaporative Humidifier (Auto-refill)',
      enableCloudService: true,
      hubDeviceId: 'hub-1',
      version: 'V1.0',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoHumi2')
  })
})
