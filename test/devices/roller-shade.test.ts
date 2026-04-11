/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * roller-shade.test.ts: SwitchBot v4.0.0 - Roller Shade Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-roller-shade-01',
  deviceName: 'Roller Shade',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('roller Shade', () => {
  // Remove non-async tests; only use async/await versions
  it('maps Roller Shade device type to WoRollerShade', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Roller Shade',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRollerShade')
  })

  it('maps SwitchBot Roller Shade device type to WoRollerShade', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Roller Shade',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRollerShade')
  })

  it('inherits curtain control methods from WoCurtain', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Roller Shade',
    })
    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('open')
    expect(device).toHaveProperty('close')
    expect(device).toHaveProperty('pause')
    expect(device).toHaveProperty('setPosition')
  })
})
