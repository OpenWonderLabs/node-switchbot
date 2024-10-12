/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * advertising.ts: Switchbot BLE API registration.
 */
import type * as Noble from '@stoprocent/noble'

import type { Ad, ServiceData } from './types/types.js'

import { Buffer } from 'node:buffer'

import { WoBlindTilt } from './device/woblindtilt.js'
import { WoBulb } from './device/wobulb.js'
import { WoCeilingLight } from './device/woceilinglight.js'
import { WoContact } from './device/wocontact.js'
import { WoCurtain } from './device/wocurtain.js'
import { WoHand } from './device/wohand.js'
import { WoHub2 } from './device/wohub2.js'
import { WoHumi } from './device/wohumi.js'
import { WoIOSensorTH } from './device/woiosensorth.js'
import { WoPlugMini } from './device/woplugmini.js'
import { WoPresence } from './device/wopresence.js'
import { WoSensorTH } from './device/wosensorth.js'
import { WoSmartLock } from './device/wosmartlock.js'
import { WoSmartLockPro } from './device/wosmartlockpro.js'
import { WoStrip } from './device/wostrip.js'
import { SwitchBotBLEModel } from './types/types.js'

/**
 * Represents the advertising data parser for SwitchBot devices.
 */
export class Advertising {
  constructor() {}

  /**
   * Parses the advertisement data coming from SwitchBot device.
   *
   * This function processes advertising packets received from SwitchBot devices
   * and extracts relevant information based on the device type.
   *
   * @param {Noble.Peripheral} peripheral - The peripheral device object from noble.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<Ad | null>} - An object containing parsed data specific to the SwitchBot device type, or `null` if the device is not recognized.
   */
  static async parse(
    peripheral: Noble.Peripheral,
    emitLog: (level: string, message: string) => void,
  ): Promise<Ad | null> {
    const ad = peripheral.advertisement
    if (!ad || !ad.serviceData) {
      return null
    }

    const serviceData = ad.serviceData[0]?.data
    const manufacturerData = ad.manufacturerData

    if (!Advertising.validateBuffer(serviceData) || !Advertising.validateBuffer(manufacturerData)) {
      return null
    }

    const model = serviceData.subarray(0, 1).toString('utf8')
    const sd = await Advertising.parseServiceData(model, serviceData, manufacturerData, emitLog)
    if (!sd) {
      // emitLog('debugerror', `[parseAdvertising.${peripheral.id}.${model}] return null, parsed serviceData empty!`)
      return null
    }

    const address = Advertising.formatAddress(peripheral)
    const data = {
      id: peripheral.id,
      address,
      rssi: peripheral.rssi,
      serviceData: { model, ...sd } as ServiceData,
    }

    emitLog('debug', `[parseAdvertising.${peripheral.id}.${model}] return ${JSON.stringify(data)}`)
    return data
  }

  /**
   * Validates if the buffer is a valid Buffer object with a minimum length.
   *
   * @param {any} buffer - The buffer to validate.
   * @returns {boolean} - True if the buffer is valid, false otherwise.
   */
  private static validateBuffer(buffer: any): boolean {
    return buffer && Buffer.isBuffer(buffer) && buffer.length >= 3
  }

  /**
   * Parses the service data based on the device model.
   *
   * @param {string} model - The device model.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<any>} - The parsed service data.
   */
  public static async parseServiceData(
    model: string,
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<any> {
    switch (model) {
      case SwitchBotBLEModel.Bot:
        return WoHand.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.Curtain:
      case SwitchBotBLEModel.Curtain3:
        return WoCurtain.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.Humidifier:
        return WoHumi.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.Meter:
        return WoSensorTH.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.MeterPlus:
        return WoSensorTH.parseServiceData_Plus(serviceData, emitLog)
      case SwitchBotBLEModel.Hub2:
        return WoHub2.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.OutdoorMeter:
        return WoIOSensorTH.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.MotionSensor:
        return WoPresence.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.ContactSensor:
        return WoContact.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.ColorBulb:
        return WoBulb.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.CeilingLight:
        return WoCeilingLight.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.CeilingLightPro:
        return WoCeilingLight.parseServiceData_Pro(manufacturerData, emitLog)
      case SwitchBotBLEModel.StripLight:
        return WoStrip.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.PlugMiniUS:
        return WoPlugMini.parseServiceData_US(manufacturerData, emitLog)
      case SwitchBotBLEModel.PlugMiniJP:
        return WoPlugMini.parseServiceData_JP(manufacturerData, emitLog)
      case SwitchBotBLEModel.Lock:
        return WoSmartLock.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.LockPro:
        return WoSmartLockPro.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.BlindTilt:
        return WoBlindTilt.parseServiceData(serviceData, manufacturerData, emitLog)
      default:
        emitLog('debug', `[parseAdvertising.${model}] return null, model "${model}" not available!`)
        return null
    }
  }

  /**
   * Formats the address of the peripheral.
   *
   * @param {Noble.Peripheral} peripheral - The peripheral device object from noble.
   * @returns {string} - The formatted address.
   */
  private static formatAddress(peripheral: Noble.Peripheral): string {
    let address = peripheral.address || ''
    if (address === '') {
      const str = peripheral.advertisement.manufacturerData?.toString('hex').slice(4, 16) || ''
      if (str !== '') {
        address = str.match(/.{1,2}/g)?.join(':') || ''
      }
    } else {
      address = address.replace(/-/g, ':')
    }
    return address
  }
}
