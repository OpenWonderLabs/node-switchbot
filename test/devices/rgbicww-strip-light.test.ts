/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * rgbicww-strip-light.test.ts: SwitchBot v4.0.0 - RGBICWW Strip Light Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-rgbicww-strip-light-01',
  deviceName: 'RGBICWW Strip Light',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('rgbicww Strip Light', () => {
  // Remove non-async tests; only use async/await versions
  it('maps RGBICWW Strip Light device type to WoRGBICWWStripLight', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'RGBICWW Strip Light',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRGBICWWStripLight')
  })

  it('maps SwitchBot RGBICWW Strip Light device type to WoRGBICWWStripLight', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot RGBICWW Strip Light',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRGBICWWStripLight')
  })

  it('inherits segmented control methods from WoRGBICBulb', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'RGBICWW Strip Light',
    })
    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('turnOn')
    expect(device).toHaveProperty('turnOff')
    expect(device).toHaveProperty('setBrightness')
    expect(device).toHaveProperty('setSegmentColor')
  })
})
