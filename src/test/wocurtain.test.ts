/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wocurtain.test.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { WoCurtain } from '../device/wocurtain.js'

describe('woCurtain', () => {
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  it('should return null if serviceData length is not 5 or 6', async () => {
    const serviceData = Buffer.alloc(4) // Invalid length
    const manufacturerData = Buffer.alloc(13)
    const result = await WoCurtain.parseServiceData(serviceData, manufacturerData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoCurtain] Buffer length 4 !== 5 or 6!')
  })

  it('should parse valid serviceData and manufacturerData correctly', async () => {
    const serviceData = Buffer.from([0x63, 0x40, 0x7F, 0x00, 0x00, 0x00]) // Example valid data
    const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x7F])
    const result = await WoCurtain.parseServiceData(serviceData, manufacturerData, onlog)
    expect(result).toEqual({
      model: 'c',
      modelName: 'Curtain',
      modelFriendlyName: 'Curtain',
      calibration: true,
      battery: 127,
      inMotion: false,
      position: 0,
      lightLevel: 0,
      deviceChain: 0,
    })
    expect(onlog).not.toHaveBeenCalled()
  })

  describe('operateCurtain', () => {
    let wocurtain: WoCurtain

    beforeEach(() => {
      const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
      wocurtain = new WoCurtain(peripheral as any, {} as any)
      jest.spyOn(wocurtain, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]))
    })

    it('open should call runToPos with correct arguments', async () => {
      const runToPosSpy = jest.spyOn(wocurtain, 'runToPos')
      await wocurtain.open()
      expect(runToPosSpy).toHaveBeenCalledWith(0, 0xFF)
    })

    it('close should call runToPos with correct arguments', async () => {
      const runToPosSpy = jest.spyOn(wocurtain, 'runToPos')
      await wocurtain.close()
      expect(runToPosSpy).toHaveBeenCalledWith(100, 0xFF)
    })

    it('pause should call operateCurtain with correct bytes', async () => {
      const operateCurtainSpy = jest.spyOn(wocurtain as any, 'operateCurtain')
      await wocurtain.pause()
      expect(operateCurtainSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
    })

    it('runToPos should call operateCurtain with correct bytes', async () => {
      const operateCurtainSpy = jest.spyOn(wocurtain as any, 'operateCurtain')
      await wocurtain.runToPos(50)
      expect(operateCurtainSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 50])
    })

    it('operateCurtain should handle successful response', async () => {
      await expect((wocurtain as any).operateCurtain([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 50])).resolves.toBeUndefined()
    })

    it('operateCurtain should handle error response', async () => {
      jest.spyOn(wocurtain, 'command').mockResolvedValue(Buffer.from([0x02, 0x00, 0x00]))
      await expect((wocurtain as any).operateCurtain([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 50])).rejects.toThrow('The device returned an error: 0x020000')
    })

    it('operateCurtain should handle command rejection', async () => {
      jest.spyOn(wocurtain, 'command').mockRejectedValue(new Error('Command failed'))
      await expect((wocurtain as any).operateCurtain([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 50])).rejects.toThrow('Command failed')
    })
  })
})
