import type * as Noble from '@stoprocent/noble'

import { Buffer } from 'node:buffer'

import { expect } from 'chai'

import { WoStrip } from './wostrip.js'

describe('woStrip', () => {
  describe('parseServiceData', () => {
    it('should return null if serviceData length is not 18', async () => {
      const serviceData = Buffer.alloc(10)
      const result = await WoStrip.parseServiceData(serviceData, () => { })
      return expect(result).to.be.null
    })

    it('should parse serviceData correctly', async () => {
      const serviceData = Buffer.from([0, 0, 0, 255, 255, 255, 0, 128, 8, 127, 254, 0, 0, 0, 0, 0, 0, 0])
      const result = await WoStrip.parseServiceData(serviceData, () => { })
      expect(result).to.deep.equal({
        model: 'StripLight',
        modelName: 'StripLight',
        modelFriendlyName: 'StripLight',
        power: true,
        state: true,
        brightness: 0,
        red: 255,
        green: 255,
        blue: 255,
        delay: 128,
        preset: 8,
        color_mode: 0,
        speed: 127,
        loop_index: 254,
      })
    })
  })

  describe('readState', () => {
    it('should return the state of the strip light', async () => {
      const peripheral = {} as Noble.Peripheral // Replace with actual peripheral object
      const noble = {} as typeof Noble // Replace with actual noble object
      const woStrip = new WoStrip(peripheral, noble)
      woStrip.operateStripLight = async () => { }
      const result = await woStrip.readState()
      return expect(result).to.be.true
    })
  })

  describe('turnOn', () => {
    it('should turn on the strip light', async () => {
      const peripheral = {} as Noble.Peripheral // Replace with actual peripheral object
      const noble = {} as typeof Noble // Replace with actual noble object
      const woStrip = new WoStrip(peripheral, noble)
      woStrip.setState = async () => { }
      const result = await woStrip.turnOn()
      return expect(result).to.be.true
    })
  })

  describe('turnOff', () => {
    it('should turn off the strip light', async () => {
      const peripheral = {} as Noble.Peripheral // Replace with actual peripheral object
      const noble = {} as typeof Noble // Replace with actual noble object
      const woStrip = new WoStrip(peripheral, noble)
      woStrip.setState = async () => { }
      const result = await woStrip.turnOff()
      return expect(result).to.be.true
    })
  })

  describe('setBrightness', () => {
    it('should set the brightness of the strip light', async () => {
      const peripheral = {} as Noble.Peripheral // Replace with actual peripheral object
      const noble = {} as typeof Noble // Replace with actual noble object
      const woStrip = new WoStrip(peripheral, noble)
      woStrip.setState = async () => { }
      const result = await woStrip.setBrightness(50)
      return expect(result).to.be.true
    })

    it('should throw an error if brightness is not a number', async () => {
      const peripheral = {} as Noble.Peripheral // Replace with actual peripheral object
      const noble = {} as typeof Noble // Replace with actual noble object
      const woStrip = new WoStrip(peripheral, noble)
      try {
        await woStrip.setBrightness('50' as any)
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).to.equal('The type of target brightness percentage is incorrect: string')
        } else {
          throw error
        }
      }
    })
  })

  describe('setRGB', () => {
    it('should set the RGB values of the strip light', async () => {
      const peripheral = {} as Noble.Peripheral // Replace with actual peripheral object
      const noble = {} as typeof Noble // Replace with actual noble object
      const woStrip = new WoStrip(peripheral, noble)
      woStrip.setState = async () => { }
      const result = await woStrip.setRGB(50, 255, 255, 255)
      return expect(result).to.be.true
    })

    it('should throw an error if any RGB value is not a number', async () => {
      const peripheral = {} as Noble.Peripheral // Replace with actual peripheral object
      const noble = {} as typeof Noble // Replace with actual noble object
      const woStrip = new WoStrip(peripheral, noble)
      try {
        await woStrip.setRGB(50, '255' as any, 255, 255)
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).to.equal('The type of target red is incorrect: string')
        } else {
          throw error
        }
      }
    })
  })
})
