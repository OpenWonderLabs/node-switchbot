/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * advertising.ts: Switchbot BLE API registration.
 */
import { Peripheral } from '@stoprocent/noble';

import { WoHand } from './device/wohand.js';
import { WoCurtain } from './device/wocurtain.js';
import { WoBlindTilt } from './device/woblindtilt.js';
import { WoPresence } from './device/wopresence.js';
import { WoContact } from './device/wocontact.js';
import { WoSensorTH } from './device/wosensorth.js';
import { WoIOSensorTH } from './device/woiosensorth.js';
import { WoHumi } from './device/wohumi.js';
import { WoPlugMini } from './device/woplugmini.js';
import { WoBulb } from './device/wobulb.js';
import { WoStrip } from './device/wostrip.js';
import { WoSmartLock } from './device/wosmartlock.js';

export type Ad = {
  id: string;
  address: string;
  rssi: number,
  serviceData: Record<string, unknown>;
} | null;

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
  static parse(peripheral: Peripheral, onlog?: (message: string) => void) {
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

    const model = buf.slice(0, 1).toString('utf8');
    let sd;

    if (model === 'H') {
      sd = WoHand.parseServiceData(buf, onlog);//WoHand
    } else if (model === 'T') {
      sd = WoSensorTH.parseServiceData(buf, onlog);//WoSensorTH
    } else if (model === 'e') {
      sd = WoHumi.parseServiceData(buf, onlog);//WoHumi
    } else if (model === 's') {
      sd = WoPresence.parseServiceData(buf, onlog);//WoPresence
    } else if (model === 'd') {
      sd = WoContact.parseServiceData(buf, onlog);//WoContact
    } else if (model === 'c' || model === '{') {
      sd = WoCurtain.parseServiceData(buf, onlog);// WoCurtain
    } else if (model === 'x') {
      sd = WoBlindTilt.parseServiceData(buf, onlog);// WoBlindTilt
    } else if (model === 'u') {
      sd = WoBulb.parseServiceData(manufacturerData, onlog);// WoBulb
    } else if (model === 'g') {
      sd = WoPlugMini.parseServiceData_US(manufacturerData, onlog);      // WoPlugMini (US)
    } else if (model === 'j') {
      sd = WoPlugMini.parseServiceData_JP(manufacturerData, onlog);// WoPlugMini (JP)
    } else if (model === 'o') {
      sd = WoSmartLock.parseServiceData(buf, manufacturerData, onlog);// WoSmartLock
    } else if (model === 'i') {
      sd = WoSensorTH.parseServiceData_Plus(buf, onlog);// WoMeterPlus
    } else if (model === 'r') {
      sd = WoStrip.parseServiceData(buf, onlog);// WoStrip
    } else if (model === 'w') {
      sd = WoIOSensorTH.parseServiceData(buf, manufacturerData, onlog); // Indoor/Outdoor Thermo-Hygrometer
    } else {
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
      const str = peripheral.advertisement.manufacturerData
        .toString('hex')
        .slice(4, 16);
      if (str !== '') {
        address = str.substr(0, 2);
        for (let i = 2; i < str.length; i += 2) {
          address = address + ':' + str.substr(i, 2);
        }
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
