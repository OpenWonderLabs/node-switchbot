import type { ConnectionType, DeviceInfo } from '../../src/types/index.js'
import { describe, expect, it, vi } from 'vitest'
import { WoBlindTilt } from '../../src/devices/wo-blind-tilt.js'

describe('woBlindTilt Fallback Logic', () => {
  const info: DeviceInfo = {
    id: 'blind-tilt-1',
    name: 'Test Blind Tilt',
    deviceType: 'WoBlindTilt',
    connectionTypes: ['ble', 'api'] as ConnectionType[],
    mac: 'AA:BB:CC:DD:EE:11',
    cloudServiceEnabled: true,
  }

  it('prefers BLE for status if available', async () => {
    // Only provide properties that WoBlindTilt.getStatus returns and match undefined for optional ones
    const bleStatus = {
      position: 50,
      inMotion: false,
      calibration: true,
      battery: 80,
    }
    const expected = {
      deviceId: 'blind-tilt-1',
      connectionType: 'ble',
      position: 50,
      direction: undefined,
      moving: false,
      calibrated: true,
      battery: 80,
    }
    const bleConnection = { read: vi.fn().mockResolvedValue(bleStatus) } as any
    const apiClient = { getStatus: vi.fn().mockResolvedValue({ ...bleStatus }) } as any
    const device = new WoBlindTilt(info, { bleConnection, apiClient })
    device.hasBLE = () => true
    device.hasAPI = () => true
    const status = await device.getStatus()
    expect(bleConnection.read).toHaveBeenCalled()
    expect(apiClient.getStatus).not.toHaveBeenCalled()
    expect(status).toMatchObject(expected)
  })

  it('falls back to API if BLE fails', async () => {
    // Only provide properties that WoBlindTilt.getStatus expects from API
    const apiStatus = {
      slidePosition: 50,
      moving: false,
      calibrate: true,
      battery: 80,
    }
    const expected = {
      deviceId: 'blind-tilt-1',
      connectionType: 'api',
      position: 50,
      direction: undefined,
      moving: false,
      calibrated: true,
      battery: 80,
    }
    const bleConnection = { read: vi.fn().mockRejectedValue(new Error('BLE error')) } as any
    const apiClient = { getStatus: vi.fn().mockResolvedValue(apiStatus) } as any
    const device = new WoBlindTilt(info, { bleConnection, apiClient })
    device.hasBLE = () => true
    device.hasAPI = () => true
    const status = await device.getStatus()
    expect(bleConnection.read).toHaveBeenCalled()
    expect(apiClient.getStatus).toHaveBeenCalled()
    expect(status).toMatchObject(expected)
  })

  it('throws if both BLE and API fail', async () => {
    const bleConnection = { read: vi.fn().mockRejectedValue(new Error('BLE error')) } as any
    const apiClient = { getStatus: vi.fn().mockRejectedValue(new Error('API error')) } as any
    const device = new WoBlindTilt(info, { bleConnection, apiClient })
    await expect(device.getStatus()).rejects.toThrow()
  })
})
