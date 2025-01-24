/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot.ts: Switchbot BLE API registration.
 */
import type { ad, NobleTypes, onadvertisement, ondiscover, Params, Rule } from './types/types.js'

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
import { WoHumi2 } from './device/wohumi2.js'
import { WoHumi } from './device/wohumi.js'
import { WoIOSensorTH } from './device/woiosensorth.js'
import { WoKeypad } from './device/wokeypad.js'
import { WoLeak } from './device/woleak.js'
import { WoPlugMiniUS } from './device/woplugmini.js'
import { WoPlugMiniJP } from './device/woplugmini_jp.js'
import { WoPresence } from './device/wopresence.js'
import { WoRelaySwitch1 } from './device/worelayswitch1.js'
import { WoRelaySwitch1PM } from './device/worelayswitch1pm.js'
import { WoSensorTH } from './device/wosensorth.js'
import { WoSensorTHPlus } from './device/wosensorthplus.js'
import { WoSensorTHPro } from './device/wosensorthpro.js'
import { WoSensorTHProCO2 } from './device/wosensorthproco2.js'
import { WoSmartLock } from './device/wosmartlock.js'
import { WoSmartLockPro } from './device/wosmartlockpro.js'
import { WoStrip } from './device/wostrip.js'
import { parameterChecker } from './parameter-checker.js'
import { DEFAULT_DISCOVERY_DURATION, PRIMARY_SERVICE_UUID_LIST } from './settings.js'
import { SwitchBotBLEModel } from './types/types.js'

/**
 * SwitchBotBLE class to interact with SwitchBot devices.
 */
export class SwitchBotBLE extends EventEmitter {
  public ready: Promise<void>
  public noble: any
  ondiscover?: ondiscover
  onadvertisement?: onadvertisement

  /**
   * Constructor
   *
   * @param {Params} [params] - Optional parameters
   */
  constructor(params?: Params) {
    super()
    this.ready = this.initialize(params)
  }

  /**
   * Emits a log event with the specified log level and message.
   *
   * @param level - The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message - The log message to be emitted.
   */
  public async log(level: string, message: string): Promise<void> {
    this.emit('log', { level, message })
  }

  /**
   * Initializes the noble object.
   *
   * @param {Params} [params] - Optional parameters
   * @returns {Promise<void>} - Resolves when initialization is complete
   */
  private async initialize(params?: Params): Promise<void> {
    try {
      if (params && params.noble) {
        this.noble = params.noble
      } else {
        this.noble = (await import('@stoprocent/noble')).default
      }
    } catch (e: any) {
      this.log('error', `Failed to import noble: ${JSON.stringify(e.message ?? e)}`)
    }
  }

  /**
   * Validates the parameters.
   *
   * @param {Params} params - The parameters to validate.
   * @param {Record<string, unknown>} schema - The schema to validate against.
   * @returns {Promise<void>} - Resolves if parameters are valid, otherwise throws an error.
   */
  public async validate(params: Params, schema: Record<string, unknown>): Promise<void> {
    const valid = parameterChecker.check(params as Record<string, Rule>, schema as Record<string, Rule>, false)
    if (!valid) {
      this.log('error', `parameterChecker: ${JSON.stringify(parameterChecker.error!.message)}`)
      throw new Error(parameterChecker.error!.message)
    }
  }

