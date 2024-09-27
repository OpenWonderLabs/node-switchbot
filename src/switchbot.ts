/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot.ts: Switchbot BLE API registration.
 */
import type Noble from '@stoprocent/noble'

import { WoHand } from './device/wohand.js';
import { WoCurtain } from './device/wocurtain.js';
import { WoBlindTilt } from './device/woblindtilt.js';
import { WoPresence } from './device/wopresence.js';
import { WoContact } from './device/wocontact.js';
import { WoSensorTH } from './device/wosensorth.js';
import { WoIOSensorTH } from './device/woiosensorth.js';
import { WoHub2 } from './device/wohub2.js';
import { WoHumi } from './device/wohumi.js';
import { WoPlugMini } from './device/woplugmini.js';
import { WoBulb } from './device/wobulb.js';
import { WoCeilingLight } from './device/woceilinglight.js';
import { WoStrip } from './device/wostrip.js';
import { WoSmartLock } from './device/wosmartlock.js';
import { WoSmartLockPro } from './device/wosmartlockpro.js';
import { Ad } from './advertising.js';
import { SwitchBotBLEModel, Params } from './types/types.js';

import { Buffer } from 'node:buffer'

import { Advertising } from './advertising.js'
import { SwitchbotDevice } from './device.js'
import { parameterChecker } from './parameter-checker.js'

export class SwitchBot {
  private ready: Promise<void>
  noble!: typeof Noble
  ondiscover?: (device: SwitchbotDevice) => void
  onadvertisement?: (ad: Ad) => void
  onlog: ((message: string) => void) | undefined
  DEFAULT_DISCOVERY_DURATION = 5000
  PRIMARY_SERVICE_UUID_LIST = []
  /* ------------------------------------------------------------------
               * Constructor
               *
               * [Arguments]
               * - params  | Object  | Optional |
               *   - noble | Noble   | Optional | The Noble object created by the noble module.
               *           |         |          | This parameter is optional.
               *           |         |          | If you don't specify this parameter, this
               *           |         |          | module automatically creates it.
               * ---------------------------------------------------------------- */

  constructor(params?: Params) {
    this.ready = this.init(params)
  }

  // Check parameters
  async init(params?: Params) {
    let noble: typeof Noble
    if (params && params.noble) {
      noble = params.noble
    } else {
      noble = (await import('@stoprocent/noble')).default
    }

    // Public properties
    this.noble = noble
  }

