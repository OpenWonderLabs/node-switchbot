import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoHumi } from '../device/wohumi.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woHumi', () => {
  const emitLog = vi.fn()

  describe('parseServiceData', () => {
    it('should return parsed data for valid service data', async () => {
      const serviceData = Buffer.from([0x00, 0x80, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00])
      const result = await WoHumi.parseServiceData(serviceData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.Humidifier,
        modelName: SwitchBotBLEModelName.Humidifier,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier,
        onState: true,
        autoMode: true,
        percentage: 0,
        humidity: 0,
      })
    })

    it('should return null for invalid service data length', async () => {
      const serviceData = Buffer.from([0x00, 0x80, 0x00])
      const result = await WoHumi.parseServiceData(serviceData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoHumi] Buffer length 3 !== 8!')
    })
  })

  describe('operateHumi', () => {
    it('should throw an error if the device returns an error', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const wohumi = new WoHumi(peripheral, emitLog as any)
      vi.spyOn(wohumi, 'command').mockResolvedValue(Buffer.from([0x00, 0x00, 0x00]))
      await expect(wohumi.operateHumi([0x57, 0x01, 0x00])).rejects.toThrow('The device returned an error: 0x000000')
    })
  })

  describe('press', () => {
    it('should call operateHumi with correct bytes', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const wohumi = new WoHumi(peripheral, emitLog as any)
      const operateHumiSpy = vi.spyOn(wohumi, 'operateHumi').mockResolvedValue()
      await wohumi.press()
      expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x00])
    })
  })

  describe('turnOn', () => {
    it('should call operateHumi with correct bytes', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const wohumi = new WoHumi(peripheral, emitLog as any)
      const operateHumiSpy = vi.spyOn(wohumi, 'operateHumi').mockResolvedValue()
      await wohumi.turnOn()
      expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x01])
    })
  })

  describe('turnOff', () => {
    it('should call operateHumi with correct bytes', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const wohumi = new WoHumi(peripheral, emitLog as any)
      const operateHumiSpy = vi.spyOn(wohumi, 'operateHumi').mockResolvedValue()
      await wohumi.turnOff()
      expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x02])
    })
  })

  describe('down', () => {
    it('should call operateHumi with correct bytes', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const wohumi = new WoHumi(peripheral, emitLog as any)
      const operateHumiSpy = vi.spyOn(wohumi, 'operateHumi').mockResolvedValue()
      await wohumi.down()
      expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x03])
    })
  })

  describe('up', () => {
    it('should call operateHumi with correct bytes', async () => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      const wohumi = new WoHumi(peripheral, emitLog as any)
      const operateHumiSpy = vi.spyOn(wohumi, 'operateHumi').mockResolvedValue()
      await wohumi.up()
      expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x04])
    })
  })
})
