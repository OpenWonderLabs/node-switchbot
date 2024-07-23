/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * switchbot.ts: Switchbot BLE API registration.
 */
import Noble from '@stoprocent/noble';
import { parameterChecker } from './parameter-checker.js';
import { Advertising } from './advertising.js';
import { SwitchbotDevice } from './device.js';

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

export class SwitchBot {
  private ready: Promise<void>;
  noble!: typeof Noble;
  ondiscover?: (device: SwitchbotDevice) => void;
  onadvertisement?: (ad: Ad) => void;
  onlog: ((message: string) => void) | undefined;
  DEFAULT_DISCOVERY_DURATION = 5000;
  PRIMARY_SERVICE_UUID_LIST = [];
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
    this.ready = this.init(params);
  }

  // Check parameters
  async init(params?: Params) {
    let noble: typeof Noble;
    if (params && params.noble) {
      noble = params.noble;
    } else {
      noble = (await import('@stoprocent/noble')).default;
    }

    // Public properties
    this.noble = noble;
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
        params,
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
      );

      if (!valid) {
        reject(new Error(parameterChecker.error!.message));
        return;
      }

      if (!params) {
        params = {};
      }

      // Determine the values of the parameters
      const p = {
        duration: params.duration || this.DEFAULT_DISCOVERY_DURATION,
        model: params.model || '',
        id: params.id || '',
        quick: params.quick ? true : false,
      };

      // Initialize the noble object
      this._init()
        .then(() => {
          if (this.noble === null) {
            return reject(new Error('noble failed to initialize'));
          }
          const peripherals: Record<string, SwitchbotDevice> = {};
          let timer: NodeJS.Timeout = setTimeout(() => { }, 0);
          const finishDiscovery = () => {
            if (timer) {
              clearTimeout(timer);
            }

            this.noble.removeAllListeners('discover');
            this.noble.stopScanning();

            const device_list: SwitchbotDevice[] = [];
            for (const addr in peripherals) {
              device_list.push(peripherals[addr]);
            }

            resolve(device_list);
          };

          // Set a handler for the 'discover' event
          this.noble.on('discover', (peripheral: Noble.Peripheral) => {
            const device = this.getDeviceObject(peripheral, p.id, p.model);
            if (!device) {
              return;
            }
            const id = device.id;
            peripherals[id!] = device;

            if (this.ondiscover && typeof this.ondiscover === 'function') {
              this.ondiscover(device);
            }

            if (p.quick) {
              finishDiscovery();
              return;
            }
          });
          // Start scanning
          this.noble.startScanning(
            this.PRIMARY_SERVICE_UUID_LIST,
            false,
            (error?: Error) => {
              if (error) {
                reject(error);
                return;
              }
              timer = setTimeout(() => {
                finishDiscovery();
              }, p.duration);
            },
          );
        })
        .catch((error) => {
          reject(error);
        });
    });
    return promise;
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
   */
  async discoverAsync(params: Params = {}): Promise<SwitchbotDevice[]> {
    // Check the parameters
    const valid = parameterChecker.check(
      params,
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
    );

    if (!valid) {
      throw new Error(parameterChecker.error!.message);
    }

    // Ensure params is not null
    params = params || {};

    // Determine the values of the parameters
    const p = {
      duration: params.duration || this.DEFAULT_DISCOVERY_DURATION,
      model: params.model || '',
      id: params.id || '',
      quick: !!params.quick,
    };

    // Initialize the noble object
    await this._initAsync();

    if (this.noble === null) {
      throw new Error('noble failed to initialize');
    }

    const peripherals: Record<string, SwitchbotDevice> = {};

    // Define a function to finish discovery
    const finishDiscovery = (): SwitchbotDevice[] => {
      this.noble.removeAllListeners('discover');
      this.noble.stopScanningAsync();

      return Object.values(peripherals);
    };

    // Start scanning with a promise to handle completion
    return new Promise<SwitchbotDevice[]>(async (resolve, reject) => {
      this.noble.on('discover', (peripheral: Noble.Peripheral) => {
        const device = this.getDeviceObject(peripheral, p.id, p.model);
        if (!device) {
          return;
        }

        peripherals[device.id!] = device;

        if (this.ondiscover && typeof this.ondiscover === 'function') {
          this.ondiscover(device);
        }

        if (p.quick) {
          await finishDiscovery());
      return;
    }
      });

      await this.noble.startScanningAsync(this.PRIMARY_SERVICE_UUID_LIST, false);
    });
  }

  /**
  * @deprecated since version 2.4.0 Will be removed in version 3.0.0. Use _initAsync() instead.
  */
  async _init() {
  await this.ready;
  const promise = new Promise<void>((resolve, reject) => {
    let err;
    if (this.noble._state === 'poweredOn') {
      resolve();
      return;
    }
    this.noble.once('stateChange', (state: typeof Noble._state) => {
      switch (state) {
        case 'unsupported':
        case 'unauthorized':
        case 'poweredOff':
          err = new Error(
            'Failed to initialize the Noble object: ' + this.noble._state,
          );
          reject(err);
          return;
        case 'resetting':
        case 'unknown':
          err = new Error(
            'Adapter is not ready: ' + this.noble._state,
          );
          reject(err);
          return;
        case 'poweredOn':
          resolve();
          return;
        default:
          err = new Error(
            'Unknown state: ' + this.noble._state,
          );
          reject(err);
          return;
      }
    });
  });
  return promise;
}

  /**
   * Asynchronously evaluates if an advertising packet from a BLE device meets specific criteria.
   * This function is designed to parse and analyze the content of the advertising packet,
   * such as device ID, model type, and other relevant data, to determine if the device matches
   * the search parameters set for a SwitchBot discovery operation.
   *
   * @returns A Promise that resolves to a boolean indicating whether the advertising packet meets the specified criteria.
   */
  async _initAsync() {
  await this.ready;
  if (this.noble._state === 'poweredOn') {
    return;
  }
  this.noble.once('stateChange', (state: typeof Noble._state) => {
    switch (state) {
      case 'unsupported':
      case 'unauthorized':
      case 'poweredOff':
        throw new Error('Failed to initialize the Noble object: ' + this.noble._state);
      case 'resetting':
      case 'unknown':
        throw new Error('Adapter is not ready: ' + this.noble._state);
      case 'poweredOn':
        return;
      default:
        throw new Error('Unknown state: ' + this.noble._state);
    }
  });
}

