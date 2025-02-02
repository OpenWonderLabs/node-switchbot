import type { relaySwitch1PMServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'
import { WoRelaySwitch1PM } from './worelayswitch1pm.js'

describe('woRelaySwitch1PM', () => {
  const mockPeripheral = {} as NobleTypes['peripheral']
  const mockNoble = {} as NobleTypes['noble']
  const device = new WoRelaySwitch1PM(mockPeripheral, mockNoble)

  describe('parseServiceData', () => {
    it('should return null if serviceData length is less than 8', async () => {
      const serviceData = Buffer.alloc(7)
      const manufacturerData = Buffer.alloc(10)
      const emitLog = vi.fn()

      const result = await WoRelaySwitch1PM.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoRelaySwitch1PM] Buffer length 7 < 8!')
    })

    it('should return null if manufacturerData length is 0', async () => {
      const serviceData = Buffer.alloc(8)
      const manufacturerData = Buffer.alloc(0)
      const emitLog = vi.fn()

      const result = await WoRelaySwitch1PM.parseServiceData(serviceData, manufacturerData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoRelaySwitch1PM] Buffer length 8 < 8!')
    })

    it('should return parsed service data if valid', async () => {
      const serviceData = Buffer.alloc(8)
      const manufacturerData = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0b10000000, 0, 0, 0x01, 0x02])
      const emitLog = vi.fn()

      const result = await WoRelaySwitch1PM.parseServiceData(serviceData, manufacturerData, emitLog)

      const expectedData: relaySwitch1PMServiceData = {
        model: SwitchBotBLEModel.RelaySwitch1PM,
        modelName: SwitchBotBLEModelName.RelaySwitch1PM,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1PM,
        mode: true,
        state: true,
        sequence_number: 0,
        power: 25.8,
        voltage: 0,
        current: 0,
      }

      expect(result).toEqual(expectedData)
    })
  })

  describe('sendCommand', () => {
    it('should throw an error if the response buffer is invalid', async () => {
      const reqBuf = Buffer.from([0x57, 0x01, 0x01])
      const resBuf = Buffer.from([0x00])
      vi.spyOn(device, 'command').mockResolvedValue(resBuf)

      await expect((device as any).sendCommand(reqBuf)).rejects.toThrow('The device returned an error: 0x00')
    })

    it('should not throw an error if the response buffer is valid', async () => {
      const reqBuf = Buffer.from([0x57, 0x01, 0x01])
      const resBuf = Buffer.from([0x01, 0x00, 0x00])
      vi.spyOn(device, 'command').mockResolvedValue(resBuf)

      await expect((device as any).sendCommand(reqBuf)).resolves.not.toThrow()
    })
  })

  describe('turnOn', () => {
    it('should send the correct command to turn on the device', async () => {
      const sendCommandSpy = vi.spyOn(device as any, 'sendCommand').mockResolvedValue(undefined)

      await device.turnOn()

      expect(sendCommandSpy).toHaveBeenCalledWith(Buffer.from([0x57, 0x01, 0x01]))
    })
  })

  describe('turnOff', () => {
    it('should send the correct command to turn off the device', async () => {
      const sendCommandSpy = vi.spyOn(device as any, 'sendCommand').mockResolvedValue(undefined)

      await device.turnOff()

      expect(sendCommandSpy).toHaveBeenCalledWith(Buffer.from([0x57, 0x01, 0x02]))
    })
  })
})
