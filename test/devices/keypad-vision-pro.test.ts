/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * keypad-vision-pro.test.ts: SwitchBot v4.0.0 - Keypad Vision Pro Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-keypad-vision-pro-01',
  deviceName: 'Keypad Vision Pro',
  enableCloudService: true,
  hubDeviceId: '',
  version: 'V1.0',
}

describe('keypad Vision Pro', () => {
  it('maps Keypad Vision Pro device type to WoKeypadVisionPro', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Keypad Vision Pro',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoKeypadVisionPro')
  })

  it('maps SwitchBot Keypad Vision Pro device type to WoKeypadVisionPro', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Keypad Vision Pro',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoKeypadVisionPro')
  })

  it('inherits getStatus() from WoKeypad', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Keypad Vision Pro',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('getStatus')
    expect(typeof device?.getStatus).toBe('function')
  })
})
