/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-sensor-th-pro-co2.ts: SwitchBot v4.0.0 - Meter Pro CO2
 */

import type { MeterProCO2Status } from '../types/device.js'

import { isInteger, WoSensorTHPro } from './wo-sensor-th-pro.js'

/** CO2 alarm settings (getCo2Alarm) */
export interface MeterProCO2Alarm {
  /** MeterProCO2AlarmMode flags */
  mode: number
  lowPpm: number
  highPpm: number
  /** MeterProCO2AlarmStatus */
  status: number
}

/** CO2 colour level thresholds (getCo2LevelThresholds) */
export interface MeterProCO2LevelThresholds {
  greenToYellowPpm: number
  yellowToRedPpm: number
}

// BLE commands (pySwitchbot switchbot/devices/meter_pro.py)
const COMMAND_TRIGGER_CO2_SAMPLING = '570f680b04'
const COMMAND_START_CO2_CALIBRATION = '570f680b02'
const COMMAND_GET_USB_POWER_STATE = '570f690b02'
const COMMAND_GET_CO2_USB_UPDATE_INTERVAL = '570f690b03'
const COMMAND_SET_CO2_USB_UPDATE_INTERVAL = '570f680b01'
const COMMAND_GET_CO2_BATTERY_UPDATE_INTERVAL = '570f690b04'
const COMMAND_SET_CO2_BATTERY_UPDATE_INTERVAL = '570f680b06'
const COMMAND_GET_CO2_ALARM = '570f69020301'
const COMMAND_SET_CO2_ALARM = '570f68020301'
const COMMAND_GET_CO2_LEVEL_THRESHOLDS = '570f69020302'
const COMMAND_SET_CO2_LEVEL_THRESHOLDS = '570f68020302'

const u16 = (value: number) => value.toString(16).padStart(4, '0')
const isUint16 = (value: unknown): value is number => isInteger(value) && value >= 0 && value <= 0xFFFF

/**
 * Meter Pro CO2 (Temperature/Humidity/CO2 Sensor)
 *
 * Temperature and humidity behave exactly as the standard Meter. This model
 * additionally reports carbon dioxide in ppm, which the OpenAPI status returns
 * as `CO2`.
 *
 * The BLE service data for this model is not yet parsed for CO2, so `co2` is
 * omitted on the BLE path rather than reported as 0 - a real reading of 0 ppm
 * is not physically meaningful, and a placeholder would be indistinguishable
 * from a working sensor.
 *
 * It has every Meter Pro setting, plus the CO2 controls of pySwitchbot's
 * SwitchbotMeterProCO2 (3.13.0, 3.15.0), which are BLE only.
 */
export class WoSensorTHProCO2 extends WoSensorTHPro {
  /** Request a CO2 sample; sent once (pySwitchbot 3.13.0) */
  async triggerCo2Sampling(): Promise<void> {
    await this.meterCommand(COMMAND_TRIGGER_CO2_SAMPLING, 'triggerCo2Sampling', { retry: false })
  }

  /**
   * Start manual CO2 calibration; sent once (pySwitchbot 3.13.0). Place the meter outdoors in a
   * well-ventilated area for one minute first, and keep it still during the five-minute
   * calibration.
   */
  async startCo2Calibration(): Promise<void> {
    await this.meterCommand(COMMAND_START_CO2_CALIBRATION, 'startCo2Calibration', { retry: false })
  }

  /** Whether USB-C power is connected (pySwitchbot 3.13.0) */
  async isUsbPowered(): Promise<boolean> {
    const data = await this.meterCommand(COMMAND_GET_USB_POWER_STATE, 'isUsbPowered', { minLength: 2 })
    if (data[1] !== 0 && data[1] !== 1) {
      throw this.operationError(`Unexpected USB power state ${data[1].toString(16).padStart(2, '0')}`)
    }
    return data[1] === 1
  }

  /** The CO2 update interval on battery power, in seconds (pySwitchbot 3.13.0) */
  async getCo2BatteryUpdateInterval(): Promise<number> {
    return this.getCo2UpdateInterval(COMMAND_GET_CO2_BATTERY_UPDATE_INTERVAL, 'getCo2BatteryUpdateInterval')
  }

  /** Set the CO2 update interval on battery power, 1-65535 seconds (pySwitchbot 3.13.0) */
  async setCo2BatteryUpdateInterval(seconds: number): Promise<void> {
    await this.setCo2UpdateInterval(COMMAND_SET_CO2_BATTERY_UPDATE_INTERVAL, 'setCo2BatteryUpdateInterval', seconds)
  }

  /** The CO2 update interval on USB power, in seconds (pySwitchbot 3.13.0) */
  async getCo2UsbUpdateInterval(): Promise<number> {
    return this.getCo2UpdateInterval(COMMAND_GET_CO2_USB_UPDATE_INTERVAL, 'getCo2UsbUpdateInterval')
  }

