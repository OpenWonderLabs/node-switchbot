/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wosensorth.ts: Switchbot BLE API registration.
 */
import type { Buffer } from 'node:buffer'

import type { meterPlusServiceData, meterProServiceData, meterServiceData } from '../types/bledevicestatus.js'
import type { NobleTypes } from '../types/types.js'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'

/**
 * Class representing a WoSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoSensorTH extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<meterServiceData | null> {
    return this.parseServiceDataCommon(serviceData, emitLog, SwitchBotBLEModel.Meter, SwitchBotBLEModelName.Meter, SwitchBotBLEModelFriendlyName.Meter) as Promise<meterServiceData | null>
  }

  static async parseServiceData_Plus(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<meterPlusServiceData | null> {
    return this.parseServiceDataCommon(serviceData, emitLog, SwitchBotBLEModel.MeterPlus, SwitchBotBLEModelName.MeterPlus, SwitchBotBLEModelFriendlyName.MeterPlus) as Promise<meterPlusServiceData | null>
  }

  static async parseServiceData_Pro(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<meterProServiceData | null> {
    return this.parseServiceDataCommon(serviceData, emitLog, SwitchBotBLEModel.MeterPro, SwitchBotBLEModelName.MeterPro, SwitchBotBLEModelFriendlyName.MeterPro) as Promise<meterProServiceData | null>
  }

  private static async parseServiceDataCommon(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
    model: SwitchBotBLEModel.Meter | SwitchBotBLEModel.MeterPlus | SwitchBotBLEModel.MeterPro,
    modelName: SwitchBotBLEModelName.Meter | SwitchBotBLEModelName.MeterPlus | SwitchBotBLEModelName.MeterPro,
    modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter | SwitchBotBLEModelFriendlyName.MeterPlus | SwitchBotBLEModelFriendlyName.MeterPro,
  ): Promise<meterServiceData | meterPlusServiceData | meterProServiceData | null> {
    if (serviceData.length !== 6) {
      emitLog('debugerror', `[parseServiceDataCommon] Buffer length ${serviceData.length} !== 6!`)
      return null
    }

    const [byte2, byte3, byte4, byte5] = [
      serviceData.readUInt8(2),
      serviceData.readUInt8(3),
      serviceData.readUInt8(4),
      serviceData.readUInt8(5),
    ]
    const tempSign = byte4 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

    const data = {
      model,
      modelName,
      modelFriendlyName,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }

    if (model === SwitchBotBLEModel.Meter) {
      return data as meterServiceData
    }
    if (model === SwitchBotBLEModel.MeterPlus) {
      return data as meterPlusServiceData
    }
    if (model === SwitchBotBLEModel.MeterPro) {
      return data as meterProServiceData
    }
    return null
  }
}
