/* ------------------------------------------------------------------
* node-switchbot - switchbot.js
*
* Copyright (c) 2019, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2019-11-18
* ---------------------------------------------------------------- */
'use strict';
const parameterChecker = require('./parameter-checker.js');
const switchbotAdvertising = require('./switchbot-advertising.js');

const SwitchbotDevice = require('./switchbot-device.js');
const SwitchbotDeviceWoHand = require('./switchbot-device-wohand.js');
const SwitchbotDeviceWoSensorTH = require('./switchbot-device-wosensorth.js');
const SwitchbotDeviceWoCurtain = require('./switchbot-device-wocurtain.js');

class Switchbot {
  /* ------------------------------------------------------------------
  * Constructor
  *	
  * [Arguments]
  * - params  | Object  | Optional |
  *   - noble | Noble   | Optional | The Nobel object created by the noble module.
  *           |         |          | This parameter is optional.
  *           |         |          | If you don't specify this parameter, this
  *           |         |          | module automatically creates it.
  * ---------------------------------------------------------------- */
  constructor(params) {
    // Check parameters
    let noble = null;
    if (params && params.noble) {
      noble = params.noble;
    } else {
      noble = require('@abandonware/noble');
    }

    // Plublic properties
    this.noble = noble;
    this.ondiscover = null;
    this.onadvertisement = null;

    // Private properties
    this._initialized = false;
    this._scanning = false;
    this._DEFAULT_DISCOVERY_DURATION = 5000
    this._PRIMARY_SERVICE_UUID_LIST = ['cba20d00224d11e69fb80002a5d5c51b'];
  };

  /* ------------------------------------------------------------------
  * discover([params])
  * - Discover switchbot devices
  *
  * [Arguments]
  * - params     | Object  | Optional |
  *   - duration | Integer | Optional | Duration for discovery process (msec).
  *              |         |          | The value must be in the range of 1 to 60000.
  *              |         |          | The default value is 5000 (msec).
  *   - model    | String  | Optional | "H" or "T".
  *              |         |          | If "H" is specified, this method will discover
  *              |         |          | only Bots. If "T" is specified, this method
  *              |         |          | will discover only Meters.
  *   - address  | String  | Optional | If this value is set, this method will discover
  *              |         |          | only a device whose MAC address is as same as
  *              |         |          | this value.
  *              |         |          | This parameter is case-insensitive, colons
  *              |         |          | and hyphens are ignored.
  *   - quick    | Boolean | Optional | If this value is true, this method finishes
  *              |         |          | the discovery process when the first device
  *              |         |          | is found, then calls the resolve() function
  *              |         |          | without waiting the specified duration.
  *              |         |          | The default value is false.
  *
  * [Returen value]
  * - Promise object
  *   An array will be passed to the `resolve()`, which includes
  *   `SwitchbotDevice` objects representing the found devices.
  * ---------------------------------------------------------------- */
  discover(params = {}) {
    let promise = new Promise((resolve, reject) => {
      // Check the parameters
      let valid = parameterChecker.check(params, {
        duration: { required: false, type: 'integer', min: 1, max: 60000 },
        model: { required: false, type: 'string', enum: ['H', 'T', 'c'] },
        address: { required: false, type: 'string', min: 12, max: 17 },
        quick: { required: false, type: 'boolean' }
      }, false);

      if (!valid) {
        reject(new Error(parameterChecker.error.message));
        return;
      }

      if (!params) {
        params = {};
      }

      // Determine the values of the parameters
      let p = {
        duration: params.duration || this._DEFAULT_DISCOVERY_DURATION,
        model: params.model || '',
        address: params.address || '',
        quick: params.quick ? true : false
      };

      // Initialize the noble object
      this._init().then(() => {
        let peripherals = {};
        let timer = null;
        let finishDiscovery = () => {
          if (timer) {
            clearTimeout(timer);
          }
          this.noble.removeAllListeners('discover');
          this.noble.stopScanning();
          let device_list = [];
          for (let addr in peripherals) {
            device_list.push(peripherals[addr]);
          }
          resolve(device_list);
        };

        // Set an handler for the 'discover' event
        this.noble.on('discover', (peripheral) => {
          let device = this._getDeviceObject(peripheral, p.address, p.model);
          if (!device) {
            return;
          }
          peripherals[device.address] = device;

          if (this.ondiscover && typeof (this.ondiscover) === 'function') {
            this.ondiscover(device);
          }

          if (p.quick) {
            finishDiscovery();
            return;
          }
        });

        // Start scaning
        this.noble.startScanning(this._PRIMARY_SERVICE_UUID_LIST, false, (error) => {
          if (error) {
            reject(error);
            return;
          }
          timer = setTimeout(() => {
            finishDiscovery();
          }, p.duration);
        });
      }).catch((error) => {
        reject(error);
      });
    });
    return promise;
  }

