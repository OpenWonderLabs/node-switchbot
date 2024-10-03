import type * as Noble from '@stoprocent/noble'

import { jest } from '@jest/globals'

import { SwitchbotDevice } from '../device.js'

jest.mock('@stoprocent/noble')

describe('switchbotDevice', () => {
  let mockPeripheral: jest.Mocked<Noble.Peripheral>
  let mockNoble: jest.Mocked<typeof Noble>

  beforeEach(() => {
    mockPeripheral = {
      connectAsync: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      disconnectAsync: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      discoverServicesAsync: jest.fn<() => Promise<Noble.Service[]>>().mockResolvedValue([]),
      state: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'disconnecting',
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      discoverCharacteristicsAsync: jest.fn<() => Promise<Noble.Characteristic[]>>().mockResolvedValue([]),
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

  it('should throw an error if Bluetooth is not powered on', async () => {
    mockNoble._state = 'poweredOff'
    const device = new SwitchbotDevice(mockPeripheral, mockNoble)
    await expect(device.connect()).rejects.toThrow('The Bluetooth status is poweredOff, not poweredOn.')
  })

  it('should throw an error if trying to connect while already connecting or disconnecting', async () => {
    mockPeripheral.state = 'connecting'
    const device = new SwitchbotDevice(mockPeripheral, mockNoble)
    await expect(device.connect()).rejects.toThrow('Now connecting. Wait for a few seconds then try again.')
  })

  it('should throw an error if no service was found', async () => {
    mockPeripheral.discoverServicesAsync.mockResolvedValue([])
    const device = new SwitchbotDevice(mockPeripheral, mockNoble)
    await expect(device.discoverServices()).rejects.toThrow('No service was found.')
  })

  it('should throw an error if no characteristic was found', async () => {
    mockPeripheral.discoverServicesAsync.mockResolvedValue([{ uuid: 'primary', discoverCharacteristicsAsync: jest.fn<() => Promise<Noble.Characteristic[]>>().mockResolvedValue([]) } as unknown as Noble.Service])
    const device = new SwitchbotDevice(mockPeripheral, mockNoble)
    await expect(device.getCharacteristics()).rejects.toThrow('No characteristic was found.')
  })
})
