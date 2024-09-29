/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * woceiling.test.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { WoCeilingLight } from '../device/woceilinglight.js'

describe('woCeilingLight', () => {
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  it('should return null if manufacturerData length is not 13', async () => {
    const manufacturerData = Buffer.alloc(12) // Invalid length
    const result = await WoCeilingLight.parseServiceData(manufacturerData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoCeilingLight] Buffer length 12 !== 13!')
  })

  it('should parse valid manufacturerData correctly', async () => {
    const manufacturerData = Buffer.from([0x00, 0x01, 0x00, 0xFF, 0x00, 0x00, 0x64, 0x7F, 0x80, 0x00, 0x00, 0x00, 0x00])
    const result = await WoCeilingLight.parseServiceData(manufacturerData, onlog)
    expect(result).toEqual({
      model: 'CeilingLight',
      modelName: 'CeilingLight',
      modelFriendlyName: 'CeilingLight',
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

  describe('operateCeilingLight', () => {
    let woCeilingLight: WoCeilingLight

    beforeEach(() => {
      const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
      woCeilingLight = new WoCeilingLight(peripheral as any, {} as any)
      jest.spyOn(woCeilingLight, 'command').mockResolvedValue(Buffer.from([0x00, 0x80]))
    })

    it('readState should call operateCeilingLight with correct bytes', async () => {
      const operateCeilingLightSpy = jest.spyOn(woCeilingLight as any, 'operateCeilingLight')
      await woCeilingLight.readState()
      expect(operateCeilingLightSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x48, 0x01])
    })

    it('setState should call operateCeilingLight with correct bytes', async () => {
      const operateCeilingLightSpy = jest.spyOn(woCeilingLight as any, 'operateCeilingLight')
      await woCeilingLight.setState([0x01, 0x01])
      expect(operateCeilingLightSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x47, 0x01, 0x01, 0x01])
    })

    it('turnOn should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woCeilingLight, 'setState')
      await woCeilingLight.turnOn()
      expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x01])
    })

    it('turnOff should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woCeilingLight, 'setState')
      await woCeilingLight.turnOff()
      expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x02])
    })

    it('setBrightness should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woCeilingLight, 'setState')
      await woCeilingLight.setBrightness(50)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x14, 50])
    })

    it('setColorTemperature should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woCeilingLight, 'setState')
      await woCeilingLight.setColorTemperature(50)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x17, 50])
    })

    it('setRGB should call setState with correct arguments', async () => {
      const setStateSpy = jest.spyOn(woCeilingLight, 'setState')
      await woCeilingLight.setRGB(50, 255, 0, 0)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x12, 50, 255, 0, 0])
    })

    it('operateCeilingLight should handle successful response', async () => {
      await expect((woCeilingLight as any).operateCeilingLight([0x57, 0x0F, 0x48, 0x01])).resolves.toBe(true)
    })

    it('operateCeilingLight should handle error response', async () => {
      jest.spyOn(woCeilingLight, 'command').mockResolvedValue(Buffer.from([0x00, 0x01]))
      await expect((woCeilingLight as any).operateCeilingLight([0x57, 0x0F, 0x48, 0x01])).rejects.toThrow('The device returned an error: 0x0001')
    })

    it('operateCeilingLight should handle command rejection', async () => {
      jest.spyOn(woCeilingLight, 'command').mockRejectedValue(new Error('Command failed'))
      await expect((woCeilingLight as any).operateCeilingLight([0x57, 0x0F, 0x48, 0x01])).rejects.toThrow('Command failed')
    })
  })
})
