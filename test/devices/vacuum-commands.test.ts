import type { DeviceInfo } from '../../src/types/index.js'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WoVacuum } from '../../src/devices/wo-vacuum.js'
import { DEVICE_COMMANDS } from '../../src/settings.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'test-vacuum',
    name: 'Test Vacuum',
    deviceType: 'Robot Vacuum Cleaner K10 Plus',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('vacuum commands', () => {
  beforeEach(() => {
    // Always mock hasBLE to return true for command tests
    vi.spyOn(WoVacuum.prototype as any, 'hasBLE').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends cleanup command with protocol version 1', async () => {
    const vacuum = new WoVacuum(baseInfo())
    const sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(vacuum as any).sendCommand = sendCommand

    const result = await vacuum.cleanUp(1)

    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith(
      DEVICE_COMMANDS.VACUUM.CLEAN_UP[1],
      'start',
      { protocolVersion: 1 },
    )
  })

  it('sends cleanup command with protocol version 2', async () => {
    const vacuum = new WoVacuum(baseInfo())
    const sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(vacuum as any).sendCommand = sendCommand

    const result = await vacuum.cleanUp(2)

    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith(
      DEVICE_COMMANDS.VACUUM.CLEAN_UP[2],
      'start',
      { protocolVersion: 2 },
    )
  })

  it('sends return-to-dock command with protocol version 1', async () => {
    const vacuum = new WoVacuum(baseInfo())
    const sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(vacuum as any).sendCommand = sendCommand

    const result = await vacuum.returnToDock(1)

    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith(
      DEVICE_COMMANDS.VACUUM.RETURN_TO_DOCK[1],
      'dock',
      { protocolVersion: 1 },
    )
  })

  it('rejects unsupported protocol versions', async () => {
    const vacuum = new WoVacuum(baseInfo())

    await expect(vacuum.cleanUp(3)).rejects.toThrow('Unsupported vacuum protocol version: 3')
    await expect(vacuum.returnToDock(0)).rejects.toThrow('Unsupported vacuum protocol version: 0')
  })
})

describe('vacuum status getters', () => {
  it('returns status fields from BLE advertisement data', () => {
    const vacuum = new WoVacuum(baseInfo())

    ;(vacuum as any).updateInfo({
      bleServiceData: {
        model: '\\x0F',
        modelName: 'Robot Vacuum Cleaner K10 Plus',
        battery: 88,
        work_status: 2,
        dustbin_bound: true,
        dusbin_connected: false,
        network_connected: true,
      },
    })

    expect(vacuum.getBattery()).toBe(88)
    expect(vacuum.getWorkStatus()).toBe(2)
    expect(vacuum.getDustbinBoundStatus()).toBe(true)
    expect(vacuum.getDustbinConnectedStatus()).toBe(false)
    expect(vacuum.getNetworkConnectedStatus()).toBe(true)
  })
})
