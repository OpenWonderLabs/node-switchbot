import { Buffer } from 'node:buffer'

import { WoBlindTilt } from '../device/woblindtilt.js'

describe('woBlindTilt', () => {
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  it('should return null if manufacturerData length is not 5 or 6', async () => {
    const serviceData = Buffer.alloc(3)
    const manufacturerData = Buffer.alloc(4) // Invalid length
    const result = await WoBlindTilt.parseServiceData(serviceData, manufacturerData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoBlindTilt] Buffer length 4 !== 5 or 6!')
  })

  it('should parse valid serviceData and manufacturerData correctly', async () => {
    const serviceData = Buffer.from([0x00, 0x00, 0x80])
    const manufacturerData = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x7F])
    const result = await WoBlindTilt.parseServiceData(serviceData, manufacturerData, onlog)
    expect(result).toEqual({
      model: 'BlindTilt',
      modelName: 'BlindTilt',
      modelFriendlyName: 'BlindTilt',
      calibration: false,
      battery: 0,
      inMotion: true,
      tilt: 127,
      lightLevel: 0,
      sequenceNumber: 0,
    })
    expect(onlog).not.toHaveBeenCalled()
  })

  describe('operateBlindTilt', () => {
    let woBlindTilt: WoBlindTilt

    beforeEach(() => {
      const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
      woBlindTilt = new WoBlindTilt(peripheral as any, {} as any)
      jest.spyOn(woBlindTilt, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]))
    })

    it('open should call operateBlindTilt with correct bytes', async () => {
      const operateBlindTiltSpy = jest.spyOn(woBlindTilt as any, 'operateBlindTilt')
      await woBlindTilt.open()
      expect(operateBlindTiltSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x32])
    })

    it('closeUp should call operateBlindTilt with correct bytes', async () => {
      const operateBlindTiltSpy = jest.spyOn(woBlindTilt as any, 'operateBlindTilt')
      await woBlindTilt.closeUp()
      expect(operateBlindTiltSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x64])
    })

    it('closeDown should call operateBlindTilt with correct bytes', async () => {
      const operateBlindTiltSpy = jest.spyOn(woBlindTilt as any, 'operateBlindTilt')
      await woBlindTilt.closeDown()
      expect(operateBlindTiltSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x00])
    })

    it('close should call closeUp or closeDown based on position', async () => {
      jest.spyOn(woBlindTilt, 'getPosition').mockResolvedValue(60)
      const closeUpSpy = jest.spyOn(woBlindTilt, 'closeUp')
      const closeDownSpy = jest.spyOn(woBlindTilt, 'closeDown')
      await woBlindTilt.close()
      expect(closeUpSpy).toHaveBeenCalled()
      expect(closeDownSpy).not.toHaveBeenCalled()

      jest.spyOn(woBlindTilt, 'getPosition').mockResolvedValue(40)
      await woBlindTilt.close()
      expect(closeDownSpy).toHaveBeenCalled()
    })

    it('getPosition should return valid tilt position', async () => {
      jest.spyOn(woBlindTilt as any, '_getAdvValue').mockResolvedValue(50)
      const position = await woBlindTilt.getPosition()
      expect(position).toBe(50)
    })

    it('pause should call operateBlindTilt with correct bytes', async () => {
      const operateBlindTiltSpy = jest.spyOn(woBlindTilt as any, 'operateBlindTilt')
      await woBlindTilt.pause()
      expect(operateBlindTiltSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
    })

    it('runToPos should call operateBlindTilt with correct bytes', async () => {
      const operateBlindTiltSpy = jest.spyOn(woBlindTilt as any, 'operateBlindTilt')
      await woBlindTilt.runToPos(50, 1)
      expect(operateBlindTiltSpy).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x05, 1, 50])
    })

    it('operateBlindTilt should handle successful response', async () => {
      await expect((woBlindTilt as any).operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, 1, 50])).resolves.toBeUndefined()
    })

    it('operateBlindTilt should handle error response', async () => {
      jest.spyOn(woBlindTilt, 'command').mockResolvedValue(Buffer.from([0x00, 0x01, 0x00]))
      await expect((woBlindTilt as any).operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, 1, 50])).rejects.toThrow('The device returned an error: 0x000100')
    })

    it('operateBlindTilt should handle command rejection', async () => {
      jest.spyOn(woBlindTilt, 'command').mockRejectedValue(new Error('Command failed'))
      await expect((woBlindTilt as any).operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, 1, 50])).rejects.toThrow('Command failed')
    })
  })
})
