import type { DeviceInfo } from '../../src/types/index.js'
import { describe, expect, it, vi } from 'vitest'
import { WoHand } from '../../src/devices/wo-hand.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'WoHand-1',
    name: 'WoHand',
    deviceType: 'WoHand',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('woHand', () => {
  it('supports bot mode configuration commands', async () => {
    const bot = new WoHand(baseInfo())
    const sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(bot as any).sendCommand = sendCommand

    const modeResult = await bot.setMode?.('switch')
    expect(modeResult?.success).toBe(true)
    await expect(bot.setLongPress?.(50)).resolves.toBe(true)
    await expect(bot.handUp?.()).resolves.toBe(true)
    await expect(bot.handDown?.()).resolves.toBe(true)

    expect(sendCommand).toHaveBeenCalledTimes(4)
  })
})
