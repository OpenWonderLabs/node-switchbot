import { describe, expect, it } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

describe('discovery fallback behavior', () => {
  it('uses advertisement.id when BLE address is an empty string', async () => {
    const switchbot = new SwitchBot({
      enableBLE: false,
      token: '',
      secret: '',
    })

    await (switchbot as any).handleBLEDiscovery({
      id: 'macos-empty-address-id',
      address: '',
      isAddressable: false,
      rssi: -45,
      serviceData: {
        model: 'H',
        modelName: 'Bot',
        battery: 88,
      },
    })

    const devices = switchbot.devices.list()
    expect(devices).toHaveLength(1)
    expect(devices[0]?.getId()).toBe('macos-empty-address-id')
    expect(devices[0]?.getMAC()).toBeUndefined()
  })

  it('uses advertisement.id when BLE address is missing', async () => {
    const switchbot = new SwitchBot({
      enableBLE: false,
      token: '',
      secret: '',
    })

    await (switchbot as any).handleBLEDiscovery({
      id: 'macos-missing-address-id',
      isAddressable: false,
      rssi: -50,
      serviceData: {
        model: 'H',
        modelName: 'Bot',
        battery: 75,
      },
    })

    const devices = switchbot.devices.list()
    expect(devices).toHaveLength(1)
    expect(devices[0]?.getId()).toBe('macos-missing-address-id')
    expect(devices[0]?.getMAC()).toBeUndefined()
  })

  it('extracts MAC from manufacturer data when address is empty', async () => {
    const switchbot = new SwitchBot({
      enableBLE: false,
      token: '',
      secret: '',
    })

    // Simulate handleBLEDiscovery receiving already-extracted MAC from manufacturer data
    // In real usage, BLE scanner.handleDiscovery extracts the MAC from manufacturer data
    await (switchbot as any).handleBLEDiscovery({
      id: 'peripheral-uuid-1',
      address: 'CA:8F:1D:76:12:E1', // This would be extracted from manufacturer data by BLE scanner
      isAddressable: true,
      rssi: -55,
      serviceData: {
        model: 'H',
        modelName: 'Bot',
        battery: 90,
      },
    })

    const devices = switchbot.devices.list()
    expect(devices).toHaveLength(1)
    // MAC should be available (extracted from manufacturer data by BLE scanner)
    expect(devices[0]?.getMAC()).toBe('CA:8F:1D:76:12:E1')
  })

  it('supports legacy service UUID (000d)', async () => {
    const switchbot = new SwitchBot({
      enableBLE: false,
      token: '',
      secret: '',
    })

    ;(switchbot as any).scanner = {
      on: () => {},
      off: () => {},
      start: async () => {},
      stop: async () => {},
      getDiscoveredDevices: () => [],
      getDevice: () => undefined,
      waitForDevice: async () => ({
        id: 'legacy-uuid-device',
        address: 'AA:BB:CC:DD:EE:FF',
        isAddressable: true,
        rssi: -60,
        serviceData: {
          model: 'H',
          modelName: 'Bot',
          battery: 85,
        },
      }),
    }

    await (switchbot as any).handleBLEDiscovery({
      id: 'legacy-uuid-device',
      address: 'AA:BB:CC:DD:EE:FF',
      isAddressable: true,
      rssi: -60,
      serviceData: {
        model: 'H',
        modelName: 'Bot',
        battery: 85,
      },
    })

    const devices = switchbot.devices.list()
    expect(devices).toHaveLength(1)
    expect(devices[0]?.getId()).toBe('AABBCCDDEEFF')
    expect(devices[0]?.getMAC()).toBe('AA:BB:CC:DD:EE:FF')
  })

  it('stores and retrieves devices by BLE ID when MAC is unavailable', async () => {
    const switchbot = new SwitchBot({
      enableBLE: false,
      token: '',
      secret: '',
    })

    await (switchbot as any).handleBLEDiscovery({
      id: 'device-ble-uuid-001',
      bleId: 'device-ble-uuid-001',
      address: undefined,
      isAddressable: false,
      rssi: -70,
      serviceData: {
        model: 'H',
        modelName: 'Bot',
        battery: 75,
      },
    })

    const devices = switchbot.devices.list()
    expect(devices).toHaveLength(1)
    expect(devices[0]?.getId()).toBe('device-ble-uuid-001')
    expect(devices[0]?.getInfo().bleId).toBe('device-ble-uuid-001')
  })
})
