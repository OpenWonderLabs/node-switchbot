import type { DeviceInfo } from '../../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { WoSmartLock } from '../../src/devices/wo-lock.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'WoSmartLock-1',
    name: 'WoSmartLock',
    deviceType: 'WoSmartLock',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('woSmartLock', () => {
  it('skips lock command when state already matches target', async () => {
    const lock = new WoSmartLock(baseInfo())
    const sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(lock as any).sendCommand = sendCommand
    ;(lock as any).getStatus = vi.fn().mockResolvedValue({ lockState: 'locked' })

    await expect(lock.lock()).resolves.toBe(true)
    expect(sendCommand).not.toHaveBeenCalled()
  })
})
