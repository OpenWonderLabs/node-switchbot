import type { ConnectionType, DeviceInfo } from '../../src/types/index.js'
import { describe, expect, it, vi } from 'vitest'
import { WoPlugMiniUS } from '../../src/devices/wo-plug-mini-us.js'

describe('woPlugMiniUS Fallback Logic', () => {
  const info: DeviceInfo = {
    id: 'plug-mini-us-1',
    name: 'Test Plug Mini US',
    deviceType: 'WoPlugMiniUS',
    connectionTypes: ['ble', 'api'] as ConnectionType[],
    mac: 'AA:BB:CC:DD:EE:22',
    cloudServiceEnabled: true,
  }

  it('prefers BLE for status if available', async () => {
    // BLE mock should use 'state' (boolean), not 'power'
    const bleStatus = { state: true, voltage: 120, electricCurrent: 10, electricityOfDay: 5 }
    const expectedStatus = {
      deviceId: 'plug-mini-us-1',
      connectionType: 'ble',
      power: 'on',
      voltage: 120,
      electricCurrent: 10,
      electricityOfDay: 5,
    }
    const bleConnection = { read: vi.fn().mockResolvedValue(bleStatus) } as any
    const apiClient = { getStatus: vi.fn().mockResolvedValue({ ...expectedStatus }) } as any
    const device = new WoPlugMiniUS(info, { bleConnection, apiClient })
    device.hasBLE = () => true
    device.hasAPI = () => true
    const status = await device.getStatus()
    expect(bleConnection.read).toHaveBeenCalled()
    expect(apiClient.getStatus).not.toHaveBeenCalled()
    expect(status).toMatchObject(expectedStatus)
  })

  it('falls back to API if BLE fails', async () => {
    const apiStatus = { deviceId: 'plug-mini-us-1', power: 'on', voltage: 120, electricCurrent: 10, electricityOfDay: 5 }
    const bleConnection = { read: vi.fn().mockRejectedValue(new Error('BLE error')) } as any
    const apiClient = { getStatus: vi.fn().mockResolvedValue(apiStatus) } as any
    const device = new WoPlugMiniUS(info, { bleConnection, apiClient })
    device.hasBLE = () => true
    device.hasAPI = () => true
    const status = await device.getStatus()
    expect(bleConnection.read).toHaveBeenCalled()
    expect(apiClient.getStatus).toHaveBeenCalled()
    expect(status).toMatchObject(apiStatus)
  })

  it('throws if both BLE and API fail', async () => {
    const bleConnection = { read: vi.fn().mockRejectedValue(new Error('BLE error')) } as any
    const apiClient = { getStatus: vi.fn().mockRejectedValue(new Error('API error')) } as any
    const device = new WoPlugMiniUS(info, { bleConnection, apiClient })
    await expect(device.getStatus()).rejects.toThrow()
  })
})
