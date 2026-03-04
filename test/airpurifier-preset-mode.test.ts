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

describe('air purifier preset modes', () => {
  it('setPresetMode sends correct BLE command for each mode', async () => {
    const purifier = new WoAirPurifier(airPurifierInfo())
    const sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(purifier as any).sendCommand = sendCommand

    const modes = ['level_1', 'level_2', 'level_3', 'auto', 'sleep', 'pet'] as const
    for (const mode of modes) {
      await purifier.setPresetMode(mode)
      expect(sendCommand).toHaveBeenLastCalledWith(
        expect.arrayContaining([0x57, 0x02, expect.any(Number)]),
        'setPresetMode',
        mode,
      )
    }
  })

  it('throws for unsupported mode', async () => {
    const purifier = new WoAirPurifier(airPurifierInfo())
    await expect(purifier.setPresetMode('invalid' as any)).rejects.toThrow('Unsupported preset mode')
  })
})
