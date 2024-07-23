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
import { WoHub2 } from './device/wohub2.js';
import { WoHumi } from './device/wohumi.js';
import { WoPlugMini } from './device/woplugmini.js';
import { WoBulb } from './device/wobulb.js';
import { WoCeilingLight } from './device/woceilinglight.js';
import { WoStrip } from './device/wostrip.js';
import { WoSmartLock } from './device/wosmartlock.js';
import { WoSmartLockPro } from './device/wosmartlockpro.js';
import { SwitchBotBLEModel } from './types/types.js';

export type Ad = {
  id: string;
  address: string;
  rssi: number,
  serviceData: object;
} | null;

export type AdvertisementData = {
  serviceData: Buffer | null;
  manufacturerData: Buffer | null;
}

export class Advertising {

  constructor() { }

  /**
   * Parses the advertisement data coming from SwitchBot device.
   *
   * This function processes advertising packets received from SwitchBot devices
   * and extracts relevant information based on the device type.
   *
   * @param peripheral - The peripheral device object from noble.
   * @param onlog - A logging function for debugging purposes.
   * @returns An object containing parsed data specific to the SwitchBot device type, or `null` if the device is not recognized.
   */
  static async parse(
    peripheral: Peripheral,
    onlog?: (message: string) => void,
  ): Promise<Ad> {
    const ad = peripheral.advertisement;
    if (!ad || !ad.serviceData) {
      return null;
    }
    const adServiceData = ad.serviceData[0] || ad.serviceData;
    const manufacturerData = ad.manufacturerData;
    const serviceData = adServiceData.data;

    function validateBuffer(buffer: any): boolean {
      return buffer && Buffer.isBuffer(buffer) && buffer.length >= 3;
    }

    if (!validateBuffer(serviceData) || !validateBuffer(manufacturerData)) {
      return null;
    }

    const model = serviceData.subarray(0, 1).toString('utf8');
    let sd;
    switch (model) {
      case SwitchBotBLEModel.Bot:
        sd = await WoHand.parseServiceData(serviceData, onlog);
        break;
      case SwitchBotBLEModel.Curtain:
      case SwitchBotBLEModel.Curtain3:
        sd = await WoCurtain.parseServiceData(serviceData, manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.Humidifier:
        sd = await WoHumi.parseServiceData(serviceData, onlog);
        break;
      case SwitchBotBLEModel.Meter:
        sd = await WoSensorTH.parseServiceData(serviceData, onlog);
        break;
      case SwitchBotBLEModel.MeterPlus:
        sd = await WoSensorTH.parseServiceData_Plus(serviceData, onlog);
        break;
      case SwitchBotBLEModel.Hub2:
        sd = await WoHub2.parseServiceData(manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.OutdoorMeter:
        sd = await WoIOSensorTH.parseServiceData(serviceData, manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.MotionSensor:
        sd = await WoPresence.parseServiceData(serviceData, onlog);
        break;
      case SwitchBotBLEModel.ContactSensor:
        sd = await WoContact.parseServiceData(serviceData, onlog);
        break;
      case SwitchBotBLEModel.ColorBulb:
        sd = await WoBulb.parseServiceData(serviceData, manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.CeilingLight:
        sd = await WoCeilingLight.parseServiceData(manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.CeilingLightPro:
        sd = await WoCeilingLight.parseServiceData_Pro(manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.StripLight:
        sd = await WoStrip.parseServiceData(serviceData, onlog);
        break;
      case SwitchBotBLEModel.PlugMiniUS:
        sd = await WoPlugMini.parseServiceData_US(manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.PlugMiniJP:
        sd = await WoPlugMini.parseServiceData_JP(manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.Lock:
        sd = await WoSmartLock.parseServiceData(serviceData, manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.LockPro:
        sd = await WoSmartLockPro.parseServiceData(serviceData, manufacturerData, onlog);
        break;
      case SwitchBotBLEModel.BlindTilt:
        sd = await WoBlindTilt.parseServiceData(serviceData, manufacturerData, onlog);
        break;
      default:
        if (onlog && typeof onlog === 'function') {
          onlog(`[parseAdvertising.${peripheral.id}] return null, model "${model}" not available!`);
        }
        return null;
    }
    if (!sd) {
      if (onlog && typeof onlog === 'function') {
        onlog(`[parseAdvertising.${peripheral.id}.${model}] return null, parsed serviceData empty!`);
      }
      return null;
    }
    let address = peripheral.address || '';
    if (address === '') {
      const str = peripheral.advertisement.manufacturerData
        .toString('hex')
        .slice(4, 16);
      if (str !== '') {
        address = str.substring(0, 2);
        for (let i = 2; i < str.length; i += 2) {
          address = address + ':' + str.substring(i, i + 2);
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
      onlog(`[parseAdvertising.${peripheral.id}.${model}] return ${JSON.stringify(data)}`);
    }
    return data;
  }
}
