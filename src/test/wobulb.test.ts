import { Buffer } from 'node:buffer'

import * as Noble from '@stoprocent/noble'
/* eslint-disable no-console */
import { beforeEach, describe, it } from 'vitest'

import { WoBulb } from '../device/wobulb.js'

describe('woBulb', () => {
  let bulb: WoBulb

  beforeEach(() => {
    const peripheral = {} // Replace with the actual peripheral object (e.g. from Noble)
    bulb = new WoBulb(peripheral as Noble.Peripheral, Noble)
  })

  it('should parse service data correctly', () => {
    const manufacturerData = Buffer.from([0x57, 0x0F, 0x47, 0x01, 0x64, 0x32, 0x19, 0x80, 0x08, 0x7F, 0xFE, 0x00, 0x00])
    const result = WoBulb.parseServiceData(manufacturerData, manufacturerData, console.log)
    expect(result).toHaveBeenCalledWith({
      model: 'ColorBulb',
      power: 0x47,
      red: 0x01,
      green: 0x64,
      blue: 0x32,
      color_temperature: 0x19,
      state: true,
      brightness: 0x80,
      delay: 0x80,
      preset: 0x08,
      color_mode: 0x08,
      speed: 0x7F,
      loop_index: 0xFE,
    })
  })

  it('should turn on the bulb', async () => {
    const result = await bulb.turnOn()

    expect(result).toHaveBeenCalledWith(true)
  })

  it('should turn off the bulb', async () => {
    const result = await bulb.turnOff()

    expect(result).toHaveBeenCalledWith(false)
  })

  it('should set brightness correctly', async () => {
    const result = await bulb.setBrightness(50)

    expect(result).toHaveBeenCalledWith(50)
  })

  it('should set color temperature correctly', async () => {
    const result = await bulb.setColorTemperature(75)

    expect(result).toHaveBeenCalledWith(75)
  })

  it('should set RGB values correctly', async () => {
    const result = await bulb.setRGB(50, 255, 100, 50)

    expect(result).toHaveBeenCalledWith({ brightness: 50, red: 255, green: 100, blue: 50 })
  })
})