/**
* @deprecated since version 2.4.0 Will be removed in version 3.0.0. Use getDeviceObjectAsync() instead.
*/
getDeviceObject(peripheral: Noble.Peripheral, id: string, model: string) {
  const ad: any = Advertising.parse(peripheral, this.onlog);
  if (!this.filterAdvertising(ad, id, model)) {
    return null;
  }

  const modelConstructorMap = {
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
  };

  // Assuming SwitchBotBLEModel is an enum or a set of string literals that matches the keys of modelConstructorMap
  if (ad && ad.serviceData && typeof ad.serviceData.model === 'string') {
    // Type assertion to narrow down the type of ad.serviceData.model
    const modelKey = ad.serviceData.model as keyof typeof modelConstructorMap;

    // Type guard to check if modelKey is actually a key of modelConstructorMap
    if (modelKey in modelConstructorMap) {
      const Constructor = modelConstructorMap[modelKey] || SwitchbotDevice;
      return new Constructor(peripheral, this.noble);
    }
  }

  return null;
}

  /**
   * Asynchronously filters advertising packets from BLE devices.
   * This function is designed to identify Switchbot devices that match specific criteria,
   * such as device ID or model, within a BLE environment where multiple devices may be present.
   *
   * @param ad The advertising packet received from a BLE device.
   * @param id The specific device ID to match against the advertising packet. This parameter is optional.
   * @param model The model type to match against the advertising packet. This parameter is optional.
   * @returns A Promise that resolves to a boolean indicating whether the advertising packet meets the specified criteria.
  */
  async getDeviceObjectAsync(peripheral: Noble.Peripheral, id: string, model: string): Promise < any > {
  const ad: any = Advertising.parse(peripheral, this.onlog);
  if(!await this.filterAdvertisingAsync(ad, id, model)) {
  return null;
}

const modelConstructorMap = {
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
};

if (ad && ad.serviceData && typeof ad.serviceData.model === 'string') {
  const modelKey = ad.serviceData.model as keyof typeof modelConstructorMap;
  if (modelKey in modelConstructorMap) {
    const Constructor = modelConstructorMap[modelKey] || SwitchbotDevice;
    return new Constructor(peripheral, this.noble);
  }
}

return null;
  }

