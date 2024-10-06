import type { Ad, Params, Rule } from './types/types.js'

import { EventEmitter } from 'node:events'

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
import { DEFAULT_DISCOVERY_DURATION, PRIMARY_SERVICE_UUID_LIST } from './settings.js'
import { SwitchBotBLEModel } from './types/types.js'

/**
 * SwitchBot class to interact with SwitchBot devices.
 */
export class SwitchBotBLE extends EventEmitter {
  private ready: Promise<void>
  public noble!: typeof Noble
  ondiscover?: (device: SwitchbotDevice) => Promise<void> | void
  onadvertisement?: (ad: Ad) => Promise<void> | void

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
    this.noble = params && params.noble ? params.noble : Noble.default as typeof Noble
  }

  /**
   * Validates the parameters.
   *
   * @param {Params} params - The parameters to validate.
   * @param {Record<string, unknown>} schema - The schema to validate against.
   * @returns {Promise<void>} - Resolves if parameters are valid, otherwise throws an error.
   */
  private async validateParams(params: Params, schema: Record<string, unknown>): Promise<void> {
    const valid = parameterChecker.check(params as Record<string, Rule>, schema as Record<string, Rule>, false)
    if (!valid) {
      this.emitLog('error', `parameterChecker: ${JSON.stringify(parameterChecker.error!.message)}`)
      throw new Error(parameterChecker.error!.message)
    }
  }

  /**
   * Initializes the noble object and waits for it to be powered on.
   *
   * @returns {Promise<void>} - Resolves when the noble object is powered on.
   */
  async _init(): Promise<void> {
    await this.ready
    if (this.noble._state === 'poweredOn') {
      return
    }
    return new Promise<void>((resolve, reject) => {
      this.noble.once('stateChange', (state: typeof Noble._state) => {
        switch (state) {
          case 'unsupported':
          case 'unauthorized':
          case 'poweredOff':
            reject(new Error(`Failed to initialize the Noble object: ${state}`))
            break
          case 'resetting':
          case 'unknown':
            reject(new Error(`Adapter is not ready: ${state}`))
            break
          case 'poweredOn':
            resolve()
            break
          default:
            reject(new Error(`Unknown state: ${state}`))
        }
      })
    })
  }

  /**
   * Discover SwitchBot devices based on the provided parameters.
   *
   * @param {Params} params - The parameters for discovery.
   * @returns {Promise<SwitchbotDevice[]>} - A promise that resolves with a list of discovered devices.
   */
  async discover(params: Params = {}): Promise<SwitchbotDevice[]> {
    await this.ready
    await this.validateParams(params, {
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
    })

    await this._init()

    if (this.noble === null) {
      throw new Error('noble failed to initialize')
    }

    const p = {
      duration: params.duration ?? DEFAULT_DISCOVERY_DURATION,
      model: params.model ?? '',
      id: params.id ?? '',
      quick: !!params.quick,
    }

    const peripherals: Record<string, SwitchbotDevice> = {}
    let timer: NodeJS.Timeout

    const finishDiscovery = async () => {
      if (timer) {
        clearTimeout(timer)
      }

      this.noble.removeAllListeners('discover')
      try {
        await this.noble.stopScanningAsync()
        this.emitLog('info', 'Stopped Scanning for SwitchBot BLE devices.')
      } catch (e: any) {
        this.emitLog('error', `discover stopScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
      }

      return Object.values(peripherals)
    }

    return new Promise<SwitchbotDevice[]>((resolve, reject) => {
      this.noble.on('discover', async (peripheral: Noble.Peripheral) => {
        const device = await this.getDeviceObject(peripheral, p.id, p.model)
        if (!device) {
          return
        }
        peripherals[device.id!] = device

        if (this.ondiscover && typeof this.ondiscover === 'function') {
          this.ondiscover(device)
        }

        if (p.quick) {
          resolve(await finishDiscovery())
        }
      })

      this.noble.startScanningAsync(PRIMARY_SERVICE_UUID_LIST, false)
        .then(() => {
          timer = setTimeout(async () => {
            resolve(await finishDiscovery())
          }, p.duration)
        })
        .catch((error: Error) => {
          reject(error)
        })
    })
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
          default:
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
    await this.ready
    await this.validateParams(params, {
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
    })

    await this._init()

    if (this.noble === null) {
      throw new Error('noble object failed to initialize')
    }

    const p = {
      model: params.model || '',
      id: params.id || '',
    }

    this.noble.on('discover', async (peripheral: Noble.Peripheral) => {
      const ad = await Advertising.parse(peripheral, this.emitLog.bind(this))
      if (ad && await this.filterAdvertising(ad, p.id, p.model)) {
        if (this.onadvertisement && typeof this.onadvertisement === 'function') {
          this.onadvertisement(ad)
        }
      }
    })

    try {
      await this.noble.startScanningAsync(PRIMARY_SERVICE_UUID_LIST, true)
      this.emitLog('info', 'Started Scanning for SwitchBot BLE devices.')
    } catch (e: any) {
      this.emitLog('error', `startScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
    }
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
    try {
      await this.noble.stopScanningAsync()
      this.emitLog('info', 'Stopped Scanning for SwitchBot BLE devices.')
    } catch (e: any) {
      this.emitLog('error', `stopScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
    }
  }

  /**
   * Waits for the specified time.
   *
   * @param {number} msec - The time to wait in milliseconds.
   * @returns {Promise<void>} - Resolves after the specified time.
   */
  async wait(msec: number): Promise<void> {
    if (typeof msec !== 'number' || msec < 0) {
      throw new Error('Invalid parameter: msec must be a non-negative integer.')
    }

    return new Promise((resolve) => {
      setTimeout(resolve, msec)
    })
  }
}

export { SwitchbotDevice }
