/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot.ts: Switchbot BLE API registration.
 */
import type { ad, NobleTypes, onadvertisement, ondiscover, Params, Rule } from './device.js'

import { EventEmitter } from 'node:events'

import { Advertising, LogLevel, SwitchBotBLEModel, SwitchbotDevice, WoBlindTilt, WoBulb, WoCeilingLight, WoContact, WoCurtain, WoHand, WoHub2, WoHumi, WoHumi2, WoIOSensorTH, WoKeypad, WoLeak, WoPlugMiniJP, WoPlugMiniUS, WoPresence, WoRelaySwitch1, WoRelaySwitch1PM, WoRemote, WoSensorTH, WoSensorTHPlus, WoSensorTHPro, WoSensorTHProCO2, WoSmartLock, WoSmartLockPro, WoSmartLockUltra, WoStrip } from './device.js'
import { parameterChecker } from './parameter-checker.js'
import { DEFAULT_DISCOVERY_DURATION, PRIMARY_SERVICE_UUID_LIST } from './settings.js'

/**
 * SwitchBotBLE class to interact with SwitchBot devices.
 */
export class SwitchBotBLE extends EventEmitter {
  public nobleInitialized: Promise<void>
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
    this.nobleInitialized = this.initialize(params)
  }

  /**
   * Emits a log event with the specified log level and message.
   *
   * @param level - The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message - The log message to be emitted.
   */
  /**
   * Emits a log event with a defined LogLevel.
   */
  public log(level: LogLevel, message: string): void {
    // Emit log events asynchronously with level and message as separate args
    setTimeout(() => this.emit('log', { level, message }), 0)
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

      try {
        await this.noble.waitForPoweredOnAsync()
        this.log(LogLevel.DEBUG, 'Noble powered on')
      } catch (e: any) {
        this.log(LogLevel.ERROR, `Failed waiting for powered on: ${JSON.stringify(e.message ?? e)}`)
      }
    } catch (e: any) {
      this.log(LogLevel.ERROR, `Failed to import noble: ${JSON.stringify(e.message ?? e)}`)
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
      this.log(LogLevel.ERROR, `parameterChecker: ${JSON.stringify(parameterChecker.error!.message)}`)
      throw new Error(parameterChecker.error!.message)
    }
  }

  /**
   * Discovers Switchbot devices with enhanced error handling and logging.
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

    if (!this.noble) {
      throw new Error('Noble BLE library failed to initialize properly')
    }

    const p = {
      duration: params.duration ?? DEFAULT_DISCOVERY_DURATION,
      model: params.model as SwitchBotBLEModel ?? '',
      id: params.id ?? '',
      quick: !!params.quick,
    }

    this.log(LogLevel.DEBUG, `Starting discovery with parameters: ${JSON.stringify(p)}`)

    const peripherals: Record<string, SwitchbotDevice> = {}
    let timer: NodeJS.Timeout
    let isDiscoveryActive = true

    const finishDiscovery = async () => {
      if (!isDiscoveryActive) {
        return Object.values(peripherals)
      }

      isDiscoveryActive = false
      if (timer) {
        clearTimeout(timer)
      }
      if (this.noble) {
        this.noble.removeAllListeners('discover')
        try {
          await this.noble.stopScanningAsync()
          this.log(LogLevel.DEBUG, 'Successfully stopped scanning for SwitchBot BLE devices')
        } catch (e: any) {
          this.log(LogLevel.ERROR, `Failed to stop scanning: ${JSON.stringify(e.message ?? e)}`)
        }
      }

      const devices = Object.values(peripherals)
      const deviceCount = devices.length
      this.log(
        deviceCount > 0 ? LogLevel.INFO : LogLevel.WARN,
        `Discovery completed. Found ${deviceCount} device${deviceCount !== 1 ? 's' : ''}`,
      )

      return devices
    }

    return new Promise<SwitchbotDevice[]>((resolve, reject) => {
      this.noble.on('discover', async (peripheral: NobleTypes['peripheral']) => {
        try {
          const device = await this.createDevice(peripheral, p.id, p.model as SwitchBotBLEModel)
          if (!device) {
            return
          }

          if (peripherals[device.id!]) {
            this.log(LogLevel.DEBUG, `Device ${device.id} already discovered, skipping duplicate`)
            return
          }

          peripherals[device.id!] = device
          this.log(LogLevel.DEBUG, `Discovered device: ${device.friendlyName} (${device.id}) at ${device.address}`)

          if (this.ondiscover) {
            try {
              await this.ondiscover(device)
            } catch (e: any) {
              this.log(LogLevel.ERROR, `Error in ondiscover callback: ${e.message ?? e}`)
            }
          }

          if (p.quick) {
            this.log(LogLevel.DEBUG, 'Quick discovery mode: stopping after first device found')
            resolve(await finishDiscovery())
          }
        } catch (e: any) {
          this.log(LogLevel.ERROR, `Error processing discovered device: ${e.message ?? e}`)
        }
      })

      // Start scanning with timeout handling
      this.noble.startScanningAsync(PRIMARY_SERVICE_UUID_LIST, false)
        .then(() => {
          this.log(LogLevel.DEBUG, `Started scanning for ${p.duration}ms`)
          timer = setTimeout(async () => {
            const result = await finishDiscovery()
            if (result.length === 0) {
              reject(new Error(`No SwitchBot devices found after ${p.duration}ms discovery timeout`))
            } else {
              resolve(result)
            }
          }, p.duration)
        })
        .catch((error) => {
          this.log(LogLevel.ERROR, `Failed to start scanning: ${error.message ?? error}`)
          reject(new Error(`Failed to start BLE scanning: ${error.message ?? error}`))
        })
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
    const ad = await Advertising.parse(peripheral, (level: string, message: string) => this.log(level as LogLevel, message))
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
        case SwitchBotBLEModel.PresenceSensor: return new WoPresence(peripheral, this.noble)
        case SwitchBotBLEModel.ContactSensor: return new WoContact(peripheral, this.noble)
        case SwitchBotBLEModel.Remote: return new WoRemote(peripheral, this.noble)
        case SwitchBotBLEModel.ColorBulb: return new WoBulb(peripheral, this.noble)
        case SwitchBotBLEModel.CeilingLight:
        case SwitchBotBLEModel.CeilingLightPro: return new WoCeilingLight(peripheral, this.noble)
        case SwitchBotBLEModel.StripLight: return new WoStrip(peripheral, this.noble)
        case SwitchBotBLEModel.Leak: return new WoLeak(peripheral, this.noble)
        case SwitchBotBLEModel.PlugMiniUS: return new WoPlugMiniUS(peripheral, this.noble)
        case SwitchBotBLEModel.PlugMiniJP: return new WoPlugMiniJP(peripheral, this.noble)
        case SwitchBotBLEModel.Lock: return new WoSmartLock(peripheral, this.noble)
        case SwitchBotBLEModel.LockPro: return new WoSmartLockPro(peripheral, this.noble)
        case (SwitchBotBLEModel.LockUltra as any): return new WoSmartLockUltra(peripheral, this.noble)
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
    await this.nobleInitialized
    await this.validate(params, {
      model: { required: false, type: 'string', enum: Object.values(SwitchBotBLEModel) },
      id: { required: false, type: 'string', min: 12, max: 17 },
    })

    if (!this.noble) {
      throw new Error('noble object failed to initialize')
    }

    const p = { model: params.model || '', id: params.id || '' }

    this.noble.removeAllListeners('discover')

    this.noble.on('discover', async (peripheral: NobleTypes['peripheral']) => {
      try {
        const ad = await Advertising.parse(peripheral, (level: string, message: string) => this.log(level as LogLevel, message))
        this.log(LogLevel.DEBUG, `Advertisement: ${JSON.stringify(ad)}`)
        this.log(LogLevel.DEBUG, `Filter ID: ${p.id}`)
        this.log(LogLevel.DEBUG, `Filter Model: ${p.model}`)
        if (ad && await this.filterAd(ad, p.id, p.model)) {
          this.log(LogLevel.DEBUG, `Advertisement passed filter: ${JSON.stringify(ad)}`)
          if (this.onadvertisement) {
            try {
              await this.onadvertisement(ad)
            } catch (e: any) {
              this.log(LogLevel.ERROR, `Error in onadvertisement callback: ${e.message ?? e}`)
            }
          }
        }
      } catch (e: any) {
        this.log(LogLevel.ERROR, `Error parsing advertisement: ${e.message ?? e}`)
      }
    })

    try {
      await this.noble.startScanningAsync(PRIMARY_SERVICE_UUID_LIST, true)
      this.log(LogLevel.DEBUG, 'Started Scanning for SwitchBot BLE devices.')
    } catch (e: any) {
      this.log(LogLevel.ERROR, `startScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
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
      this.log(LogLevel.DEBUG, 'Stopped Scanning for SwitchBot BLE devices.')
    } catch (e: any) {
      this.log(LogLevel.ERROR, `stopScanningAsync error: ${JSON.stringify(e.message ?? e)}`)
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

export { LogLevel, SwitchbotDevice }
