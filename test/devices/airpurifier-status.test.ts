import type { DeviceInfo } from '../../src/types/index.js'
import { describe, expect, it, vi } from 'vitest'
import { OpenAPIClient } from '../../src/api.js'
import { WoAirPurifier } from '../../src/devices/wo-air-purifier.js'

function airPurifierInfo(): DeviceInfo {
  return {
    id: 'air-01',
    name: 'Air Purifier',
    deviceType: 'Air Purifier',
    connectionTypes: ['ble', 'api'],
    mac: 'AA:BB:CC:DD:EE:FF',
    cloudServiceEnabled: true,
  }
}

// Helper subclass to inject a mock API client

// Helper subclass to inject a mock API client with all required properties
class TestWoAirPurifier extends WoAirPurifier {
  constructor(info: DeviceInfo, apiClient: any) {
    super(info, { apiClient })
    // Patch: Ensure apiClient is set on the instance for hasAPI()
    this.apiClient = apiClient
    // Force hasAPI to always return true
    this.hasAPI = () => true
    this.hasBLE = () => false
  }

  // Add public setters for protected properties for testing
  setPreferredConnection(val: any) { this.preferredConnection = val }
  setEnableFallback(val: any) { this.enableFallback = val }
}

describe('air purifier status', () => {
  it('returns full status from API', async () => {
    // Use a real OpenAPIClient instance with a mocked getStatus
    const realApiClient = new OpenAPIClient('test-token', 'test-secret')
    vi.spyOn(realApiClient, 'getStatus').mockResolvedValue({
      power: 'on',
      fanSpeed: 3,
      airMode: 'auto',
      pm25: 42,
      version: '1.0',
      deviceId: '',
      deviceType: '',
      hubDeviceId: '',
    })
    const purifier = new TestWoAirPurifier({
      ...airPurifierInfo(),
      connectionTypes: ['api'],
      cloudServiceEnabled: true,
      id: 'air-01',
      name: 'Air Purifier',
      deviceType: 'Air Purifier',
    }, realApiClient)
    purifier.setPreferredConnection('api')
    purifier.setEnableFallback(false)
    const status = await purifier.getStatus()
    expect(status.power).toBe('on')
    expect(status.fanSpeed).toBe(3)
    expect(status.mode).toBe('auto')
    expect(status.pm25).toBe(42)
    expect(status.airQuality).toBe('good')
    expect(status.version).toBe('1.0')
  })

  it('returns full status from BLE', async () => {
    const purifier = new WoAirPurifier(airPurifierInfo())
    ;(purifier as any).hasAPI = () => false
    ;(purifier as any).hasBLE = () => true
    ;(purifier as any).getBLEStatus = vi.fn().mockResolvedValue({
      state: true,
      fanSpeed: 2,
      mode: 'manual',
      pm25: 120,
    })
    const status = await purifier.getStatus()
    expect(status.power).toBe('on')
    expect(status.fanSpeed).toBe(2)
    expect(status.mode).toBe('manual')
    expect(status.pm25).toBe(120)
    // BLE fallback does not compute airQuality
    expect(status.airQuality).toBeUndefined()
  })
})
