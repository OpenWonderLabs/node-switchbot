import parameterChecker from 'parameter-checker.js';
import switchbotAdvertising from './advertising.js';
import SwitchbotDevice from './device.js';

import SwitchbotDeviceWoHand from './device/wohand.js';
import SwitchbotDeviceWoCurtain from './device/wocurtain.js';
import SwitchbotDeviceWoBlindTilt from './device/woblindtilt.js';
import SwitchbotDeviceWoPresence from './device/wopresence.js';
import SwitchbotDeviceWoContact from './device/wocontact.js';
import SwitchbotDeviceWoSensorTH from './device/wosensorth.js';
import SwitchbotDeviceWoIOSensorTH from './device/woiosensorth.js';
import SwitchbotDeviceWoHumi from './device/wohumi.js';
import SwitchbotDeviceWoPlugMini from './device/woplugmini.js';
import SwitchbotDeviceWoBulb from './device/wobulb.js';
import SwitchbotDeviceWoStrip from './device/wostrip.js';

type params = {
    duration?: number,
    model?: string,
    id?: string,
    quick?: false,
    noble?: any,
}

type peripherals = {
    addr?: string,
    id?: string,
}

export class SwitchBot {
  noble;
  ondiscover;
  onadvertisement;
  onlog;
  scanning;
  DEFAULT_DISCOVERY_DURATION;
  PRIMARY_SERVICE_UUID_LIST;
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


  constructor(params: params = {}) {
    // Check parameters
    let noble = null;
    if (params && params.noble) {
      noble = params.noble;
    } else {
      noble = require('@abandonware/noble');
    }

    // Public properties
    this.noble = noble;
    this.ondiscover = null;
    this.onadvertisement = null;
    this.onlog = null;

    // Private properties
    this.scanning = false;
    this.DEFAULT_DISCOVERY_DURATION = 5000;
    this.PRIMARY_SERVICE_UUID_LIST = [];
  }

