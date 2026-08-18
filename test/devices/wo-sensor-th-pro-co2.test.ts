/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wo-sensor-th-pro-co2.test.ts: Meter Pro (CO2) status mapping
 */

import type { DeviceInfo } from '../../src/types/index.js'

import { describe, expect, it } from 'vitest'

import { WoSensorTHProCO2 } from '../../src/devices/wo-sensor-th-pro-co2.js'

const INFO: DeviceInfo = {
  id: 'B0E9FED044E3',
  name: 'Meter Pro CO2 Monitor',
  deviceType: 'MeterPro(CO2)',
  connectionTypes: ['api'],
}

/**
 * Drive getStatus() through its API normaliser without a live connection by
 * standing in for getStatusWithFallback, which is what the base class uses to
 * choose between the BLE and API paths.
 */
function apiDevice(apiStatus: Record<string, unknown>) {
  const device = Object.create(WoSensorTHProCO2.prototype) as WoSensorTHProCO2 & {
    info: DeviceInfo
    getStatusWithFallback: (ble: unknown, api: (s: any) => unknown) => Promise<any>
  }
  device.info = { ...INFO }
  device.getStatusWithFallback = async (_ble, api) => api(apiStatus)
  return device
}

describe('woSensorTHProCO2', () => {
  it('surfaces the CO2 reading from the OpenAPI status', async () => {
    const status = await apiDevice({ temperature: 22.7, humidity: 55, battery: 100, CO2: 483 }).getStatus()

    expect(status.co2).toBe(483)
    expect(status.temperature).toBe(22.7)
    expect(status.humidity).toBe(55)
    expect(status.connectionType).toBe('api')
  })

  it('reports a genuine zero reading rather than dropping it', async () => {
    const status = await apiDevice({ temperature: 20, humidity: 40, CO2: 0 }).getStatus()

    expect(status.co2).toBe(0)
  })

  // Omitted rather than zeroed: 0 ppm is not a physically meaningful reading,
  // so a placeholder would be indistinguishable from a working sensor.
  it.each([
    ['absent', {}],
    ['null', { CO2: null }],
    ['non-numeric', { CO2: 'n/a' }],
  ])('omits co2 when the API value is %s', async (_label, extra) => {
    const status = await apiDevice({ temperature: 20, humidity: 40, ...extra }).getStatus()

    expect(status.co2).toBeUndefined()
    expect(status.temperature).toBe(20)
  })

  it('still maps temperature and humidity on the BLE path', async () => {
    const device = Object.create(WoSensorTHProCO2.prototype) as any
    device.info = { ...INFO, connectionTypes: ['ble'] }
    device.getStatusWithFallback = async (ble: (d: any) => unknown) =>
      ble({ temperature: 21.5, humidity: 48, fahrenheit: false, battery: 90 })

    const status = await device.getStatus()

    expect(status.temperature).toBe(21.5)
    expect(status.humidity).toBe(48)
    expect(status.temperatureScale).toBe('c')
    expect(status.co2).toBeUndefined()
  })
})
