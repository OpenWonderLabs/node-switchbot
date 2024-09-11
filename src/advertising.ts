/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * advertising.ts: Switchbot BLE API registration.
 */
import type { Peripheral } from '@stoprocent/noble'

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
import { SwitchBotBLEModel } from './types.js'

export type Ad = {
  id: string
  address: string
  rssi: number
  serviceData: Record<string, unknown>
} | null

export class Advertising {
  constructor() { }

  /* ------------------------------------------------------------------
   * parse(peripheral)
   * - Parse advertising packets coming from switchbot devices
   *
   * [Arguments]
   * - peripheral | Object  | Required | A `Peripheral` object of noble
   *
   * [Return value]
   * - An object as follows:
   *
   * WoHand
   * {
   *   id: 'c12e453e2008',
   *   address: 'c1:2e:45:3e:20:08',
   *   rssi: -43,
   *   serviceData: {
   *     model: 'H',
   *     modelName: 'WoHand',
   *     mode: false,
   *     state: false,
   *     battery: 95
   *   }
   * }
   *
   * WoSensorTH
   * {
   *   id: 'cb4eb903c96d',
   *   address: 'cb:4e:b9:03:c9:6d',
   *   rssi: -54,
   *   serviceData: {
   *     model: 'T',
   *     modelName: 'WoSensorTH',
   *     celsius: 26.2,
   *     fahrenheit: 79.2,
   *     fahrenheit_mode: false,
   *     humidity: 45,
   *     battery: 100
   *   }
   * }
   *
   * WoCurtain
   * {
   *   id: 'ec58c5d00111',
   *   address: 'ec:58:c5:d0:01:11',
   *   rssi: -39,
   *   serviceData: {
   *     model: 'c',
   *     modelName: 'WoCurtain',
   *     calibration: true,
   *     battery: 91,
   *     position: 1,
   *     lightLevel: 1
   *   }
   * }
   *
   * If the specified `Peripheral` does not represent any switchbot
   * device, this method will return `null`.
   * ---------------------------------------------------------------- */
  /**
   * Parses the advertisement data of a peripheral device.
   *
   * @param peripheral - The peripheral device.
   * @param onlog - The logging function.
   * @returns The parsed data of the peripheral device.
   */
  static parse(peripheral: Peripheral, onlog?: (message: string) => void) {
    const ad = peripheral.advertisement
    if (!ad || !ad.serviceData) {
      return null
    }
    const serviceData = ad.serviceData[0] || ad.serviceData
    const manufacturerData = ad.manufacturerData
    const buf = serviceData.data

    const bufIsInvalid = !buf || !Buffer.isBuffer(buf) || buf.length < 3
    const manufacturerDataIsInvalid
      = !manufacturerData
      || !Buffer.isBuffer(manufacturerData)
      || manufacturerData.length < 3

    if (bufIsInvalid || manufacturerDataIsInvalid) {
      return null
    }

    const model = buf.subarray(0, 1).toString('utf8')
    let sd
    switch (model) {
      case SwitchBotBLEModel.Bot:
        sd = WoHand.parseServiceData(buf, onlog)
        break
      case SwitchBotBLEModel.Curtain:
      case SwitchBotBLEModel.Curtain3:
        sd = WoCurtain.parseServiceData(buf, onlog)
        break
      case SwitchBotBLEModel.Humidifier:
        sd = WoHumi.parseServiceData(buf, onlog)
        break
      case SwitchBotBLEModel.Meter:
        sd = WoSensorTH.parseServiceData(buf, onlog)
        break
      case SwitchBotBLEModel.MeterPlus:
        sd = WoSensorTH.parseServiceData_Plus(buf, onlog)
        break
      case SwitchBotBLEModel.Hub2:
        sd = WoHub2.parseServiceData(manufacturerData, onlog)
        break
      case SwitchBotBLEModel.OutdoorMeter:
        sd = WoIOSensorTH.parseServiceData(buf, manufacturerData, onlog)
        break
      case SwitchBotBLEModel.MotionSensor:
        sd = WoPresence.parseServiceData(buf, onlog)
        break
      case SwitchBotBLEModel.ContactSensor:
        sd = WoContact.parseServiceData(buf, onlog)
        break
      case SwitchBotBLEModel.ColorBulb:
        sd = WoBulb.parseServiceData(manufacturerData, onlog)
        break
      case SwitchBotBLEModel.CeilingLight:
        sd = WoCeilingLight.parseServiceData(manufacturerData, onlog)
        break
      case SwitchBotBLEModel.CeilingLightPro:
        sd = WoCeilingLight.parseServiceData_Pro(manufacturerData, onlog)
        break
      case SwitchBotBLEModel.StripLight:
        sd = WoStrip.parseServiceData(buf, onlog)
        break
      case SwitchBotBLEModel.PlugMiniUS:
        sd = WoPlugMini.parseServiceData_US(manufacturerData, onlog)
        break
      case SwitchBotBLEModel.PlugMiniJP:
        sd = WoPlugMini.parseServiceData_JP(manufacturerData, onlog)
        break
      case SwitchBotBLEModel.Lock:
        sd = WoSmartLock.parseServiceData(buf, manufacturerData, onlog)
        break
      case SwitchBotBLEModel.LockPro:
        sd = WoSmartLockPro.parseServiceData(buf, manufacturerData, onlog)
        break
      case SwitchBotBLEModel.BlindTilt:
        sd = WoBlindTilt.parseServiceData(buf, onlog)
        break
      default:
        if (onlog && typeof onlog === 'function') {
          onlog(
            `[parseAdvertising.${peripheral.id}] return null, model "${model}" not available!`,
          )
        }
        return null
    }
    if (!sd) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseAdvertising.${peripheral.id}.${model}] return null, parsed serviceData empty!`,
        )
      }
      return null
    }
    let address = peripheral.address || ''
    if (address === '') {
      const str = peripheral.advertisement.manufacturerData
        .toString('hex')
        .slice(4, 16)
      if (str !== '') {
        address = str.substr(0, 2)
        for (let i = 2; i < str.length; i += 2) {
          address = `${address}:${str.substr(i, 2)}`
        }
      }
    } else {
      address = address.replace(/-/g, ':')
    }
    const data = {
      id: peripheral.id,
      address,
      rssi: peripheral.rssi,
      serviceData: sd,
    }

    if (onlog && typeof onlog === 'function') {
      onlog(
        `[parseAdvertising.${peripheral.id}.${model}] return ${JSON.stringify(
          data,
        )}`,
      )
    }
    return data
  }
}
