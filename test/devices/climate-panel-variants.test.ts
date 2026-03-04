import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-climate-panel-01',
  deviceName: 'Climate Panel',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('climate panel variants', () => {
  it('maps Climate Panel to WoClimatePanel', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Climate Panel',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoClimatePanel')
  })

  it('maps Smart Climate Panel to WoClimatePanel', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Smart Climate Panel',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoClimatePanel')
  })

  it('inherits climate control methods', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Climate Panel',
    })

    const [device] = switchbot.devices.list()
    expect(device).toBeDefined()
    expect(typeof (device as any).turnOn).toBe('function')
    expect(typeof (device as any).turnOff).toBe('function')
    expect(typeof (device as any).setMode).toBe('function')
  })
})
