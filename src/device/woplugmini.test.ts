import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'
import { WoPlugMini } from './woplugmini.js'

describe('woPlugMini', () => {
  let manufacturerData: Buffer
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  describe('parseServiceData_US', () => {
    it('should return null if manufacturerData length is not 14', async () => {
      manufacturerData = Buffer.alloc(13)
      const result = await WoPlugMini.parseServiceData_US(manufacturerData, onlog)
      expect(result).toBeNull()
      expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoPlugMiniUS] Buffer length 13 should be 14')
    })

    it('should parse the service data correctly', async () => {
      manufacturerData = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0x80, 0x07, 0x64, 0x80, 0x40, 0x01])
      const result = await WoPlugMini.parseServiceData_US(manufacturerData, onlog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.PlugMiniUS,
        modelName: SwitchBotBLEModelName.PlugMini,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini,
        state: 'on',
        delay: true,
        timer: true,
        syncUtcTime: false,
        wifiRssi: 100,
        overload: true,
        currentPower: 32.1,
      })
    })
  })

  describe('parseServiceData_JP', () => {
    it('should return null if manufacturerData length is not 14', async () => {
      manufacturerData = Buffer.alloc(13)
      const result = await WoPlugMini.parseServiceData_JP(manufacturerData, onlog)
      expect(result).toBeNull()
      expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoPlugMiniJP] Buffer length 13 should be 14')
    })

    it('should parse the service data correctly', async () => {
      manufacturerData = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0x80, 0x07, 0x64, 0x80, 0x40, 0x01])
      const result = await WoPlugMini.parseServiceData_JP(manufacturerData, onlog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.PlugMiniJP,
        modelName: SwitchBotBLEModelName.PlugMini,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini,
        state: 'on',
        delay: true,
        timer: true,
        syncUtcTime: false,
        wifiRssi: 100,
        overload: true,
        currentPower: 32.1,
      })
    })
  })

  describe('state operations', () => {
    let plugMini: WoPlugMini

    beforeEach(() => {
      const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
      plugMini = new WoPlugMini(peripheral as Noble.Peripheral, Noble)
      jest.spyOn(plugMini, 'operatePlug').mockImplementation(async (bytes: number[]) => {
        if (bytes.includes(0x80)) {
          return
        }
        if (bytes.includes(0x00)) {
          // Intentionally left empty
        }
      })
    })

    it('should read state correctly', async () => {
      const result = await plugMini.readState()
      expect(result).toBe(true)
    })

    it('should turn on correctly', async () => {
      const result = await plugMini.turnOn()
      expect(result).toBe(true)
    })

    it('should turn off correctly', async () => {
      const result = await plugMini.turnOff()
      expect(result).toBe(false)
    })

    it('should toggle correctly', async () => {
      const result = await plugMini.toggle()
      expect(result).toBe(true)
    })
  })
})
