import type { } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoContact } from '../device/wocontact.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woContact', () => {
  const emitLog = vi.fn()

  it('should parse valid service data correctly', async () => {
    const serviceData = Buffer.from([0b11000000, 0b01111111, 0b00000110, 0, 0, 0, 0, 0, 0b00001111])
    const result = await WoContact.parseServiceData(serviceData, emitLog)

    expect(result).toEqual({
      model: SwitchBotBLEModel.ContactSensor,
      modelName: SwitchBotBLEModelName.ContactSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor,
      movement: true,
      tested: true,
      battery: 127,
      contact_open: true,
      contact_timeout: true,
      lightLevel: 'dark',
      button_count: 15,
      doorState: 'open',
    })
  })

  it('should return null for invalid service data length', async () => {
    const serviceData = Buffer.from([0b11000000, 0b01111111])
    const result = await WoContact.parseServiceData(serviceData, emitLog)

    expect(result).toBeNull()
    expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoContact] Buffer length 2 !== 9!')
  })

  it('should parse service data with different hall state correctly', async () => {
    const serviceData = Buffer.from([0b01000000, 0b01111111, 0b00000000, 0, 0, 0, 0, 0, 0b00000001])
    const result = await WoContact.parseServiceData(serviceData, emitLog)

    expect(result).toEqual({
      model: SwitchBotBLEModel.ContactSensor,
      modelName: SwitchBotBLEModelName.ContactSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor,
      movement: true,
      tested: false,
      battery: 127,
      contact_open: false,
      contact_timeout: false,
      lightLevel: 'dark',
      button_count: 1,
      doorState: 'close',
    })
  })

  it('should parse service data with bright light level correctly', async () => {
    const serviceData = Buffer.from([0b01000000, 0b01111111, 0b00000001, 0, 0, 0, 0, 0, 0b00000001])
    const result = await WoContact.parseServiceData(serviceData, emitLog)

    expect(result).toEqual({
      model: SwitchBotBLEModel.ContactSensor,
      modelName: SwitchBotBLEModelName.ContactSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor,
      movement: true,
      tested: false,
      battery: 127,
      contact_open: false,
      contact_timeout: false,
      lightLevel: 'bright',
      button_count: 1,
      doorState: 'close',
    })
  })
})
