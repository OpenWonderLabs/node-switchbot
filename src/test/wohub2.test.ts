/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohub2.test.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { WoHub2 } from '../device/wohub2.js'

describe('woHub2', () => {
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  it('should return null if manufacturerData length is not 16', async () => {
    const manufacturerData = Buffer.alloc(15) // Invalid length
    const result = await WoHub2.parseServiceData(manufacturerData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoHub2] Buffer length 15 !== 16!')
  })

  it('should parse valid manufacturerData correctly', async () => {
    const manufacturerData = Buffer.from([
      0x01,
      0x82,
      0x7F,
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
    ]) // Example valid data
    const result = await WoHub2.parseServiceData(manufacturerData, onlog)
    expect(result).toEqual({
      model: 'Hub2',
      modelName: 'Hub2',
      modelFriendlyName: 'Hub2',
      celsius: 2.1,
      fahrenheit: 35.8,
      fahrenheit_mode: true,
      humidity: 127,
      lightLevel: 31,
    })
    expect(onlog).not.toHaveBeenCalled()
  })

  // Add more test cases as needed
})