  /**
   * Waits for the noble object to be powered on.
   *
   * @returns {Promise<void>} - Resolves when the noble object is powered on.
   */
  private async waitForPowerOn(): Promise<void> {
    await this.ready
    if (this.noble && this.noble._state === 'poweredOn') {
      return
    }

    return new Promise<void>((resolve, reject) => {
      this.noble?.once('stateChange', (state: NobleTypes['state']) => {
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
   * Discovers Switchbot devices.
   * @param params The discovery parameters.
   * @returns A Promise that resolves with an array of discovered Switchbot devices.
   */
  public async discover(params: Params = {}): Promise<SwitchbotDevice[]> {
    await this.initialize(params)
    await this.validate(params, {
      duration: { required: false, type: 'integer', min: 1, max: 60000 },
      model: { required: false, type: 'string', enum: Object.values(SwitchBotBLEModel) },
      id: { required: false, type: 'string', min: 12, max: 17 },
      quick: { required: false, type: 'boolean' },
    })

    await this.waitForPowerOn()

    if (!this.noble) {
      throw new Error('noble failed to initialize')
    }

    const p = {
      duration: params.duration ?? DEFAULT_DISCOVERY_DURATION,
      model: params.model as SwitchBotBLEModel ?? '',
      id: params.id ?? '',
      quick: !!params.quick,
    }

    const peripherals: Record<string, SwitchbotDevice> = {}
    let timer: NodeJS.Timeout

    const finishDiscovery = async () => {
      if (timer) {
        clearTimeout(timer)
      }
      if (this.noble) {
        this.noble.removeAllListeners('discover')
        try {
          await this.noble.stopScanningAsync()
          this.log('debug', 'Stopped Scanning for SwitchBot BLE devices.')
        } catch (e: any) {
          this.log('error', `discover stopScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
        }
      }
      const devices = Object.values(peripherals)
      if (devices.length === 0) {
        this.log('warn', 'No devices found during discovery.')
      }
      return devices
    }

    return new Promise<SwitchbotDevice[]>((resolve, reject) => {
      this.noble.on('discover', async (peripheral: NobleTypes['peripheral']) => {
        const device = await this.createDevice(peripheral, p.id, p.model as SwitchBotBLEModel)
        if (!device) {
          return
        }
        peripherals[device.id!] = device

        if (this.ondiscover) {
          this.ondiscover(device)
        }
        if (p.quick) {
          resolve(await finishDiscovery())
        }
      })

      this.noble.startScanningAsync(PRIMARY_SERVICE_UUID_LIST, false)
        .then(() => {
          timer = setTimeout(async () => {
            const result = await finishDiscovery()
            if (result.length === 0) {
              reject(new Error('No devices found during discovery.'))
            } else {
              resolve(result)
            }
          }, p.duration)
        })
        .catch(reject)
    })
  }

  /**
   * Creates a device object based on the peripheral, id, and model.
   *
   * @param {NobleTypes['peripheral']} peripheral - The peripheral object.
   * @param {string} id - The device id.
   * @param {string} model - The device model.
   * @returns {Promise<SwitchbotDevice | null>} - The device object or null.
   */
  private async createDevice(peripheral: NobleTypes['peripheral'], id: ad['id'], model: SwitchBotBLEModel): Promise<SwitchbotDevice | null> {
    const ad = await Advertising.parse(peripheral, this.log.bind(this))
    if (ad && await this.filterAd(ad, id, model) && this.noble) {
      switch (ad.serviceData.model) {
        case SwitchBotBLEModel.Bot: return new WoHand(peripheral, this.noble)
        case SwitchBotBLEModel.Curtain:
        case SwitchBotBLEModel.Curtain3: return new WoCurtain(peripheral, this.noble)
        case SwitchBotBLEModel.Humidifier: return new WoHumi(peripheral, this.noble)
        case SwitchBotBLEModel.Humidifier2: return new WoHumi2(peripheral, this.noble)
        case SwitchBotBLEModel.Meter: return new WoSensorTH(peripheral, this.noble)
        case SwitchBotBLEModel.MeterPlus: return new WoSensorTHPlus(peripheral, this.noble)
        case SwitchBotBLEModel.MeterPro: return new WoSensorTHPro(peripheral, this.noble)
        case SwitchBotBLEModel.MeterProCO2: return new WoSensorTHProCO2(peripheral, this.noble)
        case SwitchBotBLEModel.Hub2: return new WoHub2(peripheral, this.noble)
        case SwitchBotBLEModel.OutdoorMeter: return new WoIOSensorTH(peripheral, this.noble)
        case SwitchBotBLEModel.MotionSensor: return new WoPresence(peripheral, this.noble)
        case SwitchBotBLEModel.ContactSensor: return new WoContact(peripheral, this.noble)
        case SwitchBotBLEModel.ColorBulb: return new WoBulb(peripheral, this.noble)
        case SwitchBotBLEModel.CeilingLight:
        case SwitchBotBLEModel.CeilingLightPro: return new WoCeilingLight(peripheral, this.noble)
        case SwitchBotBLEModel.StripLight: return new WoStrip(peripheral, this.noble)
        case SwitchBotBLEModel.Leak: return new WoLeak(peripheral, this.noble)
        case SwitchBotBLEModel.PlugMiniUS: return new WoPlugMiniUS(peripheral, this.noble)
        case SwitchBotBLEModel.PlugMiniJP: return new WoPlugMiniJP(peripheral, this.noble)
        case SwitchBotBLEModel.Lock: return new WoSmartLock(peripheral, this.noble)
        case SwitchBotBLEModel.LockPro: return new WoSmartLockPro(peripheral, this.noble)
        case SwitchBotBLEModel.BlindTilt: return new WoBlindTilt(peripheral, this.noble)
        case SwitchBotBLEModel.Keypad: return new WoKeypad(peripheral, this.noble)
        case SwitchBotBLEModel.RelaySwitch1: return new WoRelaySwitch1(peripheral, this.noble)
        case SwitchBotBLEModel.RelaySwitch1PM: return new WoRelaySwitch1PM(peripheral, this.noble)
        default: return new SwitchbotDevice(peripheral, this.noble)
      }
    }
    return null
  }

  /**
   * Filters advertising data based on id and model.
   *
   * @param {Ad} ad - The advertising data.
   * @param {string} id - The device id.
   * @param {string} model - The device model.
   * @returns {Promise<boolean>} - True if the advertising data matches the id and model, false otherwise.
   */
  private async filterAd(ad: ad, id: string, model: string): Promise<boolean> {
    if (!ad) {
      return false
    }
    if (id && ad.address.toLowerCase().replace(/[^a-z0-9]/g, '') !== id.toLowerCase().replace(/:/g, '')) {
      return false
    }
    if (model && ad.serviceData.model !== model) {
      return false
    }
    return true
  }

  /**
   * Starts scanning for SwitchBot devices.
   *
   * @param {Params} [params] - Optional parameters.
   * @returns {Promise<void>} - Resolves when scanning starts successfully.
   */
  public async startScan(params: Params = {}): Promise<void> {
    await this.ready
    await this.validate(params, {
      model: { required: false, type: 'string', enum: Object.values(SwitchBotBLEModel) },
      id: { required: false, type: 'string', min: 12, max: 17 },
    })

    await this.waitForPowerOn()

    if (!this.noble) {
      throw new Error('noble object failed to initialize')
    }

    const p = { model: params.model || '', id: params.id || '' }

    this.noble.on('discover', async (peripheral: NobleTypes['peripheral']) => {
      const ad = await Advertising.parse(peripheral, this.log.bind(this))
      this.emit('debug', `Advertisement: ${ad}`)
      this.emit('debug', `Filter ID: ${p.id}`)
      this.emit('debug', `Filter Model: ${p.model}`)
      if (ad && await this.filterAd(ad, p.id, p.model)) {
        this.emit('debug', `Advertisement passed filter: ${ad}`)
        if (this.onadvertisement) {
          this.onadvertisement(ad)
        }
      }
    })

    try {
      await this.noble.startScanningAsync(PRIMARY_SERVICE_UUID_LIST, true)
      this.log('debug', 'Started Scanning for SwitchBot BLE devices.')
    } catch (e: any) {
      this.log('error', `startScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
    }
  }

  /**
   * Stops scanning for SwitchBot devices.
   *
   * @returns {Promise<void>} - Resolves when scanning stops successfully.
   */
  public async stopScan(): Promise<void> {
    if (!this.noble) {
      return
    }

    this.noble.removeAllListeners('discover')
    try {
      await this.noble.stopScanningAsync()
      this.log('debug', 'Stopped Scanning for SwitchBot BLE devices.')
    } catch (e: any) {
      this.log('error', `stopScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
    }
  }

  /**
   * Waits for the specified time.
   *
   * @param {number} msec - The time to wait in milliseconds.
   * @returns {Promise<void>} - Resolves after the specified time.
   */
  public async wait(msec: number): Promise<void> {
    if (typeof msec !== 'number' || msec < 0) {
      throw new Error('Invalid parameter: msec must be a non-negative integer.')
    }

    return new Promise(resolve => setTimeout(resolve, msec))
  }
}

export { SwitchbotDevice }
