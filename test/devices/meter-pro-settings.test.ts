import type { DeviceInfo } from '../../src/types/index.js'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { WoSensorTHProCO2 } from '../../src/devices/wo-sensor-th-pro-co2.js'
import {
  encodeMeterProTemperature,
  MeterProAlarmMode,
  MeterProAlarmVolume,
  MeterProCO2AlarmMode,
  MeterProCO2AlarmStatus,
  MeterProComfortStatus,
  MeterProDateFormat,
  MeterProDisplaySource,
  MeterProDisplayZone,
  MeterProTemperatureHumidityAlarmStatus,
  MeterProWeatherIcon,
  MeterProZoneIcon,
  MeterProTemperatureHumidityAlarmMode as THAlarm,
  WoSensorTHPro,
} from '../../src/devices/wo-sensor-th-pro.js'
import { WoSensorTH } from '../../src/devices/wo-sensor-th.js'
import { SwitchbotOperationError } from '../../src/errors.js'

// Ports of pySwitchbot 3.12.0-3.15.1 (Meter Pro weather, CO2 controls, display, calibration,
// comfort and alarm settings). Byte strings and expected values come from pySwitchbot's tests
// (test_meter_pro.py, test_meter_pro_weather.py, test_meter_pro_settings.py).
const hex = (value: string) => Buffer.from(value, 'hex')

function info(deviceType: string): DeviceInfo {
  return { id: 'meter-1', name: 'Meter', deviceType, connectionTypes: ['ble'], mac: 'AA:BB:CC:DD:EE:FF' }
}

type Meter = WoSensorTHPro | WoSensorTHProCO2
type MeterClass = typeof WoSensorTHPro | typeof WoSensorTHProCO2

/** A meter whose BLE commands answer with the given replies in order, then with `fallback` */
function meter<T extends Meter = WoSensorTHPro>(MeterType: MeterClass = WoSensorTHPro, replies: Array<string | undefined> = [], fallback = '01') {
  const device = new MeterType(info(MeterType === WoSensorTHProCO2 ? 'Meter Pro (CO2)' : 'Meter Pro')) as T
  const queue = [...replies]
  const sendBLECommand = vi.fn(async () => {
    const reply = queue.length > 0 ? queue.shift() : fallback
    return { success: true, data: reply === undefined ? undefined : hex(reply) }
  })
  ;(device as any).sendBLECommand = sendBLECommand
  const sent = () => sendBLECommand.mock.calls.map((call: any[]) => Buffer.from(call[0]).toString('hex'))
  const retries = () => sendBLECommand.mock.calls.map((call: any[]) => call[2]?.retry)
  return { device, sendBLECommand, sent, retries }
}

describe('meter Pro class hierarchy', () => {
  it('shares the Meter Pro settings with the CO2 model, which stays a meter', () => {
    const co2 = new WoSensorTHProCO2(info('Meter Pro (CO2)'))
    expect(co2).toBeInstanceOf(WoSensorTHPro)
    expect(co2).toBeInstanceOf(WoSensorTH)
    expect('getCo2Alarm' in new WoSensorTHPro(info('Meter Pro'))).toBe(false)
  })
})

