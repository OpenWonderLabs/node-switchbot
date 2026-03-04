/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * keypad-vision.test.ts: SwitchBot v4.0.0 - Keypad Vision Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-keypad-vision-01',
  deviceName: 'Keypad Vision',
  enableCloudService: true,
  hubDeviceId: '',
  version: 'V1.0',
}

describe('keypad Vision', () => {
  it('maps Keypad Vision device type to WoKeypadVision', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Keypad Vision',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoKeypadVision')
  })

  it('maps SwitchBot Keypad Vision device type to WoKeypadVision', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Keypad Vision',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoKeypadVision')
  })

  it('inherits keypad methods from WoKeypad', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Keypad Vision',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('getStatus')
  })
})
