/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohand.test.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { WoHand } from '../device/wohand.js'

describe('woHand', () => {
  let onlog: jest.Mock

  beforeEach(() => {
    onlog = jest.fn()
  })

  it('should return null if serviceData length is not 3', async () => {
    const serviceData = Buffer.alloc(2) // Invalid length
    const result = await WoHand.parseServiceData(serviceData, onlog)
    expect(result).toBeNull()
    expect(onlog).toHaveBeenCalledWith('[parseServiceData] Buffer length 2 !== 3!')
  })

  it('should parse valid serviceData correctly', async () => {
    const serviceData = Buffer.from([0x00, 0x80, 0x7F]) // Example valid data
    const result = await WoHand.parseServiceData(serviceData, onlog)
    expect(result).toEqual({
      model: 'Bot',
      modelName: 'Bot',
      modelFriendlyName: 'Bot',
      mode: true,
      state: false,
      battery: 127,
    })
    expect(onlog).not.toHaveBeenCalled()
  })

  describe('operateBot', () => {
    let wohand: WoHand

    beforeEach(() => {
      const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
      wohand = new WoHand(peripheral as any, {} as any)
      jest.spyOn(wohand, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]))
    })

    it('press should call operateBot with correct bytes', async () => {
      const operateBotSpy = jest.spyOn(wohand as any, 'operateBot')
      await wohand.press()
      expect(operateBotSpy).toHaveBeenCalledWith([0x57, 0x01, 0x00])
    })

    it('turnOn should call operateBot with correct bytes', async () => {
      const operateBotSpy = jest.spyOn(wohand as any, 'operateBot')
      await wohand.turnOn()
      expect(operateBotSpy).toHaveBeenCalledWith([0x57, 0x01, 0x01])
    })

    it('turnOff should call operateBot with correct bytes', async () => {
      const operateBotSpy = jest.spyOn(wohand as any, 'operateBot')
      await wohand.turnOff()
      expect(operateBotSpy).toHaveBeenCalledWith([0x57, 0x01, 0x02])
    })

    it('down should call operateBot with correct bytes', async () => {
      const operateBotSpy = jest.spyOn(wohand as any, 'operateBot')
      await wohand.down()
      expect(operateBotSpy).toHaveBeenCalledWith([0x57, 0x01, 0x03])
    })

    it('up should call operateBot with correct bytes', async () => {
      const operateBotSpy = jest.spyOn(wohand as any, 'operateBot')
      await wohand.up()
      expect(operateBotSpy).toHaveBeenCalledWith([0x57, 0x01, 0x04])
    })

    it('operateBot should handle successful response', async () => {
      await expect((wohand as any).operateBot([0x57, 0x01, 0x00])).resolves.toBeUndefined()
    })

    it('operateBot should handle error response', async () => {
      jest.spyOn(wohand, 'command').mockResolvedValue(Buffer.from([0x02, 0x00, 0x00]))
      await expect((wohand as any).operateBot([0x57, 0x01, 0x00])).rejects.toThrow('The device returned an error: 0x020000')
    })

    it('operateBot should handle command rejection', async () => {
      jest.spyOn(wohand, 'command').mockRejectedValue(new Error('Command failed'))
      await expect((wohand as any).operateBot([0x57, 0x01, 0x00])).rejects.toThrow('Command failed')
    })
  })
})