  _init() {
    let promise = new Promise((resolve, reject) => {
      if (this._initialized === true) {
        resolve();
        return;
      }
      if (this.noble.state === 'poweredOn') {
        this._initialized = true;
        resolve();
      } else {
        this.noble.once('stateChange', (state) => {
          if (state === 'poweredOn') {
            this._initialized = true;
            resolve();
          } else {
            let err = new Error('Failed to initialize the Noble object: ' + state);
            reject(err);
          }
        });
      }
    });
    return promise;
  }

  _getDeviceObject(peripheral, address, model) {
    let ad = switchbotAdvertising.parse(peripheral);
    if (this._filterAdvertising(ad, address, model)) {
      let device = null;
      if (ad.serviceData.model === 'H') {
        device = new SwitchbotDeviceWoHand(peripheral);
      } else if (ad.serviceData.model === 'T') {
        device = new SwitchbotDeviceWoSensorTH(peripheral);
      } else if (ad.serviceData.model === 'c') {
        device = new SwitchbotDeviceWoCurtain(peripheral);
      } else {
        device = new SwitchbotDevice(peripheral);
      }
      return device;
    } else {
      return null;
    }
  }

  _filterAdvertising(ad, address, model) {
    if (!ad) {
      return false;
    }
    if (address) {
      if (!ad.address.match(new RegExp(address.replace(/:/g, '.'), 'i'))) {
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
  * - params     | Object  | Optional |
  *   - model    | String  | Optional | "H" or "T".
  *              |         |          | If "H" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Bots.
  *              |         |          | If "T" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Meters.
  *   - address  | String  | Optional | If this value is set, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from devices whose address is as same
  *              |         |          | as this value.
  *              |         |          | This parameter is case-insensitive, colons
  *              |         |          | and hyphens are ignored.
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  startScan(params) {
    let promise = new Promise((resolve, reject) => {
      // Check the parameters
      let valid = parameterChecker.check(params, {
        model: { required: false, type: 'string', enum: ['H', 'T', 'c'] },
        address: { required: false, type: 'string', min: 12, max: 17 },
      }, false);

      if (!valid) {
        reject(new Error(parameterChecker.error.message));
        return;
      }

      if (!params) {
        params = {};
      }

      // Initialize the noble object
      this._init().then(() => {

        // Determine the values of the parameters
        let p = {
          model: params.model || '',
          address: params.address || ''
        };

        // Set an handler for the 'discover' event
        this.noble.on('discover', (peripheral) => {
          let ad = switchbotAdvertising.parse(peripheral);
          if (this._filterAdvertising(ad, p.address, p.model)) {
            if (this.onadvertisement && typeof (this.onadvertisement) === 'function') {
              this.onadvertisement(ad);
            }
          }
        });

        // Start scaning
        this.noble.startScanning(this._PRIMARY_SERVICE_UUID_LIST, true, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }).catch((error) => {
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
  * [Returen value]
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
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  wait(msec) {
    return new Promise((resolve, reject) => {
      // Check the parameters
      let valid = parameterChecker.check({ msec: msec }, {
        msec: { required: true, type: 'integer', min: 0 }
      });

      if (!valid) {
        reject(new Error(parameterChecker.error.message));
        return;
      }
      // Set a timer
      setTimeout(resolve, msec);
    });
  }

}

module.exports = Switchbot;
