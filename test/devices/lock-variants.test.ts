import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-lock-01',
  deviceName: 'Lock',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('lock model variants', () => {
  it('maps Lock Lite to WoSmartLockLite', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Lock Lite',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoSmartLockLite')
  })

  it('maps Lock Vision to WoSmartLockVision', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Lock Vision',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoSmartLockVision')
  })

  it('maps Lock Vision Pro to WoSmartLockVisionPro', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Lock Vision Pro',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoSmartLockVisionPro')
  })

  it('maps Lock Pro WiFi to WoSmartLockProWiFi', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Lock Pro WiFi',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoSmartLockProWiFi')
  })

  it('inherits lock() method from WoSmartLock', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Lock Lite',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('lock')
    expect(device).toHaveProperty('unlock')
  })

  it('inherits unlatch() method from WoSmartLockPro for pro variants', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Lock Vision Pro',
    })

    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('lock')
    expect(device).toHaveProperty('unlock')
    expect(device).toHaveProperty('unlatch')
  })
})
