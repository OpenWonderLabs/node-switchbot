/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-sensor-th-pro-co2.ts: SwitchBot v4.0.0 - Meter Pro CO2
 */

import type { MeterProCO2Status } from '../types/device.js'

import { WoSensorTH } from './wo-sensor-th.js'

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
 */
export class WoSensorTHProCO2 extends WoSensorTH {
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
