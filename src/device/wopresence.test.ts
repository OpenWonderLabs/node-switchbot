import type { motionSensorServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoPresence } from '../device/wopresence.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woPresence', () => {
  describe('parseServiceData', () => {
    const emitLog = vi.fn()

    it('should return null if buffer length is not 6', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05])
      const result = await WoPresence.parseServiceData(serviceData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoPresence] Buffer length 5 !== 6!')
    })

    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0b10000000, 0b01111111, 0x00, 0x00, 0x00, 0b00101101])
      const expectedData: motionSensorServiceData = {
        model: SwitchBotBLEModel.MotionSensor,
        modelName: SwitchBotBLEModelName.MotionSensor,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor,
        tested: true,
        movement: false,
        battery: 127,
        led: 1,
        iot: 1,
        sense_distance: 3,
        lightLevel: 'unknown',
        is_light: true,
      }
      const result = await WoPresence.parseServiceData(serviceData, emitLog)
      expect(result).toEqual(expectedData)
    })

    it('should handle different light levels correctly', async () => {
      const serviceDataDark = Buffer.from([0b10000000, 0b01111111, 0x00, 0x00, 0x00, 0b00101100])
      const serviceDataBright = Buffer.from([0b10000000, 0b01111111, 0x00, 0x00, 0x00, 0b00101110])
      const expectedDataDark: motionSensorServiceData = {
        model: SwitchBotBLEModel.MotionSensor,
        modelName: SwitchBotBLEModelName.MotionSensor,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor,
        tested: true,
        movement: false,
        battery: 127,
        led: 1,
        iot: 1,
        sense_distance: 3,
        lightLevel: 'dark',
        is_light: false,
      }
      const expectedDataBright: motionSensorServiceData = {
        model: SwitchBotBLEModel.MotionSensor,
        modelName: SwitchBotBLEModelName.MotionSensor,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor,
        tested: true,
        movement: false,
        battery: 127,
        led: 1,
        iot: 1,
        sense_distance: 3,
        lightLevel: 'bright',
        is_light: true,
      }
      const resultDark = await WoPresence.parseServiceData(serviceDataDark, emitLog)
      const resultBright = await WoPresence.parseServiceData(serviceDataBright, emitLog)
      expect(resultDark).toEqual(expectedDataDark)
      expect(resultBright).toEqual(expectedDataBright)
    })
  })
})
