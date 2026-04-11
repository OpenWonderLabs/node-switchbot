import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-vacuum-01',
  deviceName: 'Vacuum',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('vacuum model variants', () => {
  // Remove non-async tests; only use async/await versions
  it('maps K10+ to WoVacuumK10Plus', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Robot Vacuum Cleaner K10+',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoVacuumK10Plus')
  })

  it('maps K10+ Pro to WoVacuumK10Pro', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Robot Vacuum Cleaner K10+ Pro',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoVacuumK10Pro')
  })

  it('maps K10+ Pro Combo to WoVacuumK10ProCombo', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Robot Vacuum Cleaner K10+ Pro Combo',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoVacuumK10ProCombo')
  })

  it('maps K11+ to WoVacuumK11Plus', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Robot Vacuum Cleaner K11+',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoVacuumK11Plus')
  })

  it('maps K20 to WoVacuumK20', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Robot Vacuum Cleaner K20',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoVacuumK20')
  })

  it('maps S10 to WoVacuumS10', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Robot Vacuum Cleaner S10',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoVacuumS10')
  })

  it('maps S20 to WoVacuumS20', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Robot Vacuum Cleaner S20',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoVacuumS20')
  })
})
