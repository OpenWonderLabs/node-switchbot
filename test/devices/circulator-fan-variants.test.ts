import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-fan-01',
  deviceName: 'Circulator Fan',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('circulator fan variants', () => {
  it('maps Battery Circulator Fan to WoCirculatorFan', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Battery Circulator Fan',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoCirculatorFan')
  })

  it('maps Circulator Fan to WoCirculatorFan', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Circulator Fan',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoCirculatorFan')
  })

  it('maps USB Circulator Fan to WoCirculatorFan', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'USB Circulator Fan',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoCirculatorFan')
  })

  it('inherits fan control methods', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Battery Circulator Fan',
    })

    const [device] = switchbot.devices.list()
    expect(device).toBeDefined()
    expect(typeof (device as any).turnOn).toBe('function')
    expect(typeof (device as any).turnOff).toBe('function')
    expect(typeof (device as any).setFanSpeed).toBe('function')
  })
})
