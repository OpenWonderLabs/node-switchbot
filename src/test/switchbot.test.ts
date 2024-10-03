import { Buffer } from 'node:buffer'

import sinon from 'sinon'
import { expect } from 'vitest'

import { WoHumi } from '../device/wohumi.js'
import { SwitchBotBLE } from '../switchbot-ble.js'
import { SwitchBotBLEModel } from '../types/types.js'

describe('switchBot', () => {
  let switchBot: SwitchBotBLE
  let nobleMock: any

  beforeEach(() => {
    nobleMock = {
      on: sinon.stub(),
      startScanningAsync: sinon.stub().resolves(),
      stopScanningAsync: sinon.stub().resolves(),
      removeAllListeners: sinon.stub(),
      _state: 'poweredOn',
      once: sinon.stub(),
    }
    switchBot = new SwitchBotBLE({ noble: nobleMock })
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should initialize noble object', async () => {
    await switchBot.init({ noble: nobleMock })
    expect(switchBot.noble).toBe(nobleMock)
  })

  it('should discover devices', async () => {
    const peripheralMock = {
      id: 'mock-id',
      uuid: 'mock-uuid',
      address: 'mock-address',
      addressType: 'public',
      connectable: true,
      advertisement: {
        serviceData: [{ uuid: 'mock-uuid', data: Buffer.from([0x01, 0x02]) }],
        localName: 'mock-localName',
        txPowerLevel: -59,
        manufacturerData: Buffer.from([0x01, 0x02, 0x03, 0x04]),
        serviceUuids: ['mock-service-uuid'],
      },
      rssi: -50,
      services: [],
      state: 'disconnected' as const,
      mtu: 23,
      connect: sinon.stub(),
      connectAsync: sinon.stub().resolves(),
      disconnect: sinon.stub(),
      disconnectAsync: sinon.stub().resolves(),
      updateRssi: sinon.stub(),
      updateRssiAsync: sinon.stub().resolves(),
      discoverServices: sinon.stub(),
      discoverServicesAsync: sinon.stub().resolves(),
      discoverSomeServicesAndCharacteristics: sinon.stub(),
      discoverSomeServicesAndCharacteristicsAsync: sinon.stub().resolves(),
      discoverAllServicesAndCharacteristics: sinon.stub(),
      discoverAllServicesAndCharacteristicsAsync: sinon.stub().resolves(),
      readHandle: sinon.stub(),
      readHandleAsync: sinon.stub().resolves(),
      writeHandle: sinon.stub(),
      writeHandleAsync: sinon.stub().resolves(),
      cancelConnect: sinon.stub(),
      on: sinon.stub(),
      once: sinon.stub(),
      addListener: sinon.stub(),
      removeListener: sinon.stub(),
      removeAllListeners: sinon.stub(),
      emit: sinon.stub(),
      listeners: sinon.stub(),
      eventNames: sinon.stub(),
      listenerCount: sinon.stub(),
      off: sinon.stub(),
      setMaxListeners: sinon.stub(),
      getMaxListeners: sinon.stub(),
      rawListeners: sinon.stub(),
      prependListener: sinon.stub(),
      prependOnceListener: sinon.stub(),
    }
    const getDeviceObjectStub = sinon.stub(switchBot, 'getDeviceObject').resolves(new WoHumi(peripheralMock, nobleMock))
    nobleMock.on.withArgs('discover').yields(peripheralMock)

    const devices = await switchBot.discover({ duration: 1000, model: SwitchBotBLEModel.Humidifier })

    expect(devices).toHaveLength(1)
    expect(devices[0]).toBeInstanceOf(WoHumi)
    expect(getDeviceObjectStub.calledOnce).toBe(true)
  })

  it('should handle noble state changes', async () => {
    nobleMock._state = 'poweredOff'
    const initPromise = switchBot._init()

    nobleMock.once.withArgs('stateChange').yields('poweredOn')
    await initPromise

    expect(nobleMock.once.calledWith('stateChange')).toBe(true)
  })

  it('should filter advertising data correctly', async () => {
    const ad = {
      id: 'mock-id',
      address: 'mock-address',
      rssi: -50,
      serviceData: {
        model: SwitchBotBLEModel.Humidifier,
      },
    }
    const result = await switchBot.filterAdvertising(ad, 'mock-id', SwitchBotBLEModel.Humidifier)
    expect(result).toBe(true)
  })
})
