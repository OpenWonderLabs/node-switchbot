import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-thermostat-01',
  deviceName: 'Thermostat',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('smart thermostat radiator variants', () => {
  it('maps Smart Thermostat Radiator to WoSmartThermostatRadiator', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Smart Thermostat Radiator',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoSmartThermostatRadiator')
  })

  it('maps Thermostat Radiator to WoSmartThermostatRadiator', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Thermostat Radiator',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoSmartThermostatRadiator')
  })

  it('maps Radiator Thermostat to WoSmartThermostatRadiator', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Radiator Thermostat',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoSmartThermostatRadiator')
  })

  it('inherits climate control methods', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Smart Thermostat Radiator',
    })

    const [device] = switchbot.devices.list()
    expect(device).toBeDefined()
    expect(typeof (device as any).turnOn).toBe('function')
    expect(typeof (device as any).turnOff).toBe('function')
    expect(typeof (device as any).setMode).toBe('function')
  })
})
