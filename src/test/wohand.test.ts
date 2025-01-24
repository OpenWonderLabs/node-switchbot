import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoHand } from '../device/wohand.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woHand', () => {
  const emitLog = vi.fn()

  describe('parseServiceData', () => {
    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0x00, 0x80, 0x64]) // Example buffer
      const result = await WoHand.parseServiceData(serviceData, emitLog)

      expect(result).toEqual({
        model: SwitchBotBLEModel.Bot,
        modelName: SwitchBotBLEModelName.Bot,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Bot,
        mode: true,
        state: true,
        battery: 100,
      })
    })

    it('should return null for invalid buffer length', async () => {
      const serviceData = Buffer.from([0x00, 0x80]) // Invalid buffer length
      const result = await WoHand.parseServiceData(serviceData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceData] Buffer length 2 !== 3!')
    })
  })

  describe('operateBot', () => {
    let woHand: WoHand

    beforeEach(() => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      woHand = new WoHand(peripheral, emitLog as any)
      vi.spyOn(woHand, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]))
    })

    it('should send the correct command for press', async () => {
      await woHand.press()
      expect(woHand.command).toHaveBeenCalledWith(Buffer.from([0x57, 0x01, 0x00]))
    })

    it('should send the correct command for turnOn', async () => {
      await woHand.turnOn()
      expect(woHand.command).toHaveBeenCalledWith(Buffer.from([0x57, 0x01, 0x01]))
    })

    it('should send the correct command for turnOff', async () => {
      await woHand.turnOff()
      expect(woHand.command).toHaveBeenCalledWith(Buffer.from([0x57, 0x01, 0x02]))
    })

    it('should send the correct command for down', async () => {
      await woHand.down()
      expect(woHand.command).toHaveBeenCalledWith(Buffer.from([0x57, 0x01, 0x03]))
    })

    it('should send the correct command for up', async () => {
      await woHand.up()
      expect(woHand.command).toHaveBeenCalledWith(Buffer.from([0x57, 0x01, 0x04]))
    })
  })
})