  /** Set the CO2 update interval on USB power, 1-65535 seconds (pySwitchbot 3.13.0) */
  async setCo2UsbUpdateInterval(seconds: number): Promise<void> {
    await this.setCo2UpdateInterval(COMMAND_SET_CO2_USB_UPDATE_INTERVAL, 'setCo2UsbUpdateInterval', seconds)
  }

  private async getCo2UpdateInterval(command: string, operation: string): Promise<number> {
    const data = await this.meterCommand(command, operation, { minLength: 3 })
    return data.readUInt16BE(1)
  }

  private async setCo2UpdateInterval(command: string, operation: string, seconds: number): Promise<void> {
    if (!isInteger(seconds) || seconds < 1 || seconds > 0xFFFF) {
      throw this.operationError('CO2 update interval must be an integer from 1 to 65535 seconds')
    }
    await this.meterCommand(`${command}${u16(seconds)}`, operation)
  }

  /** Read the CO2 alarm conditions, limits in ppm and current alarm status (pySwitchbot 3.15.0) */
  async getCo2Alarm(): Promise<MeterProCO2Alarm> {
    const data = await this.meterCommand(COMMAND_GET_CO2_ALARM, 'getCo2Alarm', { minLength: 7 })
    return {
      mode: data[1],
      highPpm: data.readUInt16BE(2),
      lowPpm: data.readUInt16BE(4),
      status: data[6] & 0x03,
    }
  }

  /**
   * Set the CO2 alarm conditions (MeterProCO2AlarmMode flags) and limits in ppm (pySwitchbot
   * 3.15.0). Pass the existing limits when disabling an alarm to keep them configured.
   */
  async setCo2Alarm(mode: number, lowPpm: number, highPpm: number): Promise<void> {
    if (!isInteger(mode) || mode < 0 || (mode & ~0x0F) !== 0) {
      throw this.operationError(`Invalid CO2 alarm mode ${JSON.stringify(mode)}`)
    }
    if (!isUint16(lowPpm) || !isUint16(highPpm)) {
      throw this.operationError('CO2 alarm limits must be unsigned 16-bit integers')
    }
    if (lowPpm > highPpm) {
      throw this.operationError('Lower CO2 alarm limit must not exceed the upper limit')
    }
    await this.meterCommand(`${COMMAND_SET_CO2_ALARM}${mode.toString(16).padStart(2, '0')}${u16(highPpm)}${u16(lowPpm)}`, 'setCo2Alarm')
  }

  /** Read the green-to-yellow and yellow-to-red CO2 thresholds in ppm (pySwitchbot 3.13.0) */
  async getCo2LevelThresholds(): Promise<MeterProCO2LevelThresholds> {
    const data = await this.meterCommand(COMMAND_GET_CO2_LEVEL_THRESHOLDS, 'getCo2LevelThresholds', { minLength: 5 })
    return { greenToYellowPpm: data.readUInt16BE(1), yellowToRedPpm: data.readUInt16BE(3) }
  }

  /** Set the green-to-yellow and yellow-to-red CO2 thresholds, in 100 ppm steps (pySwitchbot 3.13.0) */
  async setCo2LevelThresholds(greenToYellowPpm: number, yellowToRedPpm: number): Promise<void> {
    if ([greenToYellowPpm, yellowToRedPpm].some(threshold => !isUint16(threshold) || threshold % 100 !== 0)) {
      throw this.operationError('CO2 level thresholds must be unsigned 16-bit integers in 100 ppm steps')
    }
    if (greenToYellowPpm >= yellowToRedPpm) {
      throw this.operationError('The green-to-yellow CO2 threshold must be below the yellow-to-red threshold')
    }
    await this.meterCommand(`${COMMAND_SET_CO2_LEVEL_THRESHOLDS}${u16(greenToYellowPpm)}${u16(yellowToRedPpm)}`, 'setCo2LevelThresholds')
  }

  /**
   * Get device status (BLE-first, API-fallback)
   */
  async getStatus(): Promise<MeterProCO2Status> {
    return this.getStatusWithFallback<MeterProCO2Status>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        temperature: bleData.temperature || 0,
        humidity: bleData.humidity || 0,
        temperatureScale: bleData.fahrenheit ? 'f' : 'c',
        battery: bleData.battery,
        ...(typeof bleData.co2 === 'number' ? { co2: bleData.co2 } : {}),
        updatedAt: new Date(),
      }),
      (apiStatus) => {
        // Accept only a finite number. Number(null) is 0, so coercing would
        // turn a missing reading into a plausible-looking 0 ppm.
        const rawCo2 = (apiStatus as { CO2?: unknown }).CO2
        const co2 = typeof rawCo2 === 'number' && Number.isFinite(rawCo2) ? rawCo2 : undefined
        return {
          deviceId: this.info.id,
          connectionType: 'api',
          temperature: apiStatus.temperature || 0,
          humidity: apiStatus.humidity || 0,
          battery: apiStatus.battery,
          version: apiStatus.version,
          ...(co2 === undefined ? {} : { co2 }),
          updatedAt: new Date(),
        }
      },
    )
  }
}