  /**
   * Initiates BLE discovery for SwitchBot devices, scanning for those matching specified criteria.
   * This async operation looks for devices by model or ID within a set duration.
   *
   * @param params An optional object with properties:
   *  - duration: Discovery time in milliseconds (1 to 60000, default 5000).
   *  - model: String specifying device type to discover, with each character representing a model:
   *    - "H": Bots
   *    - "T": Meters
   *    - "e": Humidifiers
   *    - "s": Motion Sensors
   *    - "d": Contact Sensors
   *    - "c": Curtains
   *    - "{": Curtain 3
   *    - "u": Color Bulbs
   *    - "g": Plugs
   *    - "o": Locks
   *    - "$": Lock Pros
   *    - "i": Meter Pluses
   *    - "r": Locks (Duplicate, possibly an error)
   *  - id: Optional device ID (MAC address) to discover, case-insensitive, ignores colons.
   *  - quick: If true, stops discovery upon first match, not waiting full duration. Defaults to false.
   *
   * @returns Promise resolving to an array of `SwitchbotDevice` objects for discovered devices.
   *
   * @deprecated since version 2.4.0. Will be removed in version 3.0.0. Use getDeviceObjectAsync() instead.
   */
  discover(params: Params = {}) {
    const promise = new Promise((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        params as Record<string, unknown>,
        {
          duration: { required: false, type: 'integer', min: 1, max: 60000 },
          model: {
            required: false,
            type: 'string',
            enum: Object.values(SwitchBotBLEModel),
          },
          id: { required: false, type: 'string', min: 12, max: 17 },
          quick: { required: false, type: 'boolean' },
        },
        false,
      )

      if (!valid) {
        reject(new Error(parameterChecker.error!.message))
        return
      }

      if (!params) {
        params = {}
      }

      // Determine the values of the parameters
      const p = {
        duration: params.duration || this.DEFAULT_DISCOVERY_DURATION,
        model: params.model || '',
        id: params.id || '',
        quick: !!params.quick,
      }

      // Initialize the noble object
      this._init()
        .then(() => {
          if (this.noble === null) {
            return reject(new Error('noble failed to initialize'))
          }
          const peripherals: Record<string, SwitchbotDevice> = {}
          let timer: NodeJS.Timeout = setTimeout(() => { }, 0)
          const finishDiscovery = () => {
            if (timer) {
              clearTimeout(timer)
            }

            this.noble.removeAllListeners('discover')
            this.noble.stopScanning()

            const device_list: SwitchbotDevice[] = []
            for (const addr in peripherals) {
              device_list.push(peripherals[addr])
            }

            resolve(device_list)
          }

          // Set a handler for the 'discover' event
          this.noble.on('discover', (peripheral: Noble.Peripheral) => {
            const device = this.getDeviceObject(peripheral, p.id, p.model)
            if (!device) {
              return
            }
            const id = device.id
            peripherals[id!] = device

            if (this.ondiscover && typeof this.ondiscover === 'function') {
              this.ondiscover(device)
            }

            if (p.quick) {
              finishDiscovery()
            }
          })
          // Start scanning
          this.noble.startScanning(
            this.PRIMARY_SERVICE_UUID_LIST,
            false,
            (error?: Error) => {
              if (error) {
                reject(error)
                return
              }
              timer = setTimeout(() => {
                finishDiscovery()
              }, p.duration)
            },
          )
        })
        .catch((error) => {
          reject(error)
        })
    })
    return promise
  }

  async _init() {
    await this.ready
    const promise = new Promise<void>((resolve, reject) => {
      let err
      if (this.noble._state === 'poweredOn') {
        resolve()
        return
      }
      this.noble.once('stateChange', (state: typeof Noble._state) => {
        switch (state) {
          case 'unsupported':
          case 'unauthorized':
          case 'poweredOff':
            err = new Error(
              `Failed to initialize the Noble object: ${this.noble._state}`,
            )
            reject(err)
            return
          case 'resetting':
          case 'unknown':
            err = new Error(
              `Adapter is not ready: ${this.noble._state}`,
            )
            reject(err)
            return
          case 'poweredOn':
            resolve()
            return
          default:
            err = new Error(
              `Unknown state: ${this.noble._state}`,
            )
            reject(err)
        }
      })
    })
    return promise
  }

  getDeviceObject(peripheral: Noble.Peripheral, id: string, model: string) {
    const ad = Advertising.parse(peripheral, this.onlog)
    if (this.filterAdvertising(ad, id, model)) {
      let device
      if (ad && ad.serviceData && ad.serviceData.model) {
        switch (ad.serviceData.model) {
          case SwitchBotBLEModel.Bot:
            device = new WoHand(peripheral, this.noble)
            break
          case SwitchBotBLEModel.Curtain:
          case SwitchBotBLEModel.Curtain3:
            device = new WoCurtain(peripheral, this.noble)
            break
          case SwitchBotBLEModel.Humidifier:
            device = new WoHumi(peripheral, this.noble)
            break
          case SwitchBotBLEModel.Meter:
            device = new WoSensorTH(peripheral, this.noble)
            break
          case SwitchBotBLEModel.MeterPlus:
            device = new WoSensorTH(peripheral, this.noble)
            break
          case SwitchBotBLEModel.Hub2:
            device = new WoHub2(peripheral, this.noble)
            break
          case SwitchBotBLEModel.OutdoorMeter:
            device = new WoIOSensorTH(peripheral, this.noble)
            break
          case SwitchBotBLEModel.MotionSensor:
            device = new WoPresence(peripheral, this.noble)
            break
          case SwitchBotBLEModel.ContactSensor:
            device = new WoContact(peripheral, this.noble)
            break
          case SwitchBotBLEModel.ColorBulb:
            device = new WoBulb(peripheral, this.noble)
            break
          case SwitchBotBLEModel.CeilingLight:
            device = new WoCeilingLight(peripheral, this.noble)
            break
          case SwitchBotBLEModel.CeilingLightPro:
            device = new WoCeilingLight(peripheral, this.noble)
            break
          case SwitchBotBLEModel.StripLight:
            device = new WoStrip(peripheral, this.noble)
            break
          case SwitchBotBLEModel.PlugMiniUS:
          case SwitchBotBLEModel.PlugMiniJP:
            device = new WoPlugMini(peripheral, this.noble)
            break
          case SwitchBotBLEModel.Lock:
            device = new WoSmartLock(peripheral, this.noble)
            break
          case SwitchBotBLEModel.LockPro:
            device = new WoSmartLockPro(peripheral, this.noble)
            break
          case SwitchBotBLEModel.BlindTilt:
            device = new WoBlindTilt(peripheral, this.noble)
            break
          default: // 'resetting', 'unknown'
            device = new SwitchbotDevice(peripheral, this.noble)
        }
      }
      return device
    } else {
      return null
    }
  }

  filterAdvertising(ad: Ad, id: string, model: string) {
    if (!ad) {
      return false
    }
    if (id) {
      id = id.toLowerCase().replace(/:/g, '')
      const ad_id = ad.address.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (ad_id !== id) {
        return false
      }
    }
    if (model) {
      if (ad.serviceData.model !== model) {
        return false
      }
    }
    return true
  }

  /* ------------------------------------------------------------------
     * startScan([params])
     * - Start to monitor advertising packets coming from switchbot devices
     *
     * [Arguments]
     *   - params   | Object  | Optional |
     *   - model    | String  | Optional | "H", "T", "e", "s", "d", "c", "{", "u", "g", "o", "i", "x", or "r".
     *              |         |          | If "H" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Bots.
     *              |         |          | If "T" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Meters.
     *              |         |          | If "e" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Humidifiers.
     *              |         |          | If "s" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Motion Sensor.
     *              |         |          | If "d" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Contact Sensor.
     *              |         |          | If "c" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Curtains.
     *              |         |          | If "{" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Curtain 3.
     *              |         |          | If "x" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from BlindTilt.
     *              |         |          | If "u" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Color Bulb.
     *              |         |          | If "g" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Plug Mini.
     *              |         |          | If "o" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Smart Lock.
     *              |         |          | If "$" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Smart Lock Pro.
     *              |         |          | If "i" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from Meter Plus.
     *              |         |          | If "r" is specified, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from LED Strip Light.
     *   - id       | String  | Optional | If this value is set, the `onadvertisement`
     *              |         |          | event handler will be called only when advertising
     *              |         |          | packets comes from devices whose ID is as same as
     *              |         |          | this value.
     *              |         |          | The ID is identical to the MAC address.
     *              |         |          | This parameter is case-insensitive, and
     *              |         |          | colons are ignored.
     *
     * [Return value]
     * - Promise object
     *   Nothing will be passed to the `resolve()`.
     * ---------------------------------------------------------------- */
  startScan(params: Params = {}) {
    const promise = new Promise<void>((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        params as Record<string, unknown>,
        {
          model: {
            required: false,
            type: 'string',
            enum: [
              SwitchBotBLEModel.Bot,
              SwitchBotBLEModel.Curtain,
              SwitchBotBLEModel.Curtain3,
              SwitchBotBLEModel.Humidifier,
              SwitchBotBLEModel.Meter,
              SwitchBotBLEModel.MeterPlus,
              SwitchBotBLEModel.Hub2,
              SwitchBotBLEModel.OutdoorMeter,
              SwitchBotBLEModel.MotionSensor,
              SwitchBotBLEModel.ContactSensor,
              SwitchBotBLEModel.ColorBulb,
              SwitchBotBLEModel.CeilingLight,
              SwitchBotBLEModel.CeilingLightPro,
              SwitchBotBLEModel.StripLight,
              SwitchBotBLEModel.PlugMiniUS,
              SwitchBotBLEModel.PlugMiniJP,
              SwitchBotBLEModel.Lock,
              SwitchBotBLEModel.LockPro,
              SwitchBotBLEModel.BlindTilt,
            ],
          },
          id: { required: false, type: 'string', min: 12, max: 17 },
        },
        false,
      )
      if (!valid) {
        reject(new Error(parameterChecker.error!.message))
        return
      }

      // Initialize the noble object
      this._init()
        .then(() => {
          if (this.noble === null) {
            return reject(new Error('noble object failed to initialize'))
          }
          // Determine the values of the parameters
          const p = {
            model: params.model || '',
            id: params.id || '',
          }

          // Set a handler for the 'discover' event
          this.noble.on('discover', (peripheral: Noble.Peripheral) => {
            const ad = Advertising.parse(peripheral, this.onlog)
            if (this.filterAdvertising(ad, p.id, p.model)) {
              if (
                this.onadvertisement
                && typeof this.onadvertisement === 'function'
              ) {
                this.onadvertisement(ad)
              }
            }
          })

          // Start scanning
          this.noble.startScanning(
            this.PRIMARY_SERVICE_UUID_LIST,
            true,
            (error?: Error) => {
              if (error) {
                reject(error)
              } else {
                resolve()
              }
            },
          )
        })
        .catch((error) => {
          reject(error)
        })
    })
    return promise
  }

    if (this.noble === null) {
      return
    }
      });

    this.noble.removeAllListeners('discover')
    this.noble.stopScanning()
  }

  /* ------------------------------------------------------------------
     * wait(msec) {
     * - Wait for the specified time (msec)
     *
     * [Arguments]
     * - msec | Integer | Required | Msec.
     *
     * [Return value]
     * - Promise object
     *   Nothing will be passed to the `resolve()`.
     * ---------------------------------------------------------------- */
  wait(msec: number) {
    return new Promise((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        { msec },
        {
          msec: { required: true, type: 'integer', min: 0 },
        },
        true, // Add the required argument
      )

      if (!valid) {
        reject(new Error(parameterChecker.error!.message))
        return
      }
      // Set a timer
      setTimeout(resolve, msec)
    })
  }
}

export { SwitchbotDevice }
