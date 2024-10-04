import type { stripLightServiceData } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import * as noble from '@stoprocent/noble'
import { describe, expect, it, vi } from 'vitest'

import { WoStrip } from '../device/wostrip.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woStrip', () => {
  describe('parseServiceData', () => {
    it('should return null if buffer length is not 18', async () => {
      const serviceData = Buffer.alloc(10)
      const emitLog = vi.fn()
      const result = await WoStrip.parseServiceData(serviceData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoStrip] Buffer length 10 !== 18!')
    })

    it('should parse valid service data correctly', async () => {
      const serviceData = Buffer.from([0, 0, 0, 255, 128, 64, 0, 129, 136, 127, 254, 0, 0, 0, 0, 0, 0, 0])
      const emitLog = vi.fn()
      const result = await WoStrip.parseServiceData(serviceData, emitLog)
      const expected: stripLightServiceData = {
        model: SwitchBotBLEModel.StripLight,
        modelName: SwitchBotBLEModelName.StripLight,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.StripLight,
        power: true,
        state: true,
        brightness: 1,
        red: 255,
        green: 128,
        blue: 64,
        delay: 128,
        preset: 8,
        color_mode: 0,
        speed: 127,
        loop_index: 254,
      }
      expect(result).toEqual(expected)
    })
  })

  describe('setState', () => {
    it('should call operateStripLight with correct byte array', async () => {
      const peripheral = {} as unknown as noble.Peripheral // Mock or provide a valid Noble.Peripheral object
      const device = new WoStrip(peripheral, noble)
      const operateStripLightSpy = vi.spyOn(device, 'operateStripLight').mockResolvedValue(true)
      const reqByteArray = [0x01, 0x01]
      const result = await device.setState(reqByteArray)
      expect(operateStripLightSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x49, 0x01, ...reqByteArray])
      expect(result).toBe(true)
    })
  })

  describe('turnOn', () => {
    it('should call setState with correct byte array', async () => {
      const peripheral = {} as unknown as noble.Peripheral // Mock or provide a valid Noble.Peripheral object
      const device = new WoStrip(peripheral, noble)
      const setStateSpy = vi.spyOn(device, 'setState').mockResolvedValue(true)
      const result = await device.turnOn()
      expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x01])
      expect(result).toBe(true)
    })
  })

  describe('turnOff', () => {
    it('should call setState with correct byte array', async () => {
      const peripheral = {} as unknown as noble.Peripheral // Mock or provide a valid Noble.Peripheral object
      const device = new WoStrip(peripheral, noble)
      const setStateSpy = vi.spyOn(device, 'setState').mockResolvedValue(true)
      const result = await device.turnOff()
      expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x02])
      expect(result).toBe(true)
    })
  })

  describe('setBrightness', () => {
    it('should throw error for invalid brightness value', async () => {
      const peripheral = {} as unknown as noble.Peripheral // Mock or provide a valid Noble.Peripheral object
      const device = new WoStrip(peripheral, noble)
      await expect(device.setBrightness(-1)).rejects.toThrow(TypeError)
      await expect(device.setBrightness(101)).rejects.toThrow(TypeError)
    })

    it('should call setState with correct byte array', async () => {
      const peripheral = {} as unknown as noble.Peripheral // Mock or provide a valid Noble.Peripheral object
      const device = new WoStrip(peripheral, noble)
      const setStateSpy = vi.spyOn(device, 'setState').mockResolvedValue(true)
      const result = await device.setBrightness(50)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x14, 50])
      expect(result).toBe(true)
    })
  })

  describe('setRGB', () => {
    it('should throw error for invalid RGB values', async () => {
      const peripheral = {} as unknown as noble.Peripheral // Mock or provide a valid Noble.Peripheral object
      const device = new WoStrip(peripheral, noble)
      await expect(device.setRGB(50, -1, 255, 255)).rejects.toThrow(TypeError)
      await expect(device.setRGB(50, 255, 256, 255)).rejects.toThrow(TypeError)
    })

    it('should call setState with correct byte array', async () => {
      const peripheral = {} as unknown as noble.Peripheral // Mock or provide a valid Noble.Peripheral object
      const device = new WoStrip(peripheral, noble)
      const setStateSpy = vi.spyOn(device, 'setState').mockResolvedValue(true)
      const result = await device.setRGB(50, 255, 128, 64)
      expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x12, 50, 255, 128, 64])
      expect(result).toBe(true)
    })
  })
})
