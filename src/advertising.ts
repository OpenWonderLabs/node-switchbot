import { Buffer } from 'buffer';

import { parseServiceDataForWoHand } from './device/wohand.js';
import { parseServiceDataForWoSensorTH } from './device/wosensorth.js';
import { parseServiceDataForWoHumi } from './device/wohumi.js';
import { parseServiceDataForWoPresence } from './device/wopresence.js';
import { parseServiceDataForWoContact } from './device/wocontact.js';
import { parseServiceDataForWoCurtain } from './device/wocurtain.js';
import { parseServiceDataForWoBlindTilt } from './device/woblindtilt.js';
import { parseServiceDataForWoBulb } from './device/wobulb.js';
import { parseServiceDataForWoPlugMiniUS } from './device/woplugmini.js';
import { parseServiceDataForWoPlugMiniJP } from './device/woplugmini.js';
import { parseServiceDataForWoSmartLock } from './device/wosmartlock.js';
import { parseServiceDataForWoSensorTHPlus } from './device/wosensorth.js';
import { parseServiceDataForWoStrip } from './device/wostrip.js';
import { parseServiceDataForWoIOSensorTH } from './device/woiosensorth.js';

export class Advertising {

  constructor() { }

  /* ------------------------------------------------------------------
   * parse(peripheral)
   * - Parse advertising packets coming from switchbot devices
   *
   * [Arguments]
   * - peripheral | Object  | Required | A `Peripheral` object of noble
   *
   * [Return value]
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
   * WoCurtain
   * {
   *   id: 'ec58c5d00111',
   *   address: 'ec:58:c5:d0:01:11',
   *   rssi: -39,
   *   serviceData: {
   *     model: 'c',
   *     modelName: 'WoCurtain',
   *     calibration: true,
   *     battery: 91,
   *     position: 1,
   *     lightLevel: 1
   *   }
   * }
   *
   * If the specified `Peripheral` does not represent any switchbot
   * device, this method will return `null`.
   * ---------------------------------------------------------------- */
  /**
   * Parses the advertisement data of a peripheral device.
   *
   * @param peripheral - The peripheral device.
   * @param onlog - The logging function.
   * @returns The parsed data of the peripheral device.
   */
  static parse(peripheral, onlog?) {
    const ad = peripheral.advertisement;
    if (!ad || !ad.serviceData) {
      return null;
    }
    const serviceData = ad.serviceData[0] || ad.serviceData;
    const manufacturerData = ad.manufacturerData;
    const buf = serviceData.data;

    const bufIsInvalid = !buf || !Buffer.isBuffer(buf) || buf.length < 3;
    const manufacturerDataIsInvalid =
      !manufacturerData ||
      !Buffer.isBuffer(manufacturerData) ||
      manufacturerData.length < 3;

    if (bufIsInvalid || manufacturerDataIsInvalid) {
      return null;
    }

    const model = buf.subarray(0, 1).toString('utf8');
    let sd;

    switch (model) {
      case 'H':
        sd = parseServiceDataForWoHand(buf, onlog);//WoHand
        break;
      case 'T':
        sd = parseServiceDataForWoSensorTH(buf, onlog);//WoSensorTH
        break;
      case 'e':
        sd = parseServiceDataForWoHumi(buf, onlog);//WoHumi
        break;
      case 's':
        sd = parseServiceDataForWoPresence(buf, onlog);//WoPresence
        break;
      case 'd':
        sd = parseServiceDataForWoContact(buf, onlog);//WoContact
        break;
      case 'c':
      case '{':
        sd = parseServiceDataForWoCurtain(buf, onlog);// WoCurtain
        break;
      case 'x':
        sd = parseServiceDataForWoBlindTilt(manufacturerData, onlog);// WoBlindTilt
        break;
      case 'u':
        sd = parseServiceDataForWoBulb(manufacturerData, onlog);// WoBulb
        break;
      case 'g':
        sd = parseServiceDataForWoPlugMiniUS(manufacturerData, onlog);// WoPlugMini (US)
        break;
      case 'j':
        sd = parseServiceDataForWoPlugMiniJP(manufacturerData, onlog);// WoPlugMini (JP)
        break;
      case 'o':
        sd = parseServiceDataForWoSmartLock(manufacturerData, onlog);// WoSmartLock
        break;
      case 'i':
        sd = parseServiceDataForWoSensorTHPlus(buf, onlog);// WoMeterPlus
        break;
      case 'r':
        sd = parseServiceDataForWoStrip(buf, onlog);// WoStrip
        break;
      case 'w':
        sd = parseServiceDataForWoIOSensorTH(buf, manufacturerData, onlog); // Indoor/Outdoor Thermo-Hygrometer
        break;
      default:
        if (onlog && typeof onlog === 'function') {
          onlog(
            `[parseAdvertising.${peripheral.id}] return null, model "${model}" not available!`,
          );
        }
        return null;
    }

    if (!sd) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseAdvertising.${peripheral.id}.${model}] return null, parsed serviceData empty!`,
        );
      }
      return null;
    }
    let address = peripheral.address || '';
    if (address === '') {
      address = peripheral.advertisement.manufacturerData || '';
      if (address !== '') {
        const str = peripheral.advertisement.manufacturerData
          .toString('hex')
          .slice(4, 16);
        address = str.substr(0, 2);
        for (let i = 2; i < str.length; i += 2) {
          address = address + ':' + str.substr(i, 2);
        }
        // console.log("address", typeof(address), address);
      }
    } else {
      address = address.replace(/-/g, ':');
    }
    const data = {
      id: peripheral.id,
      address: address,
      rssi: peripheral.rssi,
      serviceData: sd,
    };

    if (onlog && typeof onlog === 'function') {
      onlog(
        `[parseAdvertising.${peripheral.id}.${model}] return ${JSON.stringify(
          data,
        )}`,
      );
    }
    return data;
  }
}
