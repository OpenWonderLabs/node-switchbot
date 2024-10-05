import type { } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoHub2 } from '../device/wohub2.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woHub2', () => {
  describe('parseServiceData', () => {
    const emitLog = vi.fn()

    it('should parse valid manufacturer data correctly', async () => {
      const manufacturerData = Buffer.from([
        0x01,
        0x82,
        0x41,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x1F,
        0x00,
        0x00,
        0x00,
      ])

      const result = await WoHub2.parseServiceData(manufacturerData, emitLog)

      expect(result).toEqual({
        model: SwitchBotBLEModel.Hub2,
        modelName: SwitchBotBLEModelName.Hub2,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub2,
        celsius: 2.1,
        fahrenheit: 35.8,
        fahrenheit_mode: true,
        humidity: 65,
        lightLevel: 31,
      })
      expect(emitLog).not.toHaveBeenCalled()
    })

    it('should return null for invalid buffer length', async () => {
      const manufacturerData = Buffer.from([0x01, 0x82])

      const result = await WoHub2.parseServiceData(manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoHub2] Buffer length 2 !== 16!')
    })

    it('should parse negative temperature correctly', async () => {
      const manufacturerData = Buffer.from([
        0x01,
        0x02,
        0x41,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x1F,
        0x00,
        0x00,
        0x00,
      ])

      const result = await WoHub2.parseServiceData(manufacturerData, emitLog)

      expect(result).toEqual({
        model: SwitchBotBLEModel.Hub2,
        modelName: SwitchBotBLEModelName.Hub2,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub2,
        celsius: -2.1,
        fahrenheit: 28.2,
        fahrenheit_mode: true,
        humidity: 65,
        lightLevel: 31,
      })
      expect(emitLog).not.toHaveBeenCalled()
    })
  })
})
