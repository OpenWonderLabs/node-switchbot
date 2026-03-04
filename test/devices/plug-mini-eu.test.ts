/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * plug-mini-eu.test.ts: SwitchBot v4.0.0 - Plug Mini EU Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-plug-mini-eu-01',
  deviceName: 'Plug Mini EU',
  enableCloudService: true,
  hubDeviceId: '',
  version: 'V1.0',
}

describe('plug Mini EU', () => {
  it('maps Plug Mini (EU) device type to WoPlugMiniUS', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Plug Mini (EU)',
    })

    const [device] = switchbot.devices.list()
    // WoPlugMiniEU is aliased to WoPlugMiniUS in the registry
    expect(device?.constructor.name).toBe('WoPlugMiniUS')
  })

  it('inherits plug control methods from WoPlugMiniUS', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Plug Mini (EU)',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('turnOn')
    expect(device).toHaveProperty('turnOff')
    expect(device).toHaveProperty('toggle')
  })
})
