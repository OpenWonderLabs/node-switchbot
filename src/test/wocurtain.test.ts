import type * as noble from '@stoprocent/noble'

import type { } from '../types/bledevicestatus.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoCurtain } from '../device/wocurtain.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woCurtain', () => {
  const emitLog = vi.fn()

  describe('parseServiceData', () => {
    it('should return null if serviceData length is not 5 or 6', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04])
      const manufacturerData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D])
      const result = await WoCurtain.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoCurtain] Buffer length 4 !== 5 or 6!')
    })

    it('should parse valid serviceData and manufacturerData correctly', async () => {
      const serviceData = Buffer.from([0x63, 0x40, 0x50, 0x01, 0x02, 0x03])
      const manufacturerData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x64])
      const result = await WoCurtain.parseServiceData(serviceData, manufacturerData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.Curtain,
        modelName: SwitchBotBLEModelName.Curtain,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain,
        calibration: true,
        battery: 100,
        inMotion: false,
        position: 1,
        lightLevel: 0,
        deviceChain: 2,
      })
    })
  })

  describe('open', () => {
    it('should call runToPos with 0 and default mode', async () => {
      const peripheral = {} as unknown as noble.Peripheral
      const curtain = new WoCurtain(peripheral, emitLog as any)
      const runToPosSpy = vi.spyOn(curtain, 'runToPos').mockResolvedValue()
      await curtain.open()
      expect(runToPosSpy).toHaveBeenCalledWith(0, 0xFF)
    })
  })

  describe('close', () => {
    it('should call runToPos with 100 and default mode', async () => {
      const peripheral = {} as unknown as noble.Peripheral
      const curtain = new WoCurtain(peripheral, emitLog as any)
      const runToPosSpy = vi.spyOn(curtain, 'runToPos').mockResolvedValue()
      await curtain.close()
      expect(runToPosSpy).toHaveBeenCalledWith(100, 0xFF)
    })
  })

  describe('pause', () => {
    it('should call operateCurtain with correct bytes', async () => {
      const peripheral = {} as unknown as noble.Peripheral
      const curtain = new WoCurtain(peripheral, emitLog as any)
      const operateCurtainSpy = vi.spyOn(curtain, 'operateCurtain').mockResolvedValue()
      await curtain.pause()
      expect(operateCurtainSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
    })
  })

  describe('runToPos', () => {
    it('should call operateCurtain with correct bytes', async () => {
      const peripheral = {} as unknown as noble.Peripheral
      const curtain = new WoCurtain(peripheral, emitLog as any)
      const operateCurtainSpy = vi.spyOn(curtain, 'operateCurtain').mockResolvedValue()
      await curtain.runToPos(50, 0x01)
      expect(operateCurtainSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0x01, 50])
    })

    it('should throw TypeError if percent or mode is not a number', async () => {
      const peripheral = {} as unknown as noble.Peripheral
      const curtain = new WoCurtain(peripheral, emitLog as any)
      await expect(curtain.runToPos('50' as any, 0x01)).rejects.toThrow(TypeError)
      await expect(curtain.runToPos(50, '0x01' as any)).rejects.toThrow(TypeError)
    })
  })
})
