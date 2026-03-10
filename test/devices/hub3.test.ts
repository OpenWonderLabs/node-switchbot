/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * hub3.test.ts: SwitchBot v4.0.0 - Hub 3 Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-hub3-01',
  deviceName: 'Hub 3',
  enableCloudService: true,
  hubDeviceId: '',
  version: 'V1.0',
}

describe('hub 3', () => {
  it('maps Hub 3 device type to WoHub3', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '', logLevel: 0 })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Hub 3',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoHub3')
  })

  it('maps SwitchBot Hub 3 device type to WoHub3', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '', logLevel: 0 })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Hub 3',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoHub3')
  })

  it('inherits getStatus() from WoHub2', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Hub 3',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('getStatus')
    expect(typeof device?.getStatus).toBe('function')
  })
})
