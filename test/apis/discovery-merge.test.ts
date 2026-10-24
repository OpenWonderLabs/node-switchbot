/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * discovery-merge.test.ts: an OpenAPI device is merged into the BLE device it belongs to
 */

import { describe, expect, it, vi } from 'vitest'

import { SwitchBot } from '../../src/switchbot.js'

async function discover(ble: { mac?: string, id: string, model: string, modelName: string }[], api: any[]) {
  const switchbot = new SwitchBot({ enableBLE: false, token: 'token', secret: 'secret' })
  for (const b of ble) {
    await (switchbot as any).handleBLEDiscovery({
      id: b.id,
      address: b.mac ?? '',
      isAddressable: !!b.mac,
      rssi: -60,
      serviceData: { model: b.model, modelName: b.modelName, battery: 90 },
    })
  }
  const apiClient = switchbot.getAPIClient()!
  vi.spyOn(apiClient, 'getDevices').mockResolvedValue({ deviceList: api, infraredRemoteList: [] } as any)
  const sendCommand = vi.spyOn(apiClient, 'sendCommand').mockResolvedValue({ statusCode: 100, message: 'success', body: {} } as any)
  const devices = await switchbot.discover({ scanBLE: false, fetchAPI: true })
  return { switchbot, devices, sendCommand }
}

function apiDevice(deviceId: string, deviceType: string, deviceName: string) {
  return { deviceId, deviceType, deviceName, enableCloudService: true, hubDeviceId: 'HUB', version: 'V1.0' }
}

describe('bLE and OpenAPI device merging', () => {
  // The BLE id is the MAC without colons, which is the OpenAPI deviceId. The BLE and OpenAPI
  // type strings differ ("Meter Plus" vs "MeterPlus"), so matching on type alone missed, and the
  // API record was then dropped because the id already existed. The device never got the API.
  it('merges by device id even when the type strings differ', async () => {
    const { devices } = await discover(
      [{ mac: 'ea:55:25:51:b7:63', id: 'p1', model: 'i', modelName: 'Meter Plus' }],
      [apiDevice('EA552551B763', 'MeterPlus', 'Office Meter')],
    )
    expect(devices).toHaveLength(1)
    expect(devices[0].getId()).toBe('EA552551B763')
    expect(devices[0].getName()).toBe('Office Meter')
    expect(devices[0].getInfo().connectionTypes).toEqual(['ble', 'api'])
  })

  // With one BLE meter in range and two meters in the cloud, the first cloud meter was merged
  // into the BLE meter because it was the only BLE device of that type.
  it('does not merge a different physical device of the same model', async () => {
    const { devices } = await discover(
      [{ mac: 'aa:aa:aa:aa:aa:02', id: 'p2', model: 'T', modelName: 'Meter' }],
      [apiDevice('AAAAAAAAAA01', 'Meter', 'Bedroom'), apiDevice('AAAAAAAAAA02', 'Meter', 'Kitchen')],
    )
    const byId = Object.fromEntries(devices.map(d => [d.getId(), d.getInfo()]))
    expect(Object.keys(byId).sort()).toEqual(['AAAAAAAAAA01', 'AAAAAAAAAA02'])
    expect(byId.AAAAAAAAAA01.name).toBe('Bedroom')
    expect(byId.AAAAAAAAAA01.connectionTypes).toEqual(['api'])
    expect(byId.AAAAAAAAAA02.name).toBe('Kitchen')
    expect(byId.AAAAAAAAAA02.connectionTypes).toEqual(['ble', 'api'])
  })

  // On macOS a BLE device may have no MAC, so it is matched by type. API calls must then use the
  // OpenAPI deviceId, not the BLE peripheral id.
  it('uses the OpenAPI deviceId for API calls on a device matched without a MAC', async () => {
    const { devices, sendCommand } = await discover(
      [{ id: 'macos-peripheral-uuid', model: 'g', modelName: 'Plug Mini (US)' }],
      [apiDevice('D83BDA1173CA', 'Plug Mini (US)', 'Lamp')],
    )
    expect(devices).toHaveLength(1)
    expect(devices[0].getInfo().connectionTypes).toEqual(['ble', 'api'])
    ;(devices[0] as any).setPreferredConnection('api')
    await (devices[0] as any).turnOn()
    expect(sendCommand).toHaveBeenCalledWith('D83BDA1173CA', 'turnOn', undefined)
  })
})
