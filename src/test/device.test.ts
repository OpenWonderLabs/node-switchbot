import type * as Noble from '@stoprocent/noble'

import { SwitchbotDevice } from '../device.js'

describe('switchbotDevice', () => {
  let mockPeripheral: jest.Mocked<Noble.Peripheral>
  let mockNoble: jest.Mocked<typeof Noble>

  beforeEach(() => {
    mockPeripheral = {
      connectAsync: jest.fn().mockResolvedValue(undefined),
      disconnectAsync: jest.fn().mockResolvedValue(undefined),
      discoverServicesAsync: jest.fn().mockResolvedValue([]),
      state: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'disconnecting',
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      discoverCharacteristicsAsync: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Noble.Peripheral>

    mockNoble = {
      _state: 'poweredOn',
    } as unknown as jest.Mocked<typeof Noble>
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
