import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'
/* eslint-disable no-console */
// wohand.test.ts
import { WoHand } from '../device/wohand.js'

describe('woHand', () => {
  describe('parseServiceData', () => {
    it('should return null if serviceData length is not 3', async () => {
      const serviceData = Buffer.from([0x01, 0x02])
      const result = await WoHand.parseServiceData(serviceData, console.log)
      expect(result).toBeNull()
    })

    it('should parse service data correctly', async () => {
      const serviceData = Buffer.from([0x00, 0b11000000, 0b01111111])
      const result = await WoHand.parseServiceData(serviceData, console.log)
      expect(result).toEqual({
        model: SwitchBotBLEModel.Bot,
        modelName: SwitchBotBLEModelName.Bot,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Bot,
        mode: true,
        state: false,
        battery: 127,
      })
    })
  })

  describe('woHand operations', () => {
    let wohand: WoHand

    beforeEach(() => {
      const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
      wohand = new WoHand(peripheral as Noble.Peripheral, Noble)
      jest.spyOn(wohand, 'command').mockImplementation(async () => {
        return Buffer.from([0x01, 0x00, 0x00])
      })
    })

    it('should press the button', async () => {
      await expect(wohand.press()).resolves.toBeUndefined()
    })

    it('should turn on the device', async () => {
      await expect(wohand.turnOn()).resolves.toBeUndefined()
    })

    it('should turn off the device', async () => {
      await expect(wohand.turnOff()).resolves.toBeUndefined()
    })

    it('should move the device down', async () => {
      await expect(wohand.down()).resolves.toBeUndefined()
    })

    it('should move the device up', async () => {
      await expect(wohand.up()).resolves.toBeUndefined()
    })

    it('should handle operateBot correctly', async () => {
      await expect(wohand.operateBot([0x57, 0x01, 0x00])).resolves.toBeUndefined()
    })

    it('should throw an error if the device returns an error', async () => {
      jest.spyOn(wohand, 'command').mockImplementation(async () => {
        return Buffer.from([0x00, 0x00, 0x00])
      })
      await expect(wohand.operateBot([0x57, 0x01, 0x00])).rejects.toThrow('The device returned an error: 0x000000')
    })
  })
})
