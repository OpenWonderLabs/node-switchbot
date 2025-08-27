import type { ceilingLightServiceData, colorBulbServiceData, meterServiceData } from './ble'

import { describe, expect, it } from 'vitest'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../device'
import { isServiceDataOfModel } from './ble-guards'

describe('ble service data guards', () => {
  it('identifies colorBulbServiceData correctly', () => {
    const sample: colorBulbServiceData = {
      model: SwitchBotBLEModel.ColorBulb,
      modelName: SwitchBotBLEModelName.ColorBulb,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ColorBulb,
      color_temperature: 3000,
      power: true,
      state: false,
      red: 255,
      green: 200,
      blue: 150,
      brightness: 50,
      delay: 0,
      preset: 1,
      color_mode: 0,
      speed: 10,
      loop_index: 0,
    }
    expect(isServiceDataOfModel(sample, SwitchBotBLEModel.ColorBulb)).toBe(true)
    expect(isServiceDataOfModel(sample, SwitchBotBLEModel.CeilingLight)).toBe(false)
  })

  it('identifies ceilingLightServiceData correctly', () => {
    const sample: ceilingLightServiceData = {
      model: SwitchBotBLEModel.CeilingLight,
      modelName: SwitchBotBLEModelName.CeilingLight,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLight,
      color_temperature: 3500,
      power: false,
      state: true,
      red: 100,
      green: 150,
      blue: 200,
      brightness: 75,
      delay: 5,
      preset: 2,
      color_mode: 1,
      speed: 5,
      loop_index: 1,
    }
    expect(isServiceDataOfModel(sample, SwitchBotBLEModel.CeilingLight)).toBe(true)
    expect(isServiceDataOfModel(sample, SwitchBotBLEModel.Meter)).toBe(false)
  })

  it('identifies meterServiceData correctly', () => {
    const sample: meterServiceData = {
      model: SwitchBotBLEModel.Meter,
      modelName: SwitchBotBLEModelName.Meter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter,
      celsius: 22.5,
      fahrenheit: 72.5,
      fahrenheit_mode: false,
      humidity: 45,
      battery: 90,
    }
    expect(isServiceDataOfModel(sample, SwitchBotBLEModel.Meter)).toBe(true)
    expect(isServiceDataOfModel(sample, SwitchBotBLEModel.ColorBulb)).toBe(false)
  })
})
