import { Buffer } from 'node:buffer'

import { WoSensorTH } from '../device/wosensorth.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woSensorTH', () => {
  const emitLog = jest.fn()

  describe('parseServiceData', () => {
    it('should return null if buffer length is not 6', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05])
      const result = await WoSensorTH.parseServiceData(serviceData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoSensorTH] Buffer length 5 !== 6!')
    })

    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06])
      const result = await WoSensorTH.parseServiceData(serviceData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.Meter,
        modelName: SwitchBotBLEModelName.Meter,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter,
        celsius: -0.4,
        fahrenheit: 31.3,
        fahrenheit_mode: false,
        humidity: 6,
        battery: 2,
      })
    })
  })

  describe('parseServiceData_Plus', () => {
    it('should return null if buffer length is not 6', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05])
      const result = await WoSensorTH.parseServiceData_Plus(serviceData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoSensorTHPlus] Buffer length 5 !== 6!')
    })

    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06])
      const result = await WoSensorTH.parseServiceData_Plus(serviceData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.MeterPlus,
        modelName: SwitchBotBLEModelName.MeterPlus,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPlus,
        celsius: -0.4,
        fahrenheit: 31.3,
        fahrenheit_mode: false,
        humidity: 6,
        battery: 2,
      })
    })
  })
})
