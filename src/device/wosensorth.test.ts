import type { meterPlusServiceData, meterServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'
// wosensorth.test.ts
import { WoSensorTH } from './wosensorth.js'

describe('woSensorTH', () => {
  it('should parse service data correctly for Meter', async () => {
    const serviceData = Buffer.from([0x00, 0x00, 0x7F, 0x0A, 0x81, 0x80])
    const expectedData: meterServiceData = {
      model: SwitchBotBLEModel.Meter,
      modelName: SwitchBotBLEModelName.Meter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter,
      temperature: {
        c: -1.0,
        f: 30.2,
      },
      celcius: -1.0,
      fahrenheit: 30.2,
      fahrenheit_mode: true,
      humidity: 0,
      battery: 127,
    }

    const result = await WoSensorTH.parseServiceData(serviceData, undefined)
    expect(result).toEqual(expectedData)
  })

  it('should parse service data correctly for MeterPlus', async () => {
    const serviceData = Buffer.from([0x00, 0x00, 0x7F, 0x0A, 0x81, 0x80])
    const expectedData: meterPlusServiceData = {
      model: SwitchBotBLEModel.MeterPlus,
      modelName: SwitchBotBLEModelName.MeterPlus,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPlus,
      temperature: {
        c: -1.0,
        f: 30.2,
      },
      celcius: -1.0,
      fahrenheit: 30.2,
      fahrenheit_mode: true,
      humidity: 0,
      battery: 127,
    }

    const result = await WoSensorTH.parseServiceData_Plus(serviceData, undefined)
    expect(result).toEqual(expectedData)
  })

  it('should log an error if service data length is incorrect for Meter', async () => {
    const serviceData = Buffer.from([0x00, 0x00, 0x7F])
    const mockLog = jest.fn()

    const result = await WoSensorTH.parseServiceData(serviceData, mockLog)
    expect(result).toBeNull()
    expect(mockLog).toHaveBeenCalledWith('[parseServiceDataForWoSensorTH] Buffer length 3 !== 6!')
  })

  it('should log an error if service data length is incorrect for MeterPlus', async () => {
    const serviceData = Buffer.from([0x00, 0x00, 0x7F])
    const mockLog = jest.fn()

    const result = await WoSensorTH.parseServiceData_Plus(serviceData, mockLog)
    expect(result).toBeNull()
    expect(mockLog).toHaveBeenCalledWith('[parseServiceDataForWoSensorTHPlus] Buffer length 3 !== 6!')
  })
})
