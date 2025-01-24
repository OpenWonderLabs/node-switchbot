import type { Mocked } from 'vitest'

import type { NobleTypes } from '../types/types.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SwitchbotDevice } from '../device.js'

describe('switchbotDevice', () => {
  let mockPeripheral: Mocked<NobleTypes['peripheral']>
  let mockNoble: Mocked<NobleTypes['noble']>

  beforeEach(() => {
    mockPeripheral = {
      connectAsync: vi.fn().mockResolvedValue(undefined),
      disconnectAsync: vi.fn().mockResolvedValue(undefined),
      discoverServicesAsync: vi.fn().mockResolvedValue([]),
      state: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'disconnecting',
      once: vi.fn(),
      removeAllListeners: vi.fn(),
      discoverCharacteristicsAsync: vi.fn().mockResolvedValue([]),
    } as unknown as Mocked<NobleTypes['peripheral']>

    mockNoble = {
      _state: 'poweredOn',
    } as unknown as Mocked<NobleTypes['noble']>
  })

  it('should initialize with correct properties', async () => {
    const device = new SwitchbotDevice(mockPeripheral, mockNoble)
    expect(device.id).toBe('')
    expect(device.address).toBe('')
    expect(device.model).toBe('')
    expect(device.modelName).toBe('')
    expect(device.connectionState).toBe('disconnected')
  })

  it('should connect to the device', async () => {
    const device = new SwitchbotDevice(mockPeripheral, mockNoble)
    await device.connect()
    expect(mockPeripheral.connectAsync).toHaveBeenCalled()
  })

  it('should disconnect from the device', async () => {
    const device = new SwitchbotDevice(mockPeripheral, mockNoble)
    await device.disconnect()
    expect(mockPeripheral.disconnectAsync).toHaveBeenCalled()
  })
})
