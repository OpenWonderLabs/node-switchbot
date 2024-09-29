import { Buffer } from 'node:buffer'

import { WoContact } from '../device/wocontact.js'

describe('woContact', () => {
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  it('should return null if serviceData length is not 9', async () => {
    const serviceData = Buffer.alloc(8) // Invalid length
    const result = await WoContact.parseServiceData(serviceData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoContact] Buffer length 8 !== 9!')
  })

  it('should parse valid serviceData correctly', async () => {
    const serviceData = Buffer.from([0x00, 0x80, 0x7F, 0x02, 0x00, 0x00, 0x00, 0x00, 0x0F]) // Example valid data
    const result = await WoContact.parseServiceData(serviceData, onlog)
    expect(result).toEqual({
      model: 'ContactSensor',
      modelName: 'ContactSensor',
      modelFriendlyName: 'ContactSensor',
      movement: true,
      tested: true,
      battery: 127,
      contact_open: true,
      contact_timeout: false,
      lightLevel: 'dark',
      button_count: 15,
      doorState: 'open',
    })
    expect(onlog).not.toHaveBeenCalled()
  })

  // Add more test cases as needed
})