  /* ------------------------------------------------------------------
       * discover([params])
       * - Discover switchbot devices
       *
       * [Arguments]
       * - params     | Object  | Optional |
       *   - duration | Integer | Optional | Duration for discovery process (msec).
       *              |         |          | The value must be in the range of 1 to 60000.
       *              |         |          | The default value is 5000 (msec).
       *   - model    | String  | Optional | "H", "T", "e", "s", "d", "c", "{", "u", "g", "o", "i", or "r".
       *              |         |          | If "H" is specified, this method will discover only Bots.
       *              |         |          | If "T" is specified, this method will discover only Meters.
       *              |         |          | If "e" is specified, this method will discover only Humidifiers.
       *              |         |          | If "s" is specified, this method will discover only Motion Sensors.
       *              |         |          | If "d" is specified, this method will discover only Contact Sensors.
       *              |         |          | If "c" is specified, this method will discover only Curtains.
       *              |         |          | If "{" is specified, this method will discover only Curtain 3.
       *              |         |          | If "u" is specified, this method will discover only Color Bulbs.
       *              |         |          | If "g" is specified, this method will discover only Plugs.
       *              |         |          | If "o" is specified, this method will discover only Locks.
       *              |         |          | If "i" is specified, this method will discover only Meter Pluses.
       *              |         |          | If "r" is specified, this method will discover only Locks.
       *   - id       | String  | Optional | If this value is set, this method will discover
       *              |         |          | only a device whose ID is as same as this value.
       *              |         |          | The ID is identical to the MAC address.
       *              |         |          | This parameter is case-insensitive, and
       *              |         |          | colons are ignored.
       *   - quick    | Boolean | Optional | If this value is true, this method finishes
       *              |         |          | the discovery process when the first device
       *              |         |          | is found, then calls the resolve() function
       *              |         |          | without waiting the specified duration.
       *              |         |          | The default value is false.
       *
       * [Return value]
       * - Promise object
       *   An array will be passed to the `resolve()`, which includes
       *   `SwitchbotDevice` objects representing the found devices.
       * ---------------------------------------------------------------- */
  discover(params: params = {}) {
    const promise = new Promise((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        params,
        {
          duration: { required: false, type: 'integer', min: 1, max: 60000 },
          model: {
            required: false,
            type: 'string',
            enum: [
              'H',
              'T',
              'e',
              's',
              'd',
              'c',
              '{',
              'u',
              'g',
              'j',
              'o',
              'i',
              'r',
              'x',
              'w',
            ],
          },
          id: { required: false, type: 'string', min: 12, max: 17 },
          quick: { required: false, type: 'boolean' },
        },
        false,
      );

      if (!valid) {
        reject(new Error(parameterChecker.error.message));
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
          const peripherals: peripherals = {};
          let timer: NodeJS.Timeout = setTimeout(() => {}, 0);
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
            if (device_list.length) {
              resolve(device_list);
            }
          };

          // Set a handler for the 'discover' event
          this.noble.on('discover', (peripheral) => {
            const device = this._getDeviceObject(peripheral, p.id, p.model) as SwitchbotDevice;
            if (!device) {
              return;
            }
            const id = device.id;
            peripherals[id] = device;

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
            (error) => {
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

  _init() {
    const promise = new Promise<void>((resolve, reject) => {
      let err;
      if (this.noble.state === 'poweredOn') {
        resolve();
        return;
      }
      this.noble.once('stateChange', state => {
        switch (state) {
          case 'unsupported':
          case 'unauthorized':
          case 'poweredOff':
            err = new Error(
              'Failed to initialize the Noble object: ' + this.noble.state,
            );
            reject(err);
            return;
          case 'resetting':
          case 'unknown':
            err = new Error(
              'Adapter is not ready: ' + this.noble.state,
            );
            reject(err);
            return;
          case 'poweredOn':
            resolve();
            return;
          default:
            err = new Error(
              'Uknown state: ' + this.noble.state,
            );
            reject(err);
            return;
        }
      });
    });
    return promise;
  }

  _getDeviceObject(peripheral, id, model) {
    const ad = switchbotAdvertising.parse(peripheral, this.onlog);
    if (this._filterAdvertising(ad, id, model)) {
      let device = null;
      switch (ad.serviceData.model) {
        case 'H':
          device = new SwitchbotDeviceWoHand(peripheral, this.noble);
          break;
        case 'T':
          device = new SwitchbotDeviceWoSensorTH(peripheral, this.noble);
          break;
        case 'e':
          device = new SwitchbotDeviceWoHumi(peripheral, this.noble);
          break;
        case 's':
          device = new SwitchbotDeviceWoPresence(peripheral, this.noble);
          break;
        case 'd':
          device = new SwitchbotDeviceWoContact(peripheral, this.noble);
          break;
        case 'c':
        case '{':
          device = new SwitchbotDeviceWoCurtain(peripheral, this.noble);
          break;
        case 'x':
          device = new SwitchbotDeviceWoBlindTilt(peripheral, this.noble);
          break;
        case 'u':
          device = new SwitchbotDeviceWoBulb(peripheral, this.noble);
          break;
        case 'g':
        case 'j':
          device = new SwitchbotDeviceWoPlugMini(peripheral, this.noble);
          break;
        case 'o':
          //device = new SwitchbotDeviceWoSmartLock(peripheral, this.noble);
          break;
        case 'i':
          device = new SwitchbotDeviceWoSensorTH(peripheral, this.noble);
          break;
        case 'w':
          device = new SwitchbotDeviceWoIOSensorTH(peripheral, this.noble);
          break;
        case 'r':
          device = new SwitchbotDeviceWoStrip(peripheral, this.noble);
          break;
        default: // 'resetting', 'unknown'
          device = new SwitchbotDevice(peripheral, this.noble);
      }
      return device;
    } else {
      return null;
    }
  }

  _filterAdvertising(ad, id, model) {
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
  startScan(params) {
    const promise = new Promise<void>((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        params,
        {
          model: {
            required: false,
            type: 'string',
            enum: [
              'H',
              'T',
              'e',
              's',
              'd',
              'c',
              '{',
              'u',
              'g',
              'j',
              'o',
              'i',
              'r',
              'x',
              'w',
            ],
          },
          id: { required: false, type: 'string', min: 12, max: 17 },
        },
        false,
      );
      if (!valid) {
        reject(new Error(parameterChecker.error.message));
        return;
      }

      if (!params) {
        params = {};
      }

      // Initialize the noble object
      this._init()
        .then(() => {
          // Determine the values of the parameters
          const p = {
            model: params.model || '',
            id: params.id || '',
          };

          // Set a handler for the 'discover' event
          this.noble.on('discover', (peripheral) => {
            const ad = switchbotAdvertising.parse(peripheral, this.onlog);
            if (this._filterAdvertising(ad, p.id, p.model)) {
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
            (error) => {
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

  /* ------------------------------------------------------------------
     * stopScan()
     * - Stop to monitor advertising packets coming from switchbot devices
     *
     * [Arguments]
     * - none
     *
     * [Return value]
     * - none
     * ---------------------------------------------------------------- */
  stopScan() {
    this.noble.removeAllListeners('discover');
    this.noble.stopScanning();
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
  wait(msec) {
    return new Promise((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        { msec: msec },
        {
          msec: { required: true, type: 'integer', min: 0 },
        },
      );

      if (!valid) {
        reject(new Error(parameterChecker.error.message));
        return;
      }
      // Set a timer
      setTimeout(resolve, msec);
    });
  }
}

