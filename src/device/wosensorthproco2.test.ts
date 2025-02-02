import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoSensorTHProCO2 } from '../device/wosensorthproco2.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woSensorTH', () => {
  const emitLog = vi.fn()

  describe('parseServiceData', () => {
    it('should return null if buffer length is not 7', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x06])
      const result = await WoSensorTHProCO2.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoSensorTHProCO2] Buffer length !== 7!')
    })

    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06])
      const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x06])
      const result = await WoSensorTHProCO2.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.MeterProCO2,
        modelName: SwitchBotBLEModelName.MeterProCO2,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterProCO2,
        celsius: -0.4,
        fahrenheit: 31.3,
        fahrenheit_mode: false,
        humidity: 6,
        battery: 2,
        co2: 5,
      })
    })
  })
})
