/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * hubmini-matter.test.ts: SwitchBot v4.0.0 - HubMini Matter Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-hubmini-matter-01',
  deviceName: 'HubMini Matter',
  enableCloudService: true,
  hubDeviceId: '',
  version: 'V1.0',
}

describe('hubMini Matter', () => {
  it('maps HubMini Matter device type to WoHubMiniMatter', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'HubMini Matter',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoHubMiniMatter')
  })

  it('maps SwitchBot HubMini Matter device type to WoHubMiniMatter', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot HubMini Matter',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoHubMiniMatter')
  })

  it('inherits getStatus() from WoHub2', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'HubMini Matter',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('getStatus')
    expect(typeof device?.getStatus).toBe('function')
  })
})
