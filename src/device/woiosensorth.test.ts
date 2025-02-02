import type { } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoIOSensorTH } from '../device/woiosensorth.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woIOSensorTH', () => {
  describe('parseServiceData', () => {
    const emitLog = vi.fn()

    it('should return parsed data for valid buffers', async () => {
      const serviceData = Buffer.from([0x00, 0x00, 0x64])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1E, 0x2A, 0x50, 0x00])

      const result = await WoIOSensorTH.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toEqual({
        model: SwitchBotBLEModel.OutdoorMeter,
        modelName: SwitchBotBLEModelName.OutdoorMeter,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.OutdoorMeter,
        celsius: 42.6,
        fahrenheit: 108.7,
        fahrenheit_mode: true,
        humidity: 80,
        battery: 100,
      })
      expect(emitLog).not.toHaveBeenCalled()
    })

    it('should return null for invalid serviceData length', async () => {
      const serviceData = Buffer.from([0x00, 0x00])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1E, 0x2A, 0x50, 0x00])

      const result = await WoIOSensorTH.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoIOSensorTH] Service Data Buffer length 2 !== 3!')
    })

    it('should return null for invalid manufacturerData length', async () => {
      const serviceData = Buffer.from([0x00, 0x00, 0x64])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1E, 0x2A])

      const result = await WoIOSensorTH.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoIOSensorTH] Manufacturer Data Buffer length 12 !== 14!')
    })
  })
})
