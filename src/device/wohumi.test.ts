import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'

// wohumi.test.ts
import { WoHumi } from './wohumi.js'

jest.mock('../device.js', () => {
  return {
    SwitchbotDevice: jest.fn().mockImplementation(() => {
      return {
        command: jest.fn(),
      }
    }),
  }
})

describe('woHumi', () => {
  let wohumi: WoHumi

  beforeEach(() => {
    const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
    wohumi = new WoHumi(peripheral as Noble.Peripheral, Noble)
  })

  it('press should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi')
    await wohumi.press()
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x00])
  })

  it('turnOn should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi')
    await wohumi.turnOn()
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x01])
  })

  it('turnOff should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi')
    await wohumi.turnOff()
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x02])
  })

  it('down should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi')
    await wohumi.down()
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x03])
  })

  it('up should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi')
    await wohumi.up()
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x04])
  })

  it('operateHumi should handle successful response', async () => {
    const mockCommand = wohumi.command as jest.Mock
    mockCommand.mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]))

    await expect(wohumi.operateHumi([0x57, 0x01, 0x00])).resolves.toBeUndefined()
  })

  it('operateHumi should handle error response', async () => {
    const mockCommand = wohumi.command as jest.Mock
    mockCommand.mockResolvedValue(Buffer.from([0x02, 0x00, 0x00]))

    await expect(wohumi.operateHumi([0x57, 0x01, 0x00])).rejects.toThrow('The device returned an error: 0x020000')
  })

  it('operateHumi should handle command rejection', async () => {
    const mockCommand = wohumi.command as jest.Mock
    mockCommand.mockRejectedValue(new Error('Command failed'))

    await expect(wohumi.operateHumi([0x57, 0x01, 0x00])).rejects.toThrow('Command failed')
  })
})
