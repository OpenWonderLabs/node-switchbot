import type { relaySwitch1ServiceData } from '../types/bledevicestatus'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'
import { WoRelaySwitch1 } from './worelayswitch1.js'

describe('woRelaySwitch1', () => {
  describe('parseServiceData', () => {
    it('should return null if serviceData length is less than 8', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
      const manufacturerData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
      const emitLog = vi.fn()

      const result = await WoRelaySwitch1.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoRelaySwitch1Plus] Buffer length 7 < 8!')
    })

    it('should return null if manufacturerData length is null', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
      const manufacturerData = Buffer.alloc(0)
      const emitLog = vi.fn()

      const result = await WoRelaySwitch1.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoRelaySwitch1Plus] Buffer length 8 < 8!')
    })

    it('should return parsed service data if buffers are valid', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
      const manufacturerData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x87])
      const emitLog = vi.fn()

      const result = await WoRelaySwitch1.parseServiceData(serviceData, manufacturerData, emitLog)

      const expectedData: relaySwitch1ServiceData = {
        model: SwitchBotBLEModel.RelaySwitch1,
        modelName: SwitchBotBLEModelName.RelaySwitch1,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1,
        mode: true,
        state: true,
        sequence_number: 6,
      }

      expect(result).toEqual(expectedData)
      expect(emitLog).not.toHaveBeenCalled()
    })

    it('should return parsed service data with state false if state bit is not set', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
      const manufacturerData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
      const emitLog = vi.fn()

      const result = await WoRelaySwitch1.parseServiceData(serviceData, manufacturerData, emitLog)

      const expectedData: relaySwitch1ServiceData = {
        model: SwitchBotBLEModel.RelaySwitch1,
        modelName: SwitchBotBLEModelName.RelaySwitch1,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1,
        mode: true,
        state: false,
        sequence_number: 6,
      }

      expect(result).toEqual(expectedData)
      expect(emitLog).not.toHaveBeenCalled()
    })
  })
})
