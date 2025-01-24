import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoPlugMiniUS } from '../device/woplugmini.js'
import { SwitchBotBLEModel } from '../types/types.js'

describe('woPlugMini', () => {
  let emitLog: ReturnType<typeof vi.fn>

  beforeEach(() => {
    emitLog = vi.fn()
  })

  describe('parseServiceData_US', () => {
    it('should parse valid service data for US model', async () => {
      const manufacturerData = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0x80, 0, 0, 0, 0])
      const result = await WoPlugMiniUS.parseServiceData(manufacturerData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.PlugMiniUS,
        modelName: 'PlugMini',
        modelFriendlyName: 'PlugMini',
        state: 'on',
        delay: false,
        timer: false,
        syncUtcTime: false,
        wifiRssi: 0,
        overload: false,
        currentPower: 0,
      })
    })

    it('should return null for invalid service data length', async () => {
      const manufacturerData = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      const result = await WoPlugMiniUS.parseServiceData(manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoPlugMini] Buffer length 10 should be 14')
    })
  })

  describe('operatePlug', () => {
    let woPlugMini: WoPlugMiniUS
    let commandStub: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      woPlugMini = new WoPlugMiniUS(peripheral, emitLog as any)
      commandStub = vi.fn()
      woPlugMini.command = commandStub
    })

    it('should return true when the plug is turned on', async () => {
      commandStub.mockResolvedValue([0x57, 0x80])
      const result = await woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])
      expect(result).toBe(true)
    })

    it('should return false when the plug is turned off', async () => {
      commandStub.mockResolvedValue([0x57, 0x00])
      const result = await woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])
      expect(result).toBe(false)
    })

    it('should throw an error for invalid response length', async () => {
      commandStub.mockResolvedValue([0x57])
      await expect(woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])).rejects.toThrow('Expecting a 2-byte response, got instead: 0x57')
    })

    it('should throw an error for invalid response code', async () => {
      commandStub.mockResolvedValue([0x57, 0x01])
      await expect(woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])).rejects.toThrow('The device returned an error: 0x5701')
    })
  })

  describe('state operations', () => {
    let woPlugMini: WoPlugMiniUS
    let setStateStub: ReturnType<typeof vi.fn>

    beforeEach(() => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      woPlugMini = new WoPlugMiniUS(peripheral, emitLog as any)
      setStateStub = vi.fn()
      ;(woPlugMini as any).setState = setStateStub
    })

    it('should turn on the plug', async () => {
      setStateStub.mockResolvedValue(true)
      const result = await woPlugMini.turnOn()
      expect(result).toBe(true)
      expect(setStateStub).toHaveBeenCalledWith([0x01, 0x80])
    })

    it('should turn off the plug', async () => {
      setStateStub.mockResolvedValue(false)
      const result = await woPlugMini.turnOff()
      expect(result).toBe(false)
      expect(setStateStub).toHaveBeenCalledWith([0x01, 0x00])
    })

    it('should toggle the plug state', async () => {
      setStateStub.mockResolvedValue(true)
      const result = await woPlugMini.toggle()
      expect(result).toBe(true)
      expect(setStateStub).toHaveBeenCalledWith([0x02, 0x80])
    })
  })
})