describe('meter Pro weather (pySwitchbot 3.12.0, test_meter_pro_weather.py)', () => {
  const READ = '570f6906'
  const BASELINE = '01003292b5008000008000000080000000'

  it('rounds temperatures half up to tenths and keeps the sign of small values', () => {
    const cases: Array<[number, string]> = [
      [0.5, '0580'],
      [-0.5, '0500'],
      [0, '0080'],
      [19.3, '0393'],
      [-11.7, '070b'],
      [127.9, '09ff'],
      [-127.9, '097f'],
      [18.25, '0392'],
      [-18.25, '0312'],
      [0.04, '0080'],
      [-0.04, '0080'],
      [0.15, '0280'],
    ]
    for (const [temperature, expected] of cases) {
      expect(Buffer.from(encodeMeterProTemperature(temperature)).toString('hex')).toBe(expected)
    }
  })

  for (const response of [BASELINE, BASELINE.slice(0, 10), `${BASELINE.slice(0, 10)}ff`, `${BASELINE}ff`]) {
    for (const MeterType of [WoSensorTHPro, WoSensorTHProCO2]) {
      it(`${MeterType.name}: reads the weather from ${response}`, async () => {
        const { device, sent } = meter(MeterType, [response])
        await expect(device.getWeather()).resolves.toEqual({ icon: MeterProWeatherIcon.None, temperatureC: 18.2, humidity: 53, fahrenheitDisplay: true })
        expect(sent()).toEqual([READ])
      })
    }
  }

  it('reads unset humidity and the temperature independently', async () => {
    const cases: Array<[string, number, number | undefined, boolean]> = [
      ['008000', 0, undefined, false],
      ['000000', 0, undefined, false],
      ['008080', 0, undefined, true],
      ['079200', 18.7, undefined, false],
      ['070b00', -11.7, undefined, false],
      ['008035', 0, 53, false],
      ['000035', 0, 53, false],
      ['050001', -0.5, 1, false],
    ]
    for (const [network, temperatureC, humidity, fahrenheitDisplay] of cases) {
      const { device } = meter(WoSensorTHPro, [`0101${network}`])
      const weather = await device.getWeather()
      expect(weather).toMatchObject({ temperatureC, fahrenheitDisplay })
      expect(weather.humidity).toBe(humidity)
      expect(Object.is(weather.temperatureC, -0)).toBe(false)
    }
  })

  it('rejects invalid weather replies', async () => {
    for (const [response, message] of [
      ['0108008000', /Unknown weather icon 8 \(result=0108008000\)/],
      ['01000a8000', /Invalid weather measurements/],
      ['0100008064', /Invalid weather measurements/],
      [undefined, /result=None/],
      ['', /result=None/],
      ['00', /Unexpected response code/],
      ['01', /Unexpected response len/],
      ['01008000', /Unexpected response len/],
    ] as const) {
      const { device } = meter(WoSensorTHPro, [response])
      await expect(device.getWeather()).rejects.toThrow(message)
    }
  })

  for (const icon of [0, 1, 2, 3, 4, 5, 6, 7]) {
    it(`sets icon ${icon}, keeping the network readings`, async () => {
      const { device, sent, retries } = meter(WoSensorTHPro, [BASELINE, '01', `01${icon.toString(16).padStart(2, '0')}3292b5`])
      await expect(device.setWeather({ icon })).resolves.toBeUndefined()
      expect(sent()).toEqual([READ, `570f6806010${icon}3292b5`, READ])
      // The write is sent once; the reads use the normal retry
      expect(retries()).toEqual([undefined, false, undefined])
    })
  }

  it('writes explicit values', async () => {
    const cases: Array<[number, number, string]> = [
      [18.2, 53, '3292b5'],
      [-11.7, 57, '370bb9'],
      [-0.5, 1, '350081'],
      [0.5, 1, '358081'],
      [0, 99, '3080e3'],
      [127.9, 99, '39ffe3'],
      [-127.9, 1, '397f81'],
      [18.25, 53.5, '3392b6'],
    ]
    for (const [temperatureC, humidity, encoded] of cases) {
      const { device, sent } = meter(WoSensorTHPro, [BASELINE, '01', `0101${encoded}`])
      await device.setWeather({ icon: MeterProWeatherIcon.Sunny, temperatureC, humidity })
      expect(sent()).toEqual([READ, `570f68060101${encoded}`, READ])
    }
  })

  it('updates only the given fields', async () => {
    const cases: Array<[Parameters<WoSensorTHPro['setWeather']>[0], number, string]> = [
      [{ temperatureC: -11.7 }, 0, '370bb5'],
      [{ humidity: 57 }, 0, '3292b9'],
      [{ temperatureC: -11.7, humidity: 57 }, 0, '370bb9'],
      [{ icon: MeterProWeatherIcon.Sunny, temperatureC: -11.7 }, 1, '370bb5'],
      [{ icon: MeterProWeatherIcon.Sunny, humidity: 57 }, 1, '3292b9'],
      [{ temperatureC: 0 }, 0, '3080b5'],
      [{ icon: MeterProWeatherIcon.None, humidity: 57 }, 0, '3292b9'],
    ]
    for (const [update, icon, network] of cases) {
      const { device, sent } = meter(WoSensorTHPro, [BASELINE, '01', `010${icon}${network}`])
      await device.setWeather(update)
      expect(sent()).toEqual([READ, `570f6806010${icon}${network}`, READ])
    }
  })

  it('keeps unavailable fields and ignores extra reply bytes', async () => {
    for (const [update, network] of [[{ temperatureC: -0.5 }, '050000'], [{ humidity: 57 }, '008039']] as const) {
      const { device, sent } = meter(WoSensorTHPro, ['0106008000', '01', `0106${network}`])
      await device.setWeather(update)
      expect(sent()).toEqual([READ, `570f68060106${network}`, READ])
    }
    const { device, sent } = meter(WoSensorTHPro, [`${BASELINE.slice(0, 10)}1122`, '01', `01013292b5${'00'.repeat(20)}`])
    await device.setWeather({ icon: MeterProWeatherIcon.Sunny })
    expect(sent()).toEqual([READ, '570f680601013292b5', READ])
  })

  it('checks the input before sending anything', async () => {
    const bad: Array<[Record<string, unknown>, RegExp]> = [
      [{}, /Supply at least one weather field/],
      [{ icon: -1 }, /MeterProWeatherIcon/],
      [{ icon: 8 }, /MeterProWeatherIcon/],
      [{ icon: true }, /Weather icon/],
      [{ icon: 'sunny' }, /Weather icon/],
      [{ icon: 1.5 }, /Weather icon/],
      [{ temperatureC: 128, humidity: 53 }, /Temperature/],
      [{ temperatureC: -128, humidity: 53 }, /Temperature/],
      [{ temperatureC: 0, humidity: 0 }, /humidity/],
      [{ temperatureC: 0, humidity: 100 }, /humidity/],
      [{ temperatureC: Number.NaN }, /Temperature/],
      [{ temperatureC: Number.POSITIVE_INFINITY }, /Temperature/],
      [{ temperatureC: 0, humidity: Number.NaN }, /humidity/],
      [{ temperatureC: true }, /Temperature/],
      [{ temperatureC: '18.2' }, /Temperature/],
      [{ temperatureC: 18.2, humidity: '53' }, /humidity/],
    ]
    for (const [update, message] of bad) {
      const { device, sendBLECommand } = meter(WoSensorTHPro)
      await expect(device.setWeather(update as any)).rejects.toThrow(message)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
  })

  it('does not roll back a failed write', async () => {
    for (const [replies, count] of [[['00'], 1], [[BASELINE, '00'], 2]] as const) {
      const { device, sendBLECommand } = meter(WoSensorTHPro, [...replies])
      await expect(device.setWeather({ icon: MeterProWeatherIcon.Sunny })).rejects.toThrow(SwitchbotOperationError)
      expect(sendBLECommand).toHaveBeenCalledTimes(count)
    }
  })

  it('reports a read-back mismatch with the expected and actual values', async () => {
    for (const [after, actual] of [[BASELINE, 'actual_icon=0 actual_network=3292b5'], ['01013293b5', 'actual_icon=1 actual_network=3293b5']]) {
      const { device, sendBLECommand } = meter(WoSensorTHPro, [BASELINE, '01', after])
      const error = await device.setWeather({ icon: MeterProWeatherIcon.Sunny }).then(() => new Error('resolved'), (error_: Error) => error_)
      expect(error.message).toContain('Weather readback mismatch; no rollback attempted')
      expect(error.message).toContain('expected_icon=1 expected_network=3292b5')
      expect(error.message).toContain(actual)
      expect(sendBLECommand).toHaveBeenCalledTimes(3)
    }
  })

  it('does not interleave concurrent updates, and keeps working after a failure', async () => {
    const { device, sent } = meter(WoSensorTHPro, [BASELINE, '01', '01013292b5', '01013292b5', '01', '01023292b5'])
    await Promise.all([device.setWeather({ icon: MeterProWeatherIcon.Sunny }), device.setWeather({ icon: MeterProWeatherIcon.Cloudy })])
    expect(sent()).toEqual([READ, '570f680601013292b5', READ, READ, '570f680601023292b5', READ])

    const failing = meter(WoSensorTHPro, ['00', BASELINE, '01', '01013292b5'])
    await expect(failing.device.setWeather({ icon: 1 })).rejects.toThrow()
    await expect(failing.device.setWeather({ icon: 1 })).resolves.toBeUndefined()
  })
})

describe('meter Pro CO2 controls (pySwitchbot 3.13.0, test_meter_pro.py)', () => {
  const co2 = (replies: Array<string | undefined> = [], fallback = '01') => meter<WoSensorTHProCO2>(WoSensorTHProCO2, replies, fallback)

  it('triggers sampling and calibration once', async () => {
    for (const [method, command] of [['triggerCo2Sampling', '570f680b04'], ['startCo2Calibration', '570f680b02']] as const) {
      const { device, sent, retries } = co2()
      await expect(device[method]()).resolves.toBeUndefined()
      expect(sent()).toEqual([command])
      expect(retries()).toEqual([false])
    }
  })

  it('reads the USB power state', async () => {
    for (const [response, powered] of [['0100', false], ['0101', true]] as const) {
      const { device, sent } = co2([response])
      await expect(device.isUsbPowered()).resolves.toBe(powered)
      expect(sent()).toEqual(['570f690b02'])
    }
    await expect(co2(['0102']).device.isUsbPowered()).rejects.toThrow('Unexpected USB power state 02')
  })

  it('reads the update intervals', async () => {
    for (const [method, command, response, seconds] of [
      ['getCo2BatteryUpdateInterval', '570f690b04', '010258', 600],
      ['getCo2BatteryUpdateInterval', '570f690b04', '010708', 1800],
      ['getCo2UsbUpdateInterval', '570f690b03', '01003c', 60],
      ['getCo2UsbUpdateInterval', '570f690b03', '010078', 120],
    ] as const) {
      const { device, sent } = co2([response])
      await expect(device[method]()).resolves.toBe(seconds)
      expect(sent()).toEqual([command])
    }
  })

  it('sets the update intervals', async () => {
    for (const [method, command] of [['setCo2BatteryUpdateInterval', '570f680b06'], ['setCo2UsbUpdateInterval', '570f680b01']] as const) {
      for (const [seconds, payload] of [[1, '0001'], [60, '003c'], [120, '0078'], [600, '0258'], [1800, '0708'], [65535, 'ffff']] as const) {
        const { device, sent } = co2()
        await device[method](seconds)
        expect(sent()).toEqual([command + payload])
      }
      for (const seconds of [true, '600', 600.5, -1, 0, 65536, 0x100000]) {
        const { device, sendBLECommand } = co2()
        await expect(device[method](seconds as any)).rejects.toThrow('1 to 65535 seconds')
        expect(sendBLECommand).not.toHaveBeenCalled()
      }
    }
  })

  it('reads and sets the level thresholds', async () => {
    for (const [response, greenToYellowPpm, yellowToRedPpm] of [['0103e80578', 1000, 1400], ['01044c0578', 1100, 1400]] as const) {
      const { device, sent } = co2([response])
      await expect(device.getCo2LevelThresholds()).resolves.toEqual({ greenToYellowPpm, yellowToRedPpm })
      expect(sent()).toEqual(['570f69020302'])
    }
    for (const [green, red, payload] of [[500, 1000, '01f403e8'], [1100, 1400, '044c0578'], [1900, 2000, '076c07d0']] as const) {
      const { device, sent } = co2()
      await device.setCo2LevelThresholds(green, red)
      expect(sent()).toEqual([`570f68020302${payload}`])
    }
    for (const [green, red, message] of [
      [600, 500, 'must be below'],
      [500, 500, 'must be below'],
      [550, 1000, '100 ppm steps'],
      [500, 1050, '100 ppm steps'],
      [-100, 1000, '100 ppm steps'],
      [500, 65600, '100 ppm steps'],
      [true, 1000, '100 ppm steps'],
      [500, '1000', '100 ppm steps'],
    ] as const) {
      const { device, sendBLECommand } = co2()
      await expect(device.setCo2LevelThresholds(green as any, red as any)).rejects.toThrow(message)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
  })

  it('rejects unsuccessful and short replies', async () => {
    const calls: Array<[keyof WoSensorTHProCO2, unknown[]]> = [
      ['triggerCo2Sampling', []],
      ['startCo2Calibration', []],
      ['isUsbPowered', []],
      ['getCo2BatteryUpdateInterval', []],
      ['getCo2UsbUpdateInterval', []],
      ['setCo2UsbUpdateInterval', [120]],
      ['setCo2BatteryUpdateInterval', [600]],
      ['getCo2LevelThresholds', []],
      ['setCo2LevelThresholds', [1000, 1400]],
    ]
    for (const [method, args] of calls) {
      for (const [response, shown] of [[undefined, 'None'], ['02', '02'], ['03', '03'], ['05', '05']] as const) {
        const { device } = co2([response])
        await expect((device[method] as any)(...args)).rejects.toThrow(`result=${shown}`)
      }
    }
    for (const [method, response] of [
      ['isUsbPowered', '01'],
      ['getCo2BatteryUpdateInterval', '0102'],
      ['getCo2UsbUpdateInterval', '0100'],
      ['getCo2LevelThresholds', '0103e805'],
    ] as const) {
      await expect(co2([response]).device[method]()).rejects.toThrow(`Unexpected response len for ${method}`)
    }
  })
})

describe('meter Pro display and calibration settings (pySwitchbot 3.14.0, test_meter_pro_settings.py)', () => {
  // Captured from a Meter Pro (firmware 1.9): middle zone shows this device with the indoor
  // icon, bottom zone an Indoor/Outdoor Meter with the outdoor icon, data update every 600 s,
  // DD/MM, battery icon always shown.
  const DISPLAY_SETTINGS = '011253000000000000d4e5f6a1b2c30258010101'

  it('reads the display settings', async () => {
    const { device, sent } = meter(WoSensorTHPro, [DISPLAY_SETTINGS])
    await expect(device.getDisplaySettings()).resolves.toEqual({
      middle: { icon: MeterProZoneIcon.Indoor, source: MeterProDisplaySource.MeterPro, sourceMac: undefined },
      bottom: { icon: MeterProZoneIcon.Outdoor, source: MeterProDisplaySource.IndoorOutdoorMeter, sourceMac: 'D4:E5:F6:A1:B2:C3' },
      dataUpdateInterval: 600,
      dateFormat: MeterProDateFormat.DayMonth,
      batteryIconAlways: true,
    })
    expect(sent()).toEqual(['570f690701'])
  })

  it('reads the factory state, unknown values and short replies', async () => {
    const factory = await meter(WoSensorTHPro, ['0110500000000000000000000000000258000100']).device.getDisplaySettings()
    expect(factory.bottom).toEqual({ icon: undefined, source: MeterProDisplaySource.None, sourceMac: undefined })
    expect(factory.dateFormat).toBe(MeterProDateFormat.MonthDay)
    expect(factory.batteryIconAlways).toBe(false)

    for (const [date, battery, dateFormat, batteryIconAlways] of [[0x02, 0x00, undefined, false], [0x00, 0xFE, MeterProDateFormat.MonthDay, undefined], [0xFF, 0xFF, undefined, undefined]] as const) {
      const response = hex(DISPLAY_SETTINGS)
      response[17] = date
      response[19] = battery
      const settings = await meter(WoSensorTHPro, [response.toString('hex')]).device.getDisplaySettings()
      expect(settings).toMatchObject({ dataUpdateInterval: 600 })
      expect(settings.dateFormat).toBe(dateFormat)
      expect(settings.batteryIconAlways).toBe(batteryIconAlways)
    }

    const older = await meter(WoSensorTHPro, [DISPLAY_SETTINGS.slice(0, 30)]).device.getDisplaySettings()
    expect(older.bottom.sourceMac).toBe('D4:E5:F6:A1:B2:C3')
    expect([older.dataUpdateInterval, older.dateFormat, older.batteryIconAlways]).toEqual([undefined, undefined, undefined])
  })

  it('keeps unknown icon and source codes as numbers', async () => {
    expect((await meter(WoSensorTHPro, ['011257000000000000aabbccddeeff0258010101']).device.getDisplaySettings()).bottom.source).toBe(7)
    const icons = await meter(WoSensorTHPro, ['013053000000000000aabbccddeeff0258010101']).device.getDisplaySettings()
    expect([icons.middle.icon, icons.bottom.icon]).toEqual([3, undefined])
    for (const [iconByte, middle, bottom] of [['f1', undefined, MeterProZoneIcon.Indoor], ['2f', MeterProZoneIcon.Outdoor, undefined]] as const) {
      const settings = await meter(WoSensorTHPro, [`01${iconByte}${DISPLAY_SETTINGS.slice(4)}`]).device.getDisplaySettings()
      expect([settings.middle.icon, settings.bottom.icon]).toEqual([middle, bottom])
    }
    const sources = await meter(WoSensorTHPro, ['011289aabbccddee01aabbccddee020258010101']).device.getDisplaySettings()
    expect([sources.middle.source, sources.bottom.source]).toEqual([MeterProDisplaySource.WeatherStation, MeterProDisplaySource.Hub3])
  })

  it('rejects failed and short display settings replies', async () => {
    for (const response of ['02', '011253000000']) {
      await expect(meter(WoSensorTHPro, [response]).device.getDisplaySettings()).rejects.toThrow(SwitchbotOperationError)
    }
  })

  it('sets a display zone', async () => {
    const cases: Array<[MeterProDisplayZone, MeterProDisplaySource, string | undefined, MeterProZoneIcon | undefined, string]> = [
      [MeterProDisplayZone.Bottom, MeterProDisplaySource.IndoorOutdoorMeter, 'D4:E5:F6:A1:B2:C3', MeterProZoneIcon.Outdoor, '570f680701020203d4e5f6a1b2c3'],
      [MeterProDisplayZone.Bottom, MeterProDisplaySource.Network, undefined, MeterProZoneIcon.Outdoor, '570f680701020206000000000000'],
      [MeterProDisplayZone.Bottom, MeterProDisplaySource.None, undefined, undefined, '570f68070102ff00000000000000'],
      [MeterProDisplayZone.Middle, MeterProDisplaySource.MeterPro, undefined, MeterProZoneIcon.Indoor, '570f680701010105000000000000'],
      [MeterProDisplayZone.Middle, MeterProDisplaySource.MeterPlus, 'aa-bb-cc-dd-ee-ff', undefined, '570f68070101ff02aabbccddeeff'],
    ]
    for (const [zone, source, mac, icon, payload] of cases) {
      const { device, sent } = meter()
      await device.setDisplayZone(zone, source, mac, icon)
      expect(sent()).toEqual([payload])
    }
  })

  it('rejects an invalid display zone before sending', async () => {
    for (const [source, mac] of [
      [MeterProDisplaySource.Meter, undefined],
      [MeterProDisplaySource.Network, 'aa:bb:cc:dd:ee:ff'],
      [MeterProDisplaySource.None, 'aa:bb:cc:dd:ee:ff'],
      [MeterProDisplaySource.Meter, 'aa:bb:cc'],
      [MeterProDisplaySource.Meter, 'zz:bb:cc:dd:ee:ff'],
    ] as const) {
      const { device, sendBLECommand } = meter()
      await expect(device.setDisplayZone(MeterProDisplayZone.Bottom, source, mac)).rejects.toThrow(SwitchbotOperationError)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
  })

  it('sets the zone icons, update interval, date format, battery icon and unit', async () => {
    const cases: Array<[(device: WoSensorTHPro) => Promise<void>, string]> = [
      [d => d.setZoneIcons(MeterProZoneIcon.Indoor, MeterProZoneIcon.Outdoor), '570f680701030102'],
      [d => d.setZoneIcons(undefined, MeterProZoneIcon.Indoor), '570f680701030f01'],
      [d => d.setZoneIcons(MeterProZoneIcon.Outdoor), '570f68070103020f'],
      [d => d.setDataUpdateInterval(300), '570f68070105012c'],
      [d => d.setDataUpdateInterval(600), '570f680701050258'],
      [d => d.setDataUpdateInterval(1800), '570f680701050708'],
      [d => d.setDateFormat(MeterProDateFormat.MonthDay), '570f6807010700'],
      [d => d.setDateFormat(MeterProDateFormat.DayMonth), '570f6807010701'],
      [d => d.setBatteryIcon(true), '570f6807010801'],
      [d => d.setBatteryIcon(false), '570f6807010800'],
      [d => d.setTemperatureUnit(true), '570f6807010901'],
      [d => d.setTemperatureUnit(false), '570f6807010900'],
      [d => d.setButtonFunctions(true, false), '570f680701060000'],
      [d => d.setButtonFunctions(false, true), '570f680701060101'],
      [d => d.setButtonFunctions(undefined, true), '570f68070106ff01'],
      [d => d.setButtonFunctions(false), '570f6807010601ff'],
      [d => d.setDisplayZone(2, 3, 'D4:E5:F6:A1:B2:C3', 2), '570f680701020203d4e5f6a1b2c3'],
    ]
    for (const [call, payload] of cases) {
      for (const MeterType of [WoSensorTHPro, WoSensorTHProCO2]) {
        const { device, sent } = meter(MeterType)
        await call(device)
        expect(sent()).toEqual([payload])
      }
    }
  })

  it('rejects wrong setting types and values before sending', async () => {
    const calls: Array<(device: any) => Promise<void>> = [
      d => d.setDisplayZone(3, MeterProDisplaySource.None),
      d => d.setDisplayZone('bottom', MeterProDisplaySource.None),
      d => d.setDisplayZone(MeterProDisplayZone.Bottom, 15),
      d => d.setDisplayZone(MeterProDisplayZone.Bottom, true),
      d => d.setDisplayZone(MeterProDisplayZone.Bottom, MeterProDisplaySource.None, undefined, 9),
      d => d.setZoneIcons(3),
      d => d.setZoneIcons(undefined, 'outdoor'),
      d => d.setDateFormat(2),
      d => d.setDateFormat('DD/MM'),
      d => d.setBatteryIcon('false'),
      d => d.setBatteryIcon(1),
      d => d.setTemperatureUnit(0),
      d => d.setButtonFunctions('off'),
      d => d.setButtonFunctions(undefined, 1),
      ...[0, -1, 0x10000, true, 300.5, '300'].map(seconds => (d: any) => d.setDataUpdateInterval(seconds)),
    ]
    for (const call of calls) {
      const { device, sendBLECommand } = meter()
      await expect(call(device)).rejects.toThrow(SwitchbotOperationError)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
  })

  it('reads the button functions', async () => {
    for (const [response, unitSwitch, sourceSwitch] of [
      ['010101', false, true],
      ['010000', true, false],
      ['01ff01', undefined, true],
      ['0100ff', true, undefined],
      ['01ffff', undefined, undefined],
      ['010202', undefined, undefined],
    ] as const) {
      const { device, sent } = meter(WoSensorTHPro, [response])
      await expect(device.getButtonFunctions()).resolves.toEqual({ unitSwitch, sourceSwitch })
      expect(sent()).toEqual(['570f690704'])
    }
  })

  it('reads the calibration', async () => {
    for (const [response, temperature, humidity] of [
      ['01000000', 0, 0],
      ['01808000', 0, 0],
      ['01018305', -1.5, 3],
      ['01820a03', 2.3, -10],
      ['01800005', 0.5, 0],
      ['01808015', 0.5, 0],
    ] as const) {
      const { device, sent } = meter(WoSensorTHPro, [response])
      const calibration = await device.getCalibration()
      expect(calibration).toEqual({ temperature, humidity })
      expect(Object.is(calibration.temperature, -0) || Object.is(calibration.humidity, -0)).toBe(false)
      expect(sent()).toEqual(['570f6903'])
    }
    for (const response of ['0180800a', '0180e400', '01806400', '018080fa']) {
      await expect(meter(WoSensorTHPro, [response]).device.getCalibration()).rejects.toThrow('Invalid calibration response')
    }
    await expect(meter(WoSensorTHPro, ['0101']).device.getCalibration()).rejects.toThrow(SwitchbotOperationError)
  })

  it('sets the calibration', async () => {
    for (const [temperature, humidity, payload] of [
      [0, 0, '570f6803808000'],
      [-1.5, 3, '570f6803018305'],
      [2.3, -10, '570f6803820a03'],
      [0.5, 0, '570f6803808005'],
      [-0.5, 0, '570f6803008005'],
      [1.25, 0, '570f6803818003'],
      [1, 1, '570f6803818100'],
    ] as const) {
      const { device, sent } = meter()
      await device.setCalibration(temperature, humidity)
      expect(sent()).toEqual([payload])
    }
    for (const [temperature, humidity] of [[128, 0], [-128, 0], [0, 100], [0, -100], [0, true], [0, 0.5], [0, '1']]) {
      const { device, sendBLECommand } = meter()
      await expect(device.setCalibration(temperature as any, humidity as any)).rejects.toThrow(SwitchbotOperationError)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
  })

  it('raises when the meter refuses a setting', async () => {
    const calls: Array<(device: WoSensorTHPro) => Promise<void>> = [
      d => d.setCalibration(1, 1),
      d => d.setDisplayZone(MeterProDisplayZone.Bottom, MeterProDisplaySource.None),
      d => d.setZoneIcons(MeterProZoneIcon.Indoor),
      d => d.setDataUpdateInterval(600),
      d => d.setDateFormat(MeterProDateFormat.DayMonth),
      d => d.setBatteryIcon(true),
      d => d.setTemperatureUnit(false),
      d => d.setButtonFunctions(true, true),
    ]
    for (const call of calls) {
      await expect(call(meter(WoSensorTHPro, [], '05').device)).rejects.toThrow(SwitchbotOperationError)
    }
  })
})

describe('meter Pro comfort and alarm settings (pySwitchbot 3.15.0, test_meter_pro_settings.py)', () => {
  it('reads the comfort level', async () => {
    for (const [MeterType, response, expected] of [
      [WoSensorTHPro, '01009c4600921e00', { custom: false, temperatureLowC: 18, temperatureHighC: 28, humidityLow: 30, humidityHigh: 70, status: MeterProComfortStatus.Comfortable }],
      [WoSensorTHProCO2, '010180e3730080fe', { custom: true, temperatureLowC: -0.3, temperatureHighC: 0.7, humidityLow: 0, humidityHigh: 99, status: MeterProComfortStatus.Wet }],
    ] as const) {
      const { device, sent } = meter(MeterType, [response])
      await expect(device.getComfortLevel()).resolves.toEqual(expected)
      expect(sent()).toEqual(['570f69020101'])
    }
    for (const response of ['02', '01', '01029c4600921e00', '01009c460a921e00', '01009c6400921e00']) {
      await expect(meter(WoSensorTHPro, [response]).device.getComfortLevel()).rejects.toThrow(SwitchbotOperationError)
    }
  })

  it('sets the comfort level', async () => {
    for (const [limits, custom, payload] of [
      [[0.5, 22.34, 40, 82], true, '889652358028'],
      [[-0.5, 0.66, 0, 99], true, '888063750000'],
      [[18.0, 28.0, 30, 70], false, '809c4600921e'],
    ] as const) {
      const { device, sent } = meter()
      await device.setComfortLevel(limits[0], limits[1], limits[2], limits[3], { custom })
      expect(sent()).toEqual([`570f680201${payload}`])
    }
    for (const [limits, custom, message] of [
      [[-128, 28, 30, 70], true, 'Temperature must be'],
      [[true, 28, 30, 70], true, 'Temperature must be'],
      [[18.01, 18.04, 30, 70], true, 'Lower comfort limits'],
      [[18, 28, 30, 100], true, 'Humidity limits'],
      [[18, 28, true, 70], true, 'Humidity limits'],
      [[18, 28, 70, 70], true, 'Lower comfort limits'],
      [[18, 28, 30, 70], 1, 'custom must be a boolean'],
    ] as const) {
      const { device, sendBLECommand } = meter()
      await expect((device.setComfortLevel as any)(...limits, { custom })).rejects.toThrow(message)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
    await expect(meter(WoSensorTHPro, [], '02').device.setComfortLevel(18, 28, 30, 70)).rejects.toThrow('setComfortLevel')
  })

  it('reads the alarm settings', async () => {
    for (const [MeterType, response, mode, volume] of [
      [WoSensorTHPro, '010000', MeterProAlarmMode.Disabled, undefined],
      [WoSensorTHProCO2, '010402', MeterProAlarmMode.SoundAndFlash, MeterProAlarmVolume.High],
      [WoSensorTHPro, '01ff01', MeterProAlarmMode.FlashOnly, undefined],
    ] as const) {
      const { device, sent } = meter(MeterType, [response])
      await expect(device.getAlarmSettings()).resolves.toEqual({ mode, volume })
      expect(sent()).toEqual(['570f690204'])
    }
    for (const response of ['02', '0100', '010403']) {
      await expect(meter(WoSensorTHPro, [response]).device.getAlarmSettings()).rejects.toThrow(SwitchbotOperationError)
    }
  })

  it('sets the alarm settings', async () => {
    for (const [mode, volume, payload] of [
      [MeterProAlarmMode.Disabled, undefined, 'ff00'],
      [MeterProAlarmMode.FlashOnly, MeterProAlarmVolume.Off, '0101'],
      [MeterProAlarmMode.SoundAndFlash, MeterProAlarmVolume.Low, '0202'],
      [MeterProAlarmMode.SoundAndFlash, MeterProAlarmVolume.Medium, '0302'],
      [MeterProAlarmMode.SoundAndFlash, MeterProAlarmVolume.High, '0402'],
    ] as const) {
      const { device, sent } = meter()
      await device.setAlarmSettings(mode, volume)
      expect(sent()).toEqual([`570f680204${payload}`])
    }
    for (const [mode, volume, message] of [[true, undefined, 'mode must be'], [MeterProAlarmMode.Disabled, 5, 'volume must be']] as const) {
      const { device, sendBLECommand } = meter()
      await expect(device.setAlarmSettings(mode as any, volume as any)).rejects.toThrow(message)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
    await expect(meter(WoSensorTHPro, [], '02').device.setAlarmSettings(MeterProAlarmMode.Disabled)).rejects.toThrow('setAlarmSettings')
  })

  it('reads the temperature and humidity alarm', async () => {
    const { device, sent } = meter(WoSensorTHProCO2, ['014297a745009423'])
    await expect(device.getTemperatureHumidityAlarm()).resolves.toEqual({
      mode: THAlarm.TemperatureHigh | THAlarm.HumidityInRange,
      temperatureLowC: -0.5,
      temperatureHighC: 23.4,
      humidityLow: 20,
      humidityHigh: 39,
      temperatureStatus: MeterProTemperatureHumidityAlarmStatus.High,
      humidityStatus: MeterProTemperatureHumidityAlarmStatus.InRange,
    })
    expect(sent()).toEqual(['570f69020100'])
    await expect(meter(WoSensorTHPro, ['0100000000000000']).device.getTemperatureHumidityAlarm()).resolves.toEqual({
      mode: THAlarm.Disabled,
      temperatureLowC: 0,
      temperatureHighC: 0,
      humidityLow: 0,
      humidityHigh: 0,
      temperatureStatus: MeterProTemperatureHumidityAlarmStatus.None,
      humidityStatus: MeterProTemperatureHumidityAlarmStatus.None,
    })
    const { High, None, InRange } = MeterProTemperatureHumidityAlarmStatus
    for (const [response, temperatureStatus, humidityStatus] of [
      ['0122963695000a20', High, None],
      ['0122a32795000a02', None, High],
      ['0122972735001822', High, High],
      ['0122963695000aec', High, None],
      ['0122a32795000ace', None, High],
      ['014297a7450094ff', InRange, InRange],
    ] as const) {
      await expect(meter(WoSensorTHPro, [response]).device.getTemperatureHumidityAlarm()).resolves.toMatchObject({ temperatureStatus, humidityStatus })
    }
    for (const response of ['02', '01000000000000', '01009c460a921e00', '01009c6400921e00']) {
      await expect(meter(WoSensorTHPro, [response]).device.getTemperatureHumidityAlarm()).rejects.toThrow(SwitchbotOperationError)
    }
  })

  it('sets the temperature and humidity alarm', async () => {
    for (const [mode, limits, payload] of [
      [THAlarm.Disabled, [0, 0, 0, 0], '008000008000'],
      [THAlarm.TemperatureHigh | THAlarm.HumidityHigh, [-0.5, 23.34, 20, 39], '229727350014'],
      [THAlarm.TemperatureInRange | THAlarm.HumidityInRange, [0.5, 0.5, 0, 99], '448063558000'],
    ] as const) {
      const { device, sent } = meter()
      await device.setTemperatureHumidityAlarm(mode, limits[0], limits[1], limits[2], limits[3])
      expect(sent()).toEqual([`570f680201${payload}`])
    }
    for (const [mode, limits, message] of [
      [true, [18, 28, 30, 70], 'Invalid temperature and humidity alarm mode'],
      [0x88, [18, 28, 30, 70], 'Invalid temperature and humidity alarm mode'],
      [0x08, [18, 28, 30, 70], 'Invalid temperature and humidity alarm mode'],
      [THAlarm.Disabled, [-128, 28, 30, 70], 'Temperature must be'],
      [THAlarm.Disabled, [18, 28, true, 70], 'Humidity limits'],
      [THAlarm.Disabled, [18, 28, 30, 100], 'Humidity limits'],
      [THAlarm.TemperatureInRange, [28, 18, 30, 70], 'Lower in-range alarm limits'],
      [THAlarm.HumidityInRange, [18, 28, 70, 30], 'Lower in-range alarm limits'],
    ] as const) {
      const { device, sendBLECommand } = meter()
      await expect((device.setTemperatureHumidityAlarm as any)(mode, ...limits)).rejects.toThrow(message)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
    await expect(meter(WoSensorTHPro, [], '02').device.setTemperatureHumidityAlarm(THAlarm.Disabled, 0, 0, 0, 0)).rejects.toThrow('setTemperatureHumidityAlarm')
  })

  it('reads the CO2 alarm', async () => {
    const { Custom, Low, High } = MeterProCO2AlarmMode
    for (const [response, mode, status] of [
      ['01000578019000', MeterProCO2AlarmMode.Disabled, MeterProCO2AlarmStatus.None],
      ['010b05780190fe', Custom | Low | High, MeterProCO2AlarmStatus.High],
      ['01840578019003', 0x84, MeterProCO2AlarmStatus.InRange],
    ] as const) {
      const { device, sent } = meter<WoSensorTHProCO2>(WoSensorTHProCO2, [response])
      await expect(device.getCo2Alarm()).resolves.toEqual({ mode, lowPpm: 400, highPpm: 1400, status })
      expect(sent()).toEqual(['570f69020301'])
    }
    for (const response of ['02', '010005780190']) {
      await expect(meter<WoSensorTHProCO2>(WoSensorTHProCO2, [response]).device.getCo2Alarm()).rejects.toThrow('getCo2Alarm')
    }
  })

  it('sets the CO2 alarm', async () => {
    const { Disabled, Low, High, InRange, Custom } = MeterProCO2AlarmMode
    for (const [mode, low, high, payload] of [
      [Disabled, 400, 1400, '0005780190'],
      [Low, 401, 1101, '01044d0191'],
      [High, 0, 0xFFFF, '02ffff0000'],
      [Low | High, 425, 2000, '0307d001a9'],
      [InRange, 1200, 1200, '0404b004b0'],
      [High | Custom, 425, 2000, '0a07d001a9'],
    ] as const) {
      const { device, sent } = meter<WoSensorTHProCO2>(WoSensorTHProCO2)
      await device.setCo2Alarm(mode, low, high)
      expect(sent()).toEqual([`570f68020301${payload}`])
    }
    for (const [mode, low, high, message] of [
      [true, 400, 1400, 'Invalid CO2 alarm mode'],
      [0x10, 400, 1400, 'Invalid CO2 alarm mode'],
      [Low, true, 1400, 'unsigned 16-bit integers'],
      [Low, -1, 1400, 'unsigned 16-bit integers'],
      [Low, 400, 0x10000, 'unsigned 16-bit integers'],
      [Low, 400, 1400.5, 'unsigned 16-bit integers'],
      [InRange, 1400, 400, 'Lower CO2 alarm limit'],
    ] as const) {
      const { device, sendBLECommand } = meter<WoSensorTHProCO2>(WoSensorTHProCO2)
      await expect(device.setCo2Alarm(mode as any, low as any, high)).rejects.toThrow(message)
      expect(sendBLECommand).not.toHaveBeenCalled()
    }
    await expect(meter<WoSensorTHProCO2>(WoSensorTHProCO2, [], '02').device.setCo2Alarm(Disabled, 400, 1400)).rejects.toThrow('setCo2Alarm')
  })
})
