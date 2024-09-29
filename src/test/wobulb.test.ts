/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wobulb.test.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { WoBulb } from '../device/wobulb.js'

describe('woBulb', () => {
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  it('should return null if serviceData length is not 18', async () => {
    const serviceData = Buffer.alloc(17) // Invalid length
    const manufacturerData = Buffer.alloc(13)
    const result = await WoBulb.parseServiceData(serviceData, manufacturerData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoBulb] Buffer length 17 !== 18!')
  })

  it('should return null if manufacturerData length is not 13', async () => {
    const serviceData = Buffer.alloc(18)
    const manufacturerData = Buffer.alloc(12) // Invalid length
    const result = await WoBulb.parseServiceData(serviceData, manufacturerData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoBulb] Buffer length 12 !== 13!')
  })

  it('should parse valid serviceData and manufacturerData correctly', async () => {
    const serviceData = Buffer.alloc(18)
    const manufacturerData = Buffer.from([0x00, 0x01, 0x00, 0xFF, 0x00, 0x00, 0x64, 0x7F, 0x80, 0x00, 0x00, 0x00, 0x00])
    const result = await WoBulb.parseServiceData(serviceData, manufacturerData, onlog)
    expect(result).toEqual({
      model: 'ColorBulb',
      modelName: 'ColorBulb',
      modelFriendlyName: 'ColorBulb',
      power: 1,
      red: 255,
      green: 0,
      blue: 0,
      color_temperature: 100,
      state: true,
      brightness: 127,
      delay: true,
      preset: false,
      color_mode: 0,
      speed: 0,
      loop_index: 0,
    })
    expect(onlog).not.toHaveBeenCalled()
  })

  describe('operateBulb', () => {
    let woBulb: WoBulb

    beforeEach(() => {
      const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
      woBulb = new WoBulb(peripheral as any, {} as any)
      jest.spyOn(woBulb, 'command').mockResolvedValue(Buffer.from([0x00, 0x80]))
    })

    it('readState should call operateBulb with correct bytes', async () => {
      const operateBulbSpy = jest.spyOn(woBulb as any, 'operateBulb')
      await woBulb.readState()
      expect(operateBulbSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x48, 0x01])
    })

    it('setState should call operateBulb with correct bytes', async () => {
      const operateBulbSpy = jest.spyOn(woBulb as any, 'operateBulb')
      await woBulb.setState([0x01, 0x01])
      expect(operateBulbSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x47, 0x01, 0x01, 0x01])
    })

    it('turnOn should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woBulb as any, 'setState')
      await woBulb.turnOn()
      expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x01])
    })

    it('turnOff should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woBulb as any, 'setState')
      await woBulb.turnOff()
      expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x02])
    })

    it('setBrightness should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woBulb as any, 'setState')
      await woBulb.setBrightness(50)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x14, 50])
    })

    it('setColorTemperature should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woBulb as any, 'setState')
      await woBulb.setColorTemperature(50)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x17, 50])
    })

    it('setRGB should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woBulb as any, 'setState')
      await woBulb.setRGB(50, 255, 0, 0)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x12, 50, 255, 0, 0])
    })

    it('operateBulb should handle successful response', async () => {
      await expect((woBulb as any).operateBulb([0x57, 0x0F, 0x48, 0x01])).resolves.toBe(true)
    })

    it('operateBulb should handle error response', async () => {
      jest.spyOn(woBulb, 'command').mockResolvedValue(Buffer.from([0x00, 0x01]))
      await expect((woBulb as any).operateBulb([0x57, 0x0F, 0x48, 0x01])).rejects.toThrow('The device returned an error: 0x0001')
    })

    it('operateBulb should handle command rejection', async () => {
      jest.spyOn(woBulb, 'command').mockRejectedValue(new Error('Command failed'))
      await expect((woBulb as any).operateBulb([0x57, 0x0F, 0x48, 0x01])).rejects.toThrow('Command failed')
    })
  })
})
