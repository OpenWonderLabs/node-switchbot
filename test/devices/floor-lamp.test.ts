/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * floor-lamp.test.ts: SwitchBot v4.0.0 - Floor Lamp Tests
 */

import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-floor-lamp-01',
  deviceName: 'Floor Lamp',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('floor Lamp', () => {
  it('maps Floor Lamp device type to WoFloorLamp', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '', logLevel: 0 })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Floor Lamp',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoFloorLamp')
  })

  it('maps SwitchBot Floor Lamp device type to WoFloorLamp', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '', logLevel: 0 })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Floor Lamp',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoFloorLamp')
  })

  it('inherits color control methods from WoBulb', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Floor Lamp',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('turnOn')
    expect(device).toHaveProperty('turnOff')
    expect(device).toHaveProperty('setBrightness')
  })
})
