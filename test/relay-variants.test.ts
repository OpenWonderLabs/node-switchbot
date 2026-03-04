import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-relay-01',
  deviceName: 'Relay',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('relay switch variants', () => {
  it('maps Relay Switch 2PM to WoRelaySwitch2PM', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Relay Switch 2PM',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRelaySwitch2PM')
  })

  it('maps Garage Door Opener to WoGarageDoorOpener', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Garage Door Opener',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoGarageDoorOpener')
  })

  it('woRelaySwitch2PM has channel-specific methods', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Relay Switch 2PM',
    })

    const [device] = switchbot.devices.list()
    expect(device).toBeDefined()
    expect(typeof (device as any).setChannel1).toBe('function')
    expect(typeof (device as any).setChannel2).toBe('function')
  })

  it('woGarageDoorOpener inherits relay switch methods', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Garage Door Opener',
    })

    const [device] = switchbot.devices.list()
    expect(device).toBeDefined()
    expect(typeof (device as any).turnOn).toBe('function')
    expect(typeof (device as any).turnOff).toBe('function')
    expect(typeof (device as any).toggle).toBe('function')
  })
})
