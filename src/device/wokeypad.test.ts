import type { keypadDetectorServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoKeypad } from '../device/wokeypad.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woKeypad', () => {
  describe('parseServiceData', () => {
    const emitLog = vi.fn()

    it('should return null if serviceData length is less than 3', async () => {
      const serviceData = Buffer.from([0x01, 0x02])
      const manufacturerData = Buffer.from([0x01, 0x02])

      const result = await WoKeypad.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoKeypad] Service Data Buffer length 2 < 3!')
    })

    it('should return null if manufacturerData length is less than 2', async () => {
      const serviceData = Buffer.from([0x26, 0x01, 0x02])
      const manufacturerData = Buffer.from([0x01])

      const result = await WoKeypad.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoKeypad] Manufacturer Data Buffer length 1 < 2!')
    })

    it('should return null if modelId is not 0x26', async () => {
      const serviceData = Buffer.from([0x25, 0x01, 0x02])
      const manufacturerData = Buffer.from([0x01, 0x02])

      const result = await WoKeypad.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoKeypad] Model ID 37 !== 0x26!')
    })

    it('should return parsed data if serviceData and manufacturerData are valid', async () => {
      const serviceData = Buffer.from([0x26, 0x03, 0x85])
      const manufacturerData = Buffer.from([0x01, 0x02])

      const result = await WoKeypad.parseServiceData(serviceData, manufacturerData, emitLog)

      const expectedData: keypadDetectorServiceData = {
        model: SwitchBotBLEModel.Keypad,
        modelName: SwitchBotBLEModelName.Keypad,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Keypad,
        event: true,
        tampered: true,
        battery: 5,
        low_battery: true,
      }

      expect(result).toEqual(expectedData)
    })
  })
})