/**
* @deprecated since version 2.4.0 Will be removed in version 3.0.0. Use filterAdvertisingAsync() instead.
*/
filterAdvertising(ad: Ad, id: string, model: string) {
  if (!ad) {
    return false;
  }
  if (id) {
    id = id.toLowerCase().replace(/:/g, '');
    const ad_id = ad.address.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ad_id !== id) {
      return false;
    }
  }
  if (model) {
    if (ad.serviceData.model !== model) {
      return false;
    }
  }
  return true;
}

  /**
   * Asynchronously filters advertising packets from BLE devices.
   * This function is designed to identify Switchbot devices that match specific criteria,
   * such as device ID or model, within a BLE environment where multiple devices may be present.
   *
   * @param ad The advertising packet received from a BLE device.
   * @param id The specific device ID to match against the advertising packet. This parameter is optional.
   * @param model The model type to match against the advertising packet. This parameter is optional.
   * @returns A Promise that resolves to a boolean indicating whether the advertising packet meets the specified criteria.
  */
  async filterAdvertisingAsync(ad: Ad, id: string, model: string): Promise < boolean > {
  if(!ad) {
    return false;
  }
    if(id) {
    id = id.toLowerCase().replace(/:/g, '');
    const ad_id = ad.address.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ad_id !== id) {
      return false;
    }
  }
    if(model) {
    if (ad.serviceData.model !== model) {
      return false;
    }
  }
    return true;
}

/**
 * Initiates monitoring of advertising packets from Switchbot devices.
 *
 * This function starts listening for advertising packets emitted by various Switchbot devices.
 * It can be configured to listen for packets from specific types of devices by specifying the `model` parameter.
 * The `onadvertisement` event handler is invoked for packets that match the specified criteria.
 *
 * @param params An optional object containing the following properties:
 *  - `model`: A string indicating the type of device to listen for. Each character represents a different device type:
 *    - "H": Bot
 *    - "T": Meter
 *    - "e": Humidifier
 *    - "s": Motion Sensor
 *    - "d": Contact Sensor
 *    - "c": Curtain
 *    - "{": Curtain 3
 *    - "x": BlindTilt
 *    - "u": Color Bulb
 *    - "g": Plug Mini
 *    - "o": Smart Lock
 *    - "$": Smart Lock Pro
 *    - "i": Meter Plus
 *    - "r": LED Strip Light
 *    The `onadvertisement` event handler is called only for the specified device types.
 *  - `id`: An optional string specifying the ID (MAC address) of the device to listen for.
 * The `onadvertisement` event handler is called only for devices with this ID. This parameter is case-insensitive and ignores colons.
 *
 * @returns A Promise that resolves when the monitoring process has been successfully initiated. The resolved value is not specified.
 *
 * @deprecated since version 2.4.0 Will be removed in version 3.0.0. Use startScanAsnyc() instead.
 */
