import type { } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoBlindTilt } from '../device/woblindtilt.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

describe('woBlindTilt', () => {
  const emitLog = vi.fn()

  it('should parse valid service and manufacturer data correctly', async () => {
    const serviceData = Buffer.from([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x32])
    const manufacturerData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])

    const result = await WoBlindTilt.parseServiceData(serviceData, manufacturerData, emitLog, false)

    expect(result).toEqual({
      model: SwitchBotBLEModel.BlindTilt,
      modelName: SwitchBotBLEModelName.BlindTilt,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.BlindTilt,
      calibration: false,
      battery: 69,
      inMotion: false,
      tilt: 7,
      lightLevel: 0,
      sequenceNumber: 7,
    })
  })

  it('should return null for invalid manufacturer data length', async () => {
    const serviceData = Buffer.from([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x32])
    const manufacturerData = Buffer.from([0x01, 0x02, 0x03])

    const result = await WoBlindTilt.parseServiceData(serviceData, manufacturerData, emitLog, false)

    expect(result).toBeNull()
    expect(emitLog).toHaveBeenCalledWith('error', '[parseServiceDataForWoBlindTilt] Buffer length 3 !== 5 or 6!')
  })

  it('should open the blind tilt', async () => {
    const peripheral = {} as unknown as NobleTypes['peripheral']
    const device = new WoBlindTilt(peripheral, emitLog as any)
    vi.spyOn(device as any, 'operateBlindTilt').mockResolvedValue(undefined)

    await device.open()

    expect(device.operateBlindTilt).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x32])
  })

  it('should close the blind tilt up', async () => {
    const peripheral = {} as unknown as NobleTypes['peripheral']
    const device = new WoBlindTilt(peripheral, emitLog as any)
    vi.spyOn(device as any, 'operateBlindTilt').mockResolvedValue(undefined)

    await device.closeUp()

    expect(device.operateBlindTilt).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x64])
  })

  it('should close the blind tilt down', async () => {
    const peripheral = {} as unknown as NobleTypes['peripheral']
    const device = new WoBlindTilt(peripheral, emitLog as any)
    vi.spyOn(device as any, 'operateBlindTilt').mockResolvedValue(undefined)

    await device.closeDown()

    expect(device.operateBlindTilt).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x00])
  })

  it('should pause the blind tilt', async () => {
    const peripheral = {} as unknown as NobleTypes['peripheral']
    const device = new WoBlindTilt(peripheral, emitLog as any)
    vi.spyOn(device as any, 'operateBlindTilt').mockResolvedValue(undefined)

    await device.pause()

    expect(device.operateBlindTilt).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
  })

  it('should run the blind tilt to a specified position', async () => {
    const peripheral = {} as unknown as NobleTypes['peripheral']
    const device = new WoBlindTilt(peripheral, emitLog as any)
    vi.spyOn(device, 'operateBlindTilt').mockResolvedValue(undefined)

    await device.runToPos(50, 1)

    expect(device.operateBlindTilt).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0x01, 50])
  })

  it('should throw an error for invalid position percentage', async () => {
    const peripheral = {} as unknown as NobleTypes['peripheral']
    const device = new WoBlindTilt(peripheral, emitLog as any)

    await expect(device.runToPos(150, 1)).rejects.toThrow(RangeError)
  })

  it('should throw an error for invalid mode', async () => {
    const peripheral = {} as unknown as NobleTypes['peripheral']
    const device = new WoBlindTilt(peripheral, emitLog as any)

    await expect(device.runToPos(50, 2)).rejects.toThrow(RangeError)
  })
})
