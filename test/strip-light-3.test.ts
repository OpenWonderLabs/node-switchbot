/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * strip-light-3.test.ts: SwitchBot v4.0.0 - Strip Light 3 Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-strip-light-3-01',
  deviceName: 'Strip Light 3',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('strip Light 3', () => {
  it('maps Strip Light 3 device type to WoStripLight3', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Strip Light 3',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoStripLight3')
  })

  it('maps SwitchBot Strip Light 3 device type to WoStripLight3', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Strip Light 3',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoStripLight3')
  })

  it('inherits color control methods from WoBulb', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Strip Light 3',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('turnOn')
    expect(device).toHaveProperty('turnOff')
    expect(device).toHaveProperty('setBrightness')
  })
})
