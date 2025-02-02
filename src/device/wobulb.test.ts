import type { Mock } from 'vitest'

import type { } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoBulb } from '../device/wobulb.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woBulb', () => {
  const emitLog = vi.fn()

  describe('parseServiceData', () => {
    it('should return null if serviceData length is not 18', async () => {
      const serviceData = Buffer.alloc(10)
      const manufacturerData = Buffer.alloc(13)
      const result = await WoBulb.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoBulb] Buffer length 10 !== 18!')
    })

    it('should return null if manufacturerData length is not 13', async () => {
      const serviceData = Buffer.alloc(18)
      const manufacturerData = Buffer.alloc(10)
      const result = await WoBulb.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoBulb] Buffer length 10 !== 13!')
    })

    it('should parse valid serviceData and manufacturerData', async () => {
      const serviceData = Buffer.alloc(18)
      const manufacturerData = Buffer.from([0, 1, 0, 3, 4, 5, 6, 7, 8, 9, 10, 0, 0])
      const result = await WoBulb.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.ColorBulb,
        modelName: SwitchBotBLEModelName.ColorBulb,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.ColorBulb,
        power: 1,
        red: 3,
        green: 4,
        blue: 5,
        color_temperature: 6,
        state: true,
        brightness: 7,
        delay: true,
        preset: false,
        color_mode: 0,
        speed: 9,
        loop_index: 10,
      })
    })
  })

  describe('woBulb operations', () => {
    let bulb: WoBulb
    let commandMock: Mock<(...args: any[]) => any>

    beforeEach(() => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      bulb = new WoBulb(peripheral, emitLog as any)
      commandMock = vi.fn()
      bulb.command = commandMock
    })

    it('should turn on the bulb', async () => {
      commandMock.mockResolvedValue(Buffer.from([0x57, 0x80]))
      const result = await bulb.turnOn()
      expect(result).toBe(true)
      expect(commandMock).toHaveBeenCalledWith(Buffer.from([0x57, 0x0F, 0x47, 0x01, 0x01, 0x01]))
    })

    it('should turn off the bulb', async () => {
      commandMock.mockResolvedValue(Buffer.from([0x57, 0x80]))
      const result = await bulb.turnOff()
      expect(result).toBe(true)
      expect(commandMock).toHaveBeenCalledWith(Buffer.from([0x57, 0x0F, 0x47, 0x01, 0x01, 0x02]))
    })

    it('should set brightness', async () => {
      commandMock.mockResolvedValue(Buffer.from([0x57, 0x80]))
      const result = await bulb.setBrightness(50)
      expect(result).toBe(true)
      expect(commandMock).toHaveBeenCalledWith(Buffer.from([0x57, 0x0F, 0x47, 0x01, 0x02, 0x14, 50]))
    })

    it('should throw error for invalid brightness', async () => {
      await expect(bulb.setBrightness(150)).rejects.toThrow(RangeError)
    })

    it('should set color temperature', async () => {
      commandMock.mockResolvedValue(Buffer.from([0x57, 0x80]))
      const result = await bulb.setColorTemperature(50)
      expect(result).toBe(true)
      expect(commandMock).toHaveBeenCalledWith(Buffer.from([0x57, 0x0F, 0x47, 0x01, 0x02, 0x17, 50]))
    })

    it('should throw error for invalid color temperature', async () => {
      await expect(bulb.setColorTemperature(150)).rejects.toThrow(RangeError)
    })

    it('should set RGB color', async () => {
      commandMock.mockResolvedValue(Buffer.from([0x57, 0x80]))
      const result = await bulb.setRGB(50, 100, 150, 200)
      expect(result).toBe(true)
      expect(commandMock).toHaveBeenCalledWith(Buffer.from([0x57, 0x0F, 0x47, 0x01, 0x02, 0x12, 50, 100, 150, 200]))
    })

    it('should throw error for invalid RGB values', async () => {
      await expect(bulb.setRGB(50, 300, 150, 200)).rejects.toThrow(RangeError)
    })
  })
})
