import type { DeviceInfo } from '../src/types/index.js'
import { describe, expect, it, vi } from 'vitest'
import { WoBulb } from '../src/devices/wo-bulb.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'WoBulb-1',
    name: 'WoBulb',
    deviceType: 'WoBulb',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('woBulb', () => {
  it('supports bulb effect presets and rejects unknown effect', async () => {
    const bulb = new WoBulb(baseInfo())
    const sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(bulb as any).sendCommand = sendCommand

    await expect(bulb.setEffect?.('rainbow', 20)).resolves.toBe(true)
    await expect(bulb.setEffect?.('not-an-effect')).rejects.toThrow('Unsupported effect')
  })
})