startScan(params: Params = {}) {
  const promise = new Promise<void>((resolve, reject) => {
    // Check the parameters
    const valid = parameterChecker.check(
      params,
      {
        model: {
          required: false,
          type: 'string',
          enum: Object.values(SwitchBotBLEModel),
        },
        id: { required: false, type: 'string', min: 12, max: 17 },
      },
      false,
    );
    if (!valid) {
      reject(new Error(parameterChecker.error!.message));
      return;
    }

    // Initialize the noble object
    this._init()
      .then(() => {
        if (this.noble === null) {
          return reject(new Error('noble object failed to initialize'));
        }
        // Determine the values of the parameters
        const p = {
          model: params.model || '',
          id: params.id || '',
        };

        // Set a handler for the 'discover' event
        this.noble.on('discover', (peripheral: Noble.Peripheral) => {
          const ad = Advertising.parse(peripheral, this.onlog);
          if (this.filterAdvertising(ad, p.id, p.model)) {
            if (
              this.onadvertisement &&
              typeof this.onadvertisement === 'function'
            ) {
              this.onadvertisement(ad);
            }
          }
        });

        // Start scanning
        this.noble.startScanning(
          this.PRIMARY_SERVICE_UUID_LIST,
          true,
          (error?: Error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          },
        );
      })
      .catch((error) => {
        reject(error);
      });
  });
  return promise;
}

  /**
   * Begins the process of scanning for Switchbot device advertisements.
   *
   * This asynchronous function initiates the scanning for Bluetooth Low Energy (BLE)
   * advertisements broadcasted by Switchbot devices. Users can filter the devices they
   * are interested in by specifying device types through the `model` parameter or target
   * a specific device using its ID with the `id` parameter. When a device matching the
   * criteria is found, the `onadvertisement` event handler is triggered, providing details
   * about the discovered device.
   *
   * @param params An object with optional properties to customize the scan:
   *  - `model`: Specifies the types of Switchbot devices to listen for. Each character in
   *    the string corresponds to a different device type, allowing for a fine-grained control
   *    over which advertisements are considered relevant. The available device types are:
   *    - "H": Bot
   *    - "T": Meter
   *    - "e": Humidifier
   *    - "s": Motion Sensor
   *    - "d": Contact Sensor
   *    - "c": Curtain
   *    - "{": Curtain 3
   *    - "x": BlindTilt
   *    - "u": Color Bulb
   *    - "g": Plug Mini
   *    - "o": Smart Lock
   *    - "$": Smart Lock Pro
   *    - "i": Meter Plus
   *    - "r": LED Strip Light
   *    This parameter allows the application to only process advertisements from the
   *    specified types of devices.
   *  - `id`: Targets a specific device by its ID (MAC address). This allows the application
   *    to listen for advertisements from a particular device, ignoring all others. The ID
   *    matching is case-insensitive and does not consider colon characters.
   *
   * @returns A Promise that resolves once the scan has been successfully started,
   * enabling the application to begin receiving advertisements from matching Switchbot devices.
   */
  async startScanAsync(params: Params = {}): Promise < void> {
  // Check the parameters
  const valid = parameterChecker.check(
    params,
    {
      model: {
        required: false,
        type: 'string',
        enum: Object.values(SwitchBotBLEModel),
      },
      id: { required: false, type: 'string', min: 12, max: 17 },
    },
    false,
  );
  if(!valid) {
    throw new Error(parameterChecker.error!.message);
  }

    // Initialize the noble object
    await this._initAsync();
  if(this.noble === null) {
  throw new Error('noble object failed to initialize');
}
// Determine the values of the parameters
const p = {
  model: params.model || '',
  id: params.id || '',
};

this.noble.on('stateChange', async (state) => {
  if (state === 'poweredOn') {
    await this.noble.startScanningAsync(this.PRIMARY_SERVICE_UUID_LIST, true);
  }
});

// Set a handler for the 'discover' event
this.noble.on('discover', async (peripheral) => {
  const ad = Advertising.parse(peripheral, this.onlog);
  if (await this.filterAdvertisingAsync(ad, p.id, p.model)) {
    if (
      this.onadvertisement &&
      typeof this.onadvertisement === 'function'
    ) {
      this.onadvertisement(ad);
    }
  }
});
  }

/**
 * stopScan(): stops to monitor advertising packets coming from Switchbot devices.
 * Arguments: none
 * @returns void
* @deprecated since version 2.4.0 Will be removed in version 3.0.0. Use stopScanAsnyc() instead.
*/
stopScan(): void {
  if(this.noble === null) {
  return;
}

this.noble.removeAllListeners('discover');
this.noble.stopScanning();
  }


  /**
  * Stops the scanning process for Switchbot devices asynchronously.
  *
  * This function halts the ongoing search for Switchbot devices by stopping the scan.
  * It's useful for conserving resources or when the application no longer needs to discover new devices.
  * The function returns a Promise that resolves once the scanning process has successfully stopped,
  * indicating that the device is no longer listening for signals from Switchbot devices.
  *
  * @returns A Promise that resolves when the scanning process has been successfully stopped.
  */
  async stopScanAsync(): Promise < void> {
  if(this.noble === null) {
  return;
}

this.noble.removeAllListeners('discover');
this.noble.stopScanningAsync();
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
/**
* @deprecated since version 2.4.0 Will be removed in version 3.0.0. Use waitAsync() instead.
*/
wait(msec: number) {
  return new Promise((resolve, reject) => {
    // Check the parameters
    const valid = parameterChecker.check(
      { msec: msec },
      {
        msec: { required: true, type: 'integer', min: 0 },
      },
      true, // Add the required argument
    );

    if (!valid) {
      reject(new Error(parameterChecker.error!.message));
      return;
    }
    // Set a timer
    setTimeout(resolve, msec);
  });
}

  /**
   * Pauses execution for a specified duration.
   *
   * @param msec The duration to wait in milliseconds. Must be a non-negative integer.
   * @throws {Error} If `msec` is not a valid non-negative integer.
   */
  async waitAsync(msec: number): Promise < void> {
  // Check the parameters
  const valid = parameterChecker.check({ msec: msec }, { msec: { required: true, type: 'integer', min: 0 } }, true);

  if(!valid) {
    throw new Error(parameterChecker.error!.message);
  }

    // Set a timer
    await new Promise(resolve => setTimeout(resolve, msec));
}
}

export { SwitchbotDevice };