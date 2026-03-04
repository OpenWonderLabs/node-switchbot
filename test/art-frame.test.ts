/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * art-frame.test.ts: SwitchBot v4.0.0 - Art Frame Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-art-frame-01',
  deviceName: 'Art Frame',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('art Frame', () => {
  it('maps Art Frame device type to WoArtFrame', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Art Frame',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoArtFrame')
  })

  it('maps SwitchBot Art Frame device type to WoArtFrame', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Art Frame',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoArtFrame')
  })

  it('inherits color control methods from WoBulb', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Art Frame',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('turnOn')
    expect(device).toHaveProperty('turnOff')
    expect(device).toHaveProperty('setBrightness')
  })
})
