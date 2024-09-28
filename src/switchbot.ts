/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot.ts: Switchbot BLE API registration.
 */
import type { Ad } from './advertising.js'
import type { Params } from './types/types.js'

import * as Noble from '@stoprocent/noble'

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

  /**
   * Initializes the noble object.
   *
   * @param {Params} [params] - Optional parameters
   * @param {typeof Noble} [params.noble] - Optional noble instance
   * @returns {Promise<void>} - Resolves when initialization is complete
   */
  async init(params?: Params): Promise<void> {
    this.noble = params?.noble ?? Noble
  }

  /**
   * Discover SwitchBot devices based on the provided parameters.
   *
   * @param {Params} params - The parameters for discovery.
   * @returns {Promise<SwitchbotDevice[]>} - A promise that resolves with a list of discovered devices.
   */
  async discover(params: Params = {}): Promise<SwitchbotDevice[]> {
    // Validate parameters
    const valid = parameterChecker.check(params as Record<string, unknown>, {
      duration: { required: false, type: 'integer', min: 1, max: 60000 },
      model: { required: false, type: 'string', enum: Object.values(SwitchBotBLEModel) },
      id: { required: false, type: 'string', min: 12, max: 17 },
      quick: { required: false, type: 'boolean' },
    }, false)

    if (!valid) {
      throw new Error(parameterChecker.error!.message)
    }

    const { duration = this.DEFAULT_DISCOVERY_DURATION, model = '', id = '', quick = false } = params

    // Initialize the noble object
    await this._init()
    if (!this.noble) {
      throw new Error('noble failed to initialize')
    }

    const peripherals: Record<string, SwitchbotDevice> = {}
    let timer: NodeJS.Timeout

    const finishDiscovery = () => {
      clearTimeout(timer)
      this.noble.removeAllListeners('discover')
      this.noble.stopScanning()
      return Object.values(peripherals)
    }

    return new Promise<SwitchbotDevice[]>((resolve, reject) => {
      try {
        // Set a handler for the 'discover' event
        this.noble.on('discover', async (peripheral: Noble.Peripheral) => {
          const device = await this.getDeviceObject(peripheral, id, model)
          if (device) {
            peripherals[device.id!] = device
            if (this.ondiscover) {
              this.ondiscover(device)
            }
            if (quick) {
              resolve(finishDiscovery())
            }
          }
        })

        // Start scanning
        this.noble.startScanningAsync(this.PRIMARY_SERVICE_UUID_LIST, false)
          .then(() => {
            timer = setTimeout(() => {
              resolve(finishDiscovery())
            }, duration)
          })
          .catch((error: Error) => {
            reject(new Error(error.message))
          })
      } catch (error) {
        reject(new Error(String(error)))
      }
    })
  }

  async _init() {
    await this.ready

    if (this.noble._state === 'poweredOn') {
      return
    }

    return new Promise<void>((resolve, reject) => {
      this.noble.once('stateChange', (state: typeof Noble._state) => {
        if (state === 'poweredOn') {
          resolve()
        } else if (['unsupported', 'unauthorized', 'poweredOff'].includes(state)) {
          reject(new Error(`Failed to initialize the Noble object: ${state}`))
        } else if (['resetting', 'unknown'].includes(state)) {
          reject(new Error(`Adapter is not ready: ${state}`))
        } else {
          reject(new Error(`Unknown state: ${state}`))
        }
      })
    })
  }

  async getDeviceObject(peripheral: Noble.Peripheral, id: string, model: string): Promise<SwitchbotDevice | null> {
    const ad = await Advertising.parse(peripheral, this.onlog)
    if (!ad) {
      return null
    }

    if (!this.filterAdvertising(ad, id, model)) {
      return null
    }

    const modelMapping: Record<string, new (p: Noble.Peripheral, n: typeof Noble) => SwitchbotDevice> = {
      [SwitchBotBLEModel.Bot]: WoHand,
      [SwitchBotBLEModel.Curtain]: WoCurtain,
      [SwitchBotBLEModel.Curtain3]: WoCurtain,
      [SwitchBotBLEModel.Humidifier]: WoHumi,
      [SwitchBotBLEModel.Meter]: WoSensorTH,
      [SwitchBotBLEModel.MeterPlus]: WoSensorTH,
      [SwitchBotBLEModel.Hub2]: WoHub2,
      [SwitchBotBLEModel.OutdoorMeter]: WoIOSensorTH,
      [SwitchBotBLEModel.MotionSensor]: WoPresence,
      [SwitchBotBLEModel.ContactSensor]: WoContact,
      [SwitchBotBLEModel.ColorBulb]: WoBulb,
      [SwitchBotBLEModel.CeilingLight]: WoCeilingLight,
      [SwitchBotBLEModel.CeilingLightPro]: WoCeilingLight,
      [SwitchBotBLEModel.StripLight]: WoStrip,
      [SwitchBotBLEModel.PlugMiniUS]: WoPlugMini,
      [SwitchBotBLEModel.PlugMiniJP]: WoPlugMini,
      [SwitchBotBLEModel.Lock]: WoSmartLock,
      [SwitchBotBLEModel.LockPro]: WoSmartLockPro,
      [SwitchBotBLEModel.BlindTilt]: WoBlindTilt,
    }

    const DeviceClass = ad?.serviceData?.model ? modelMapping[ad.serviceData.model] : SwitchbotDevice
    return new DeviceClass(peripheral, this.noble)
  }

  filterAdvertising(ad: Ad, id: string, model: string): boolean {
    if (!ad) {
      return false
    }

    if (id) {
      const normalizedId = id.toLowerCase().replace(/:/g, '')
      const adId = ad.address.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (adId !== normalizedId) {
        return false
      }
    }

    if (model && ad.serviceData.model !== model) {
      return false
    }

    return true
  }

  /**
   * startScan([params])
   * - Start to monitor advertising packets coming from switchbot devices
   *
   * @param {object} params - Optional parameters
   * @param {string} [params.model] - Optional model filter ("H", "T", "e", "s", "d", "c", "{", "u", "g", "o", "i", "x", "r")
   * @param {string} [params.id] - Optional ID filter (MAC address, case-insensitive, colons ignored)
   * @returns {Promise<void>} - Resolves when scanning starts successfully
   */
  async startScan(params: Params = {}): Promise<void> {
  // Validate parameters
    const valid = parameterChecker.check(params as Record<string, unknown>, {
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
    }, false)

    if (!valid) {
      throw new Error(parameterChecker.error!.message)
    }

    // Initialize the noble object
    await this._init()
    if (this.noble === null) {
      throw new Error('noble object failed to initialize')
    }

    const { model = '', id = '' } = params

    // Set a handler for the 'discover' event
    this.noble.on('discover', async (peripheral: Noble.Peripheral) => {
      const ad = await Advertising.parse(peripheral, this.onlog)
      if (ad && this.filterAdvertising(ad, id, model)) {
        if (this.onadvertisement && typeof this.onadvertisement === 'function') {
          this.onadvertisement(ad)
        }
      }
    })

    // Start scanning
    await this.noble.startScanningAsync(this.PRIMARY_SERVICE_UUID_LIST, true)
  }

  /**
   * stopScan()
   * - Stop monitoring advertising packets from SwitchBot devices
   *
   * @returns {Promise<void>} - Resolves when scanning stops successfully
   */
  async stopScan(): Promise<void> {
    if (!this.noble) {
      return
    }

    this.noble.removeAllListeners('discover')
    await this.noble.stopScanningAsync()
  }

  /**
   * wait
   * - Wait for the specified time (msec)
   *
   * @param {number} msec - The time to wait in milliseconds
   * @returns {Promise<void>} - Resolves after the specified time
   */
  async wait(msec: number): Promise<void> {
  // Validate parameters
    const valid = parameterChecker.check(
      { msec },
      {
        msec: { required: true, type: 'integer', min: 0 },
      },
      true,
    )

    if (!valid) {
      throw new Error(parameterChecker.error!.message)
    }

    // Return a promise that resolves after the specified time
    return new Promise(resolve => setTimeout(resolve, msec))
  }
}

export { SwitchbotDevice }
