/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot.ts: Switchbot BLE API registration.
 */
import type * as Noble from '@stoprocent/noble'

import type { Ad, Params } from './types/types.js'

import { EventEmitter } from 'node:events'

import { Advertising } from './advertising.js'
import { SwitchbotDevice } from './device.js'
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
import { parameterChecker } from './parameter-checker.js'
import { SwitchBotBLEModel } from './types/types.js'
/**
 * SwitchBot class to interact with SwitchBot devices.
 */
export class SwitchBotBLE extends EventEmitter {
  private ready: Promise<void>
  noble!: typeof Noble
  ondiscover?: (device: SwitchbotDevice) => void
  onadvertisement?: (ad: Ad) => void
  DEFAULT_DISCOVERY_DURATION = 5000
  PRIMARY_SERVICE_UUID_LIST = []

  /**
   * Constructor
   *
   * @param {Params} [params] - Optional parameters
   */
  constructor(params?: Params) {
    super()
    this.ready = this.init(params)
  }

  /**
   * Emits a log event with the specified log level and message.
   *
   * @param level - The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message - The log message to be emitted.
   */
  public async emitLog(level: string, message: string): Promise<void> {
    this.emit('log', { level, message })
  }

  /**
   * Initializes the noble object.
   *
   * @param {Params} [params] - Optional parameters
   * @returns {Promise<void>} - Resolves when initialization is complete
   */
  async init(params?: Params): Promise<void> {
    let noble: typeof Noble
    if (params && params.noble) {
      noble = params.noble
    } else {
      noble = (await import('@stoprocent/noble')).default as typeof Noble
    }

    // Public properties
    this.noble = noble
  }

  /**
   * Discover SwitchBot devices based on the provided parameters.
   *
   * @param {Params} params - The parameters for discovery.
   * @returns {Promise<SwitchbotDevice[]>} - A promise that resolves with a list of discovered devices.
   */
  async discover(params: Params = {}): Promise<SwitchbotDevice[]> {
    const promise = new Promise<SwitchbotDevice[]>((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        params as Record<string, unknown>,
        {
          duration: { required: false, type: 'integer', min: 1, max: 60000 },
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
          quick: { required: false, type: 'boolean' },
        },
        false,
      )

      if (!valid) {
        this.emitLog('error', `parameterChecker: ${JSON.stringify(parameterChecker.error!.message)}`)
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
            this.noble.stopScanningAsync()

            const device_list: SwitchbotDevice[] = []
            for (const addr in peripherals) {
              device_list.push(peripherals[addr])
            }

            resolve(device_list)
          }

          // Set a handler for the 'discover' event
          this.noble.on('discover', async (peripheral: Noble.Peripheral) => {
            const device = await this.getDeviceObject(peripheral, p.id, p.model)
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
          this.noble.startScanningAsync(
            this.PRIMARY_SERVICE_UUID_LIST,
            false,
          ).then(() => {
            timer = setTimeout(() => {
              finishDiscovery()
            }, p.duration)
          }).catch((error: Error) => {
            reject(error)
          })
        })
        .catch((error) => {
          reject(error)
        })
    })
    return promise
  }

  /**
   * Initializes the noble object and waits for it to be powered on.
   *
   * @returns {Promise<void>} - Resolves when the noble object is powered on.
   */
  async _init(): Promise<void> {
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

  /**
   * Gets the device object based on the peripheral, id, and model.
   *
   * @param {Noble.Peripheral} peripheral - The peripheral object.
   * @param {string} id - The device id.
   * @param {string} model - The device model.
   * @returns {Promise<SwitchbotDevice | null>} - The device object or null.
   */
  async getDeviceObject(peripheral: Noble.Peripheral, id: string, model: string): Promise<SwitchbotDevice | null> {
    const ad = await Advertising.parse(peripheral, this.emitLog.bind(this))
    if (ad && await this.filterAdvertising(ad, id, model)) {
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
      return device || null
    } else {
      return null
    }
  }

  /**
   * Filters advertising data based on id and model.
   *
   * @param {Ad} ad - The advertising data.
   * @param {string} id - The device id.
   * @param {string} model - The device model.
   * @returns {boolean} - True if the advertising data matches the id and model, false otherwise.
   */
  async filterAdvertising(ad: Ad, id: string, model: string): Promise<boolean> {
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

  /**
   * Starts scanning for SwitchBot devices.
   *
   * @param {Params} [params] - Optional parameters.
   * @returns {Promise<void>} - Resolves when scanning starts successfully.
   */
  async startScan(params: Params = {}): Promise<void> {
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
        this.emitLog('error', `parameterChecker: ${JSON.stringify(parameterChecker.error!.message)}`)
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
          this.noble.on('discover', async (peripheral: Noble.Peripheral) => {
            const ad = await Advertising.parse(peripheral, this.emitLog.bind(this))
            if (ad && await this.filterAdvertising(ad, p.id, p.model)) {
              if (
                this.onadvertisement
                && typeof this.onadvertisement === 'function'
              ) {
                this.onadvertisement(ad)
              }
            }
          })

          // Start scanning
          this.noble.startScanningAsync(
            this.PRIMARY_SERVICE_UUID_LIST,
            true,
          ).then(() => {
            this.emitLog('info', 'Started Scanning for SwitchBot BLE devices.')
            resolve()
          }).catch((error: Error) => {
            this.emitLog('error', `startScanning error: ${JSON.stringify(error!.message)}`)
            reject(error)
          })
        })
        .catch((error) => {
          this.emitLog('error', `startScanning error: ${JSON.stringify(error!.message)}`)
          reject(error)
        })
    })
    return promise
  }

  /**
   * Stops scanning for SwitchBot devices.
   *
   * @returns {Promise<void>} - Resolves when scanning stops successfully.
   */
  async stopScan(): Promise<void> {
    if (this.noble === null) {
      return
    }

    this.noble.removeAllListeners('discover')
    this.noble.stopScanningAsync()
    this.emitLog('info', 'Stopped Scanning for SwitchBot BLE devices.')
  }

  /**
   * Waits for the specified time.
   *
   * @param {number} msec - The time to wait in milliseconds.
   * @returns {Promise<void>} - Resolves after the specified time.
   */
  async wait(msec: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        {
          msec,
        },
        {
          msec: { required: true, type: 'integer', min: 0 },
        },
        true, // Add the required argument
      )

      if (!valid) {
        this.emitLog('error', `parameterChecker: ${JSON.stringify(parameterChecker.error!.message)}`)
        reject(new Error(parameterChecker.error!.message))
        return
      }
      // Set a timer
      setTimeout(resolve, msec)
    })
  }
}

export { SwitchbotDevice }
