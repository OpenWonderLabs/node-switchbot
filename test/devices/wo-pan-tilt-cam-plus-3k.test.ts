import type { ConnectionType, DeviceInfo } from '../../src/types/index.js'
import { describe, expect, it, vi } from 'vitest'
import { WoPanTiltCamPlus3K } from '../../src/devices/wo-pan-tilt-cam-plus-3k.js'

// Minimal type-complete BLEConnection mock
function createBLEConnectionMock(overrides: Partial<any> = {}) {
  return {
    noble: undefined,
    logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} },
    connections: {},
    characteristics: {},
    read: vi.fn(),
    ...overrides,
  }
}

// Minimal type-complete OpenAPIClient mock
function createAPIClientMock(overrides: Partial<any> = {}) {
  return {
    logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} },
    token: '',
    secret: '',
    baseURL: '',
    getStatus: vi.fn(),
    ...overrides,
  }
}

describe('woPanTiltCamPlus3K Fallback Logic', () => {
  const info: DeviceInfo = {
    id: 'pan-tilt-cam-3k-1',
    name: 'Test Pan Tilt Cam 3K',
    deviceType: 'WoPanTiltCamPlus3K',
    connectionTypes: ['ble', 'api'] as ConnectionType[],
    mac: 'AA:BB:CC:DD:EE:33',
    cloudServiceEnabled: true,
  }

  it('prefers BLE for status if available', async () => {
    const bleConnection = createBLEConnectionMock({ read: vi.fn().mockResolvedValue({ status: 'ok' }) }) as unknown as import('../../src/ble.js').BLEConnection
    const apiClient = createAPIClientMock({ getStatus: vi.fn().mockResolvedValue({ status: 'ok' }) }) as unknown as import('../../src/api.js').OpenAPIClient
    const device = new WoPanTiltCamPlus3K(info, { bleConnection, apiClient })
    const status = await device.getStatus()
    expect(bleConnection.read).toHaveBeenCalled()
    expect(apiClient.getStatus).not.toHaveBeenCalled()
    expect(status.connectionType).toBe('ble')
  })

  it('falls back to API if BLE fails', async () => {
    const bleConnection = createBLEConnectionMock({ read: vi.fn().mockRejectedValue(new Error('BLE error')) }) as unknown as import('../../src/ble.js').BLEConnection
    const apiClient = createAPIClientMock({ getStatus: vi.fn().mockResolvedValue({ status: 'ok' }) }) as unknown as import('../../src/api.js').OpenAPIClient
    const device = new WoPanTiltCamPlus3K(info, { bleConnection, apiClient })
    const status = await device.getStatus()
    expect(bleConnection.read).toHaveBeenCalled()
    expect(apiClient.getStatus).toHaveBeenCalled()
    expect(status.connectionType).toBe('api')
  })

  it('falls back to API if BLE fails (alt path)', async () => {
    const bleConnection = createBLEConnectionMock({ read: vi.fn().mockRejectedValue(new Error('BLE error')) }) as unknown as import('../../src/ble.js').BLEConnection
    const apiClient = createAPIClientMock({ getStatus: vi.fn().mockResolvedValue({ status: 'ok' }) }) as unknown as import('../../src/api.js').OpenAPIClient
    const device = new WoPanTiltCamPlus3K(info, { bleConnection, apiClient })
    const status = await device.getStatus()
    expect(bleConnection.read).toHaveBeenCalled()
    expect(apiClient.getStatus).toHaveBeenCalled()
    expect(status.connectionType).toBe('api')
  })

  it('throws if both BLE and API fail', async () => {
    const bleConnection = createBLEConnectionMock({ read: vi.fn().mockRejectedValue(new Error('BLE error')) }) as unknown as import('../../src/ble.js').BLEConnection
    const apiClient = createAPIClientMock({ getStatus: vi.fn().mockRejectedValue(new Error('API error')) }) as unknown as import('../../src/api.js').OpenAPIClient
    const device = new WoPanTiltCamPlus3K(info, { bleConnection, apiClient })
    await expect(device.getStatus()).rejects.toThrow()
  })
})
