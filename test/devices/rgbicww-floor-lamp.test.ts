/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * rgbicww-floor-lamp.test.ts: SwitchBot v4.0.0 - RGBICWW Floor Lamp Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-rgbicww-floor-lamp-01',
  deviceName: 'RGBICWW Floor Lamp',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('rgbicww Floor Lamp', () => {
  it('maps RGBICWW Floor Lamp device type to WoRGBICWWFloorLamp', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'RGBICWW Floor Lamp',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRGBICWWFloorLamp')
  })

  it('maps SwitchBot RGBICWW Floor Lamp device type to WoRGBICWWFloorLamp', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot RGBICWW Floor Lamp',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRGBICWWFloorLamp')
  })

  it('inherits segmented control methods from WoRGBICBulb', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'RGBICWW Floor Lamp',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('turnOn')
    expect(device).toHaveProperty('turnOff')
    expect(device).toHaveProperty('setBrightness')
    expect(device).toHaveProperty('setSegmentColor')
  })
})
