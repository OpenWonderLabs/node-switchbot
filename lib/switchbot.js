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
const SwitchbotDeviceWoCurtain = require('./switchbot-device-wocurtain.js');
const SwitchbotDeviceWoSensorMS = require('./switchbot-device-wosensorms.js');
const SwitchbotDeviceWoSensorCS = require('./switchbot-device-wosensorcs.js');
const SwitchbotDeviceWoSensorTH = require('./switchbot-device-wosensorth.js');

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
  *   - model    | String  | Optional | "H", "T", "M", "CS", or "c".
  *              |         |          | If "H" is specified, this method will discover only Bots.
  *              |         |          | If "T" is specified, this method will discover only Meters.
  *              |         |          | If "M" is specified, this method will discover only Motion Sensors.
  *              |         |          | If "CS" is specified, this method will discover only Contact Sensors.
  *              |         |          | If "C" is specified, this method will discover only Curtains.
  *   - id       | String  | Optional | If this value is set, this method willl discover
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
        model: { required: false, type: 'string', enum: ['H', 'T', 'M', 'CS', 'c'] },
        id: { required: false, type: 'string', min: 12, max: 17 },
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
        id: params.id || '',
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
          let device = this._getDeviceObject(peripheral, p.id, p.model);
          if (!device) {
            return;
          }
          let id = device.id;
          peripherals[id] = device;

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
      switch (this.noble.state) {
        case 'poweredOn':
          resolve();
          return;
        case 'unsupported', 'unauthorized', 'poweredOff':
          let err = new Error('Failed to initialize the Noble object: ' + this.noble.state);
          reject(err);
          return;
        default: // 'resetting', 'unknown'
          this.noble.once('stateChange', (state) => {
            if (state === 'poweredOn') {
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

  _getDeviceObject(peripheral, id, model) {
    let ad = switchbotAdvertising.parse(peripheral);
    if (this._filterAdvertising(ad, id, model)) {
      let device = null;
      switch (ad.serviceData.model) {
        case 'H':
          device = new SwitchbotDeviceWoHand(peripheral, this.noble);
          break;
        case 'T':
          device = new SwitchbotDeviceWoSensorTH(peripheral, this.noble);
          break;
        case 'M':
          device = new SwitchbotDeviceWoHand(peripheral, this.noble);
          break;
        case 'CS':
          device = new SwitchbotDeviceWoHand(peripheral, this.noble);
          break;
        case 'c':
          device = new SwitchbotDeviceWoHand(peripheral, this.noble);
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
      id = id.toLowerCase().replace(/\:/g, '');
      if (ad.id !== id) {
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
  *   - model    | String  | Optional | "H", "T", "M", "CS", or "C".
  *              |         |          | If "H" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Bots.
  *              |         |          | If "T" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Meters.
  *              |         |          | If "M" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Motion Sensor.
  *              |         |          | If "CS" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Contact Sensor.
  *              |         |          | If "C" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Curtains.
  *   - id       | String  | Optional | If this value is set, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from devices whose ID is as same as
  *              |         |          | this value.
  *              |         |          | The ID is identical to the MAC address.
  *              |         |          | This parameter is case-insensitive, and
  *              |         |          | colons are ignored.
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  startScan(params) {
    let promise = new Promise((resolve, reject) => {
      // Check the parameters
      let valid = parameterChecker.check(params, {
        model: { required: false, type: 'string', enum: ['H', 'T', 'M', 'CS', 'c'] },
        id: { required: false, type: 'string', min: 12, max: 17 },
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
          id: params.id || ''
        };

        // Set an handler for the 'discover' event
        this.noble.on('discover', (peripheral) => {
          let ad = switchbotAdvertising.parse(peripheral);
          if (this._filterAdvertising(ad, p.id, p.model)) {
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