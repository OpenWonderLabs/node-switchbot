import { Buffer } from 'node:buffer'

import { WoIOSensorTH } from './woiosensorth.js'

describe('woIOSensorTH', () => {
  const validServiceData = Buffer.from([0x00, 0x00, 0x7F])
  const validManufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0A, 0x8F, 0x50, 0x00])
  const invalidServiceData = Buffer.from([0x00, 0x00])
  const invalidManufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0A])

  it('should return null for incorrect serviceData length', async () => {
    const result = await WoIOSensorTH.parseServiceData(invalidServiceData, validManufacturerData, undefined)
    expect(result).toBeNull()
  })

  it('should return null for incorrect manufacturerData length', async () => {
    const result = await WoIOSensorTH.parseServiceData(validServiceData, invalidManufacturerData, undefined)
    expect(result).toBeNull()
  })

  it('should return correct parsed data for valid inputs', async () => {
    const result = await WoIOSensorTH.parseServiceData(validServiceData, validManufacturerData, undefined)
    expect(result).toEqual({
      model: 'OutdoorMeter',
      modelName: 'OutdoorMeter',
      modelFriendlyName: 'OutdoorMeter',
      temperature: {
        c: 1.5,
        f: 34.7,
      },
      fahrenheit: true,
      humidity: 80,
      battery: 127,
    })
  })

  it('should log messages for incorrect data lengths', async () => {
    const onlog = jest.fn()
    await WoIOSensorTH.parseServiceData(invalidServiceData, validManufacturerData, onlog)
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoIOSensorTH] Service Data Buffer length 2 !== 3!')
    await WoIOSensorTH.parseServiceData(validServiceData, invalidManufacturerData, onlog)
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoIOSensorTH] Manufacturer Data Buffer length 11 !== 14!')
  })
})
