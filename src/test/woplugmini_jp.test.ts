import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import sinon from 'sinon'
import { describe, expect, it } from 'vitest'

import { WoPlugMiniJP } from '../device/woplugmini_jp.js'
import { SwitchBotBLEModel } from '../types/types.js'

describe('woPlugMini', () => {
  let emitLog: sinon.SinonSpy

  beforeEach(() => {
    emitLog = sinon.spy()
  })

  describe('parseServiceData', () => {
    it('should parse valid service data for JP model', async () => {
      const manufacturerData = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0x80, 0, 0, 0, 0])
      const result = await WoPlugMiniJP.parseServiceData(manufacturerData, emitLog)
      expect(result).toEqual({
        model: SwitchBotBLEModel.PlugMiniJP,
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
      const result = await WoPlugMiniJP.parseServiceData(manufacturerData, emitLog)
      expect(result).toBeNull()
      expect(emitLog.calledWith('error', '[parseServiceDataForWoPlugMini] Buffer length 10 should be 14')).toBe(true)
    })
  })

  describe('operatePlug', () => {
    let woPlugMini: WoPlugMiniJP
    let commandStub: sinon.SinonStub

    beforeEach(() => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      woPlugMini = new WoPlugMiniJP(peripheral, emitLog as any)
      commandStub = sinon.stub(woPlugMini, 'command')
    })

    it('should return true when the plug is turned on', async () => {
      commandStub.resolves([0x57, 0x80])
      const result = await woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])
      expect(result).toBe(true)
    })

    it('should return false when the plug is turned off', async () => {
      commandStub.resolves([0x57, 0x00])
      const result = await woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])
      expect(result).toBe(false)
    })

    it('should throw an error for invalid response length', async () => {
      commandStub.resolves([0x57])
      await expect(woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])).rejects.toThrow('Expecting a 2-byte response, got instead: 0x57')
    })

    it('should throw an error for invalid response code', async () => {
      commandStub.resolves([0x57, 0x01])
      await expect(woPlugMini.operatePlug([0x57, 0x0F, 0x51, 0x01])).rejects.toThrow('The device returned an error: 0x5701')
    })
  })

  describe('state operations', () => {
    let woPlugMini: WoPlugMiniJP
    let setStateStub: sinon.SinonStub

    beforeEach(() => {
      const peripheral = {} as unknown as NobleTypes['peripheral']
      woPlugMini = new WoPlugMiniJP(peripheral, emitLog as any)
      setStateStub = sinon.stub(woPlugMini as any, 'setState')
    })

    it('should turn on the plug', async () => {
      setStateStub.resolves(true)
      const result = await woPlugMini.turnOn()
      expect(result).toBe(true)
      expect(setStateStub.calledWith([0x01, 0x80])).toBe(true)
    })

    it('should turn off the plug', async () => {
      setStateStub.resolves(false)
      const result = await woPlugMini.turnOff()
      expect(result).toBe(false)
      expect(setStateStub.calledWith([0x01, 0x00])).toBe(true)
    })

    it('should toggle the plug state', async () => {
      setStateStub.resolves(true)
      const result = await woPlugMini.toggle()
      expect(result).toBe(true)
      expect(setStateStub.calledWith([0x02, 0x80])).toBe(true)
    })
  })
})
