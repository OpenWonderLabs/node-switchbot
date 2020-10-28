/* ------------------------------------------------------------------
* node-linking - switchbot-advertising.js
*
* Copyright (c) 2019, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2020-02-11
* ---------------------------------------------------------------- */
'use strict';

class SwitchbotAdvertising {
  constructor() { }

  /* ------------------------------------------------------------------
  * parse(peripheral)
  * - Parse advertising packets coming from switchbot devices
  *
  * [Arguments]
  * - peripheral | Object  | Required | A `Peripheral` object of noble
  *
  * [Returen value]
  * - An object as follows:
  *
  * WoHand	
  * {
  *   id: 'c12e453e2008',
  *   address: 'c1:2e:45:3e:20:08',
  *   rssi: -43,
  *   serviceData: {
  *     model: 'H',
  *     modelName: 'WoHand',
  *     mode: false,
  *     state: false,
  *     battery: 95
  *   }
  * }
  *
  * WoSensorTH
  * {
  *   id: 'cb4eb903c96d',
  *   address: 'cb:4e:b9:03:c9:6d',
  *   rssi: -54,
  *   serviceData: {
  *     model: 'T',
  *     modelName: 'WoSensorTH',
  *     temperature: { c: 26.2, f: 79.2 },
  *     fahrenheit: false,
  *     humidity: 45,
  *     battery: 100
  *   }
  * }
  *
  * If the specified `Peripheral` does not represent any switchbot
  * device, this method will return `null`.
  * ---------------------------------------------------------------- */
  parse(peripheral) {
    let ad = peripheral.advertisement;
    if (!ad || !ad.serviceData) {
      return null;
    }
    if (ad.serviceData[0].uuid !== '0d00') {
      return null;
    }
    let buf = ad.serviceData[0].data;
    if (!buf || !Buffer.isBuffer(buf) || buf.length < 3) {
      return null;
    }

    let model = buf.slice(0, 1).toString('utf8');
    let sd = null;

    if (model === 'H') { // WoHand
      sd = this._parseServiceDataForWoHand(buf);
    } else if (model === 'T') { // WoSensorTH
      sd = this._parseServiceDataForWoSensorTH(buf);
    } else if (model === 'c') { // WoCurtain
      sd = this._parseServiceDataForWoCurtain(buf);
    } else {
      return null;
    }

    if (!sd) {
      return null;
    }
    let data = {
      id: peripheral.id,
      address: peripheral.address,
      rssi: peripheral.rssi,
      serviceData: sd
    };
    return data;
  }

  _parseServiceDataForWoHand(buf) {
    if (buf.length !== 3) {
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);

    let mode = (byte1 & 0b10000000) ? true : false; // Whether the light switch Add-on is used or not
    let state = (byte1 & 0b01000000) ? true : false; // Whether the switch status is ON or OFF
    let battery = byte2 & 0b01111111; // %

    let data = {
      model: 'H',
      modelName: 'WoHand',
      mode: mode,
      state: state,
      battery: battery
    };

    return data;
  }

  _parseServiceDataForWoSensorTH(buf) {
    if (buf.length !== 6) {
      return null;
    }
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    let temp_sign = (byte4 & 0b10000000) ? 1 : -1;
    let temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 / 10));
    let temp_f = (temp_c * 9 / 5) + 32;
    temp_f = Math.round(temp_f * 10) / 10;

    let data = {
      model: 'T',
      modelName: 'WoSensorTH',
      temperature: {
        c: temp_c,
        f: temp_f
      },
      fahrenheit: (byte5 & 0b10000000) ? true : false,
      humidity: byte5 & 0b01111111,
      battery: (byte2 & 0b01111111)
    };

    return data;
  }

  _parseServiceDataForWoCurtain(buf) {
    if (buf.length !== 5) {
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte4 = buf.readUInt8(4);

    let calibration = byte1 & 0b01000000; // Whether the calibration is completed
    let battery = byte2 & 0b01111111; // %
    let currPosition = byte3 & 0b00001111; // current positon %
    let lightLevel = (byte4 >> 4) & 0b00001111; // light sensor level (1-10)

    let data = {
      model: 'c',
      modelName: 'WoCurtain',
      calibration: calibration ? true : false,
      battery: battery,
      position: currPosition,
      lightLevel: lightLevel
    };

    return data;
  }
}

module.exports = new SwitchbotAdvertising();