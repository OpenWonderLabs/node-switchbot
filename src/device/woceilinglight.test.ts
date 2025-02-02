import type { } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoCeilingLight } from '../device/woceilinglight.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woCeilingLight', () => {
  const emitLog = vi.fn()

  describe('parseServiceData', () => {
    it('should parse valid manufacturer data', async () => {
      const manufacturerData = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x03, 0x04, 0x05, 0x06, 0x87, 0x08, 0x09, 0x00, 0x00])
      const result = await WoCeilingLight.parseServiceData(manufacturerData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.CeilingLight,
        modelName: SwitchBotBLEModelName.CeilingLight,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLight,
        power: 0x01,
        red: 0x02,
        green: 0x03,
        blue: 0x04,
        color_temperature: 0x05,
        state: true,
        brightness: 0x06,
        delay: true,
        preset: false,
        color_mode: 0x07,
        speed: 0x08,
        loop_index: 0x08,
      })
    })

    it('should return null for invalid manufacturer data length', async () => {
      const manufacturerData = Buffer.from([0x00, 0x01, 0x00])
      const result = await WoCeilingLight.parseServiceData(manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoCeilingLight] Buffer length 3 !== 13!')
    })
  })

  describe('parseServiceData_Pro', () => {
    it('should parse valid manufacturer data for Pro', async () => {
      const manufacturerData = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x03, 0x04, 0x05, 0x06, 0x87, 0x08, 0x09, 0x00, 0x00])
      const result = await WoCeilingLight.parseServiceData_Pro(manufacturerData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.CeilingLightPro,
        modelName: SwitchBotBLEModelName.CeilingLightPro,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLightPro,
        power: 0x01,
        red: 0x02,
        green: 0x03,
        blue: 0x04,
        color_temperature: 0x05,
        state: true,
        brightness: 0x06,
        delay: true,
        preset: false,
        color_mode: 0x07,
        speed: 0x08,
        loop_index: 0x08,
      })
    })

    it('should return null for invalid manufacturer data length for Pro', async () => {
      const manufacturerData = Buffer.from([0x00, 0x01, 0x00])
      const result = await WoCeilingLight.parseServiceData_Pro(manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoCeilingLightPro] Buffer length 3 !== 13!')
    })
  })

  describe('operateCeilingLight', () => {
    it('should return true for successful operation', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const device = new WoCeilingLight(peripheral, emitLog as any)
      vi.spyOn(device, 'command').mockResolvedValue(Buffer.from([0x00, 0x80]))
      const result = await device.operateCeilingLight([0x57, 0x0F, 0x48, 0x01])
      expect(result).toBe(true)
    })

    it('should throw an error for invalid response length', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const device = new WoCeilingLight(peripheral, emitLog as any)
      vi.spyOn(device, 'command').mockResolvedValue(Buffer.from([0x00]))
      await expect(device.operateCeilingLight([0x57, 0x0F, 0x48, 0x01])).rejects.toThrow('Expecting a 2-byte response, got instead: 0x00')
    })
  })
})
