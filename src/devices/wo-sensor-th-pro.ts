/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-sensor-th-pro.ts: SwitchBot v4.0.0 - Meter Pro
 */

import { Buffer } from 'node:buffer'

import { SwitchbotOperationError } from '../errors.js'
import { WoSensorTH } from './wo-sensor-th.js'

/** Weather icons on the Meter Pro and Meter Pro CO2 screen (pySwitchbot MeterProWeatherIcon) */
export enum MeterProWeatherIcon {
  None = 0,
  Sunny = 1,
  Cloudy = 2,
  Overcast = 3,
  LightRain = 4,
  HeavyRain = 5,
  LightSnow = 6,
  HeavySnow = 7,
}

/** Configurable areas of the Meter Pro screen (pySwitchbot MeterProDisplayZone) */
export enum MeterProDisplayZone {
  Middle = 1,
  Bottom = 2,
}

/** Icon shown next to a display zone (pySwitchbot MeterProZoneIcon) */
export enum MeterProZoneIcon {
  Indoor = 1,
  Outdoor = 2,
}

/** Where a display zone takes its temperature and humidity from (pySwitchbot MeterProDisplaySource) */
export enum MeterProDisplaySource {
  None = 0,
  Meter = 1,
  MeterPlus = 2,
  IndoorOutdoorMeter = 3,
  /** Hub 2 and Hub Mini Matter */
  Hub = 4,
  /** This device when the MAC is empty, else another Meter Pro */
  MeterPro = 5,
  /** Values written with setWeather */
  Network = 6,
  WeatherStation = 8,
  Hub3 = 9,
}

/** Date layout on the screen (pySwitchbot MeterProDateFormat) */
export enum MeterProDateFormat {
  MonthDay = 0,
  DayMonth = 1,
}

/** Current temperature and humidity comfort status (pySwitchbot MeterProComfortStatus) */
export enum MeterProComfortStatus {
  Comfortable = 0,
  Dry = 1,
  Wet = 2,
  Unavailable = 3,
}

/** How the meter signals a local threshold alarm (pySwitchbot MeterProAlarmMode) */
export enum MeterProAlarmMode {
  Disabled = 0,
  FlashOnly = 1,
  SoundAndFlash = 2,
}

/** Alarm buzzer volume (pySwitchbot MeterProAlarmVolume) */
export enum MeterProAlarmVolume {
  Off = 1,
  Low = 2,
  Medium = 3,
  High = 4,
}

/** CO2 alarm conditions, combined as bit flags, and the protocol's custom-setting bit (pySwitchbot MeterProCO2AlarmMode) */
export enum MeterProCO2AlarmMode {
  Disabled = 0,
  Low = 0x01,
  High = 0x02,
  InRange = 0x04,
  Custom = 0x08,
}

/** Current CO2 alarm (pySwitchbot MeterProCO2AlarmStatus) */
export enum MeterProCO2AlarmStatus {
  None = 0,
  Low = 1,
  High = 2,
  InRange = 3,
}

/** Local alarm conditions for the temperature and humidity limits, combined as bit flags (pySwitchbot MeterProTemperatureHumidityAlarmMode) */
export enum MeterProTemperatureHumidityAlarmMode {
  Disabled = 0,
  TemperatureLow = 0x01,
  TemperatureHigh = 0x02,
  TemperatureInRange = 0x04,
  HumidityLow = 0x10,
  HumidityHigh = 0x20,
  HumidityInRange = 0x40,
}

/** Current alarm state of the temperature or humidity measurement (pySwitchbot MeterProTemperatureHumidityAlarmStatus) */
export enum MeterProTemperatureHumidityAlarmStatus {
  None = 0,
  Low = 1,
  High = 2,
  InRange = 3,
}

/** Comfort mode, limits and status (getComfortLevel) */
export interface MeterProComfortLevel {
  /** Custom limits; false for the default comfort mode */
  custom: boolean
  temperatureLowC: number
  temperatureHighC: number
  humidityLow: number
  humidityHigh: number
  status: MeterProComfortStatus
}

/** Local temperature and humidity alarm (getTemperatureHumidityAlarm) */
export interface MeterProTemperatureHumidityAlarm {
  /** MeterProTemperatureHumidityAlarmMode flags */
  mode: number
  temperatureLowC: number
  temperatureHighC: number
  humidityLow: number
  humidityHigh: number
  temperatureStatus: MeterProTemperatureHumidityAlarmStatus
  humidityStatus: MeterProTemperatureHumidityAlarmStatus
}

/** Local alarm signalling (getAlarmSettings); volume undefined for an unrecognised value */
export interface MeterProAlarmSettings {
  mode: MeterProAlarmMode
  volume?: MeterProAlarmVolume
}

/** Temperature (C) and humidity (%RH) corrections (getCalibration) */
export interface MeterProCalibration {
  temperature: number
  humidity: number
}

/** One display zone (getDisplaySettings) */
export interface MeterProZoneSettings {
  /** undefined when unset or held; an unknown code is kept as its number */
  icon?: MeterProZoneIcon | number
  /** An unknown code is kept as its number */
  source: MeterProDisplaySource | number
  /** undefined when the zone shows this device or network data */
  sourceMac?: string
}

/** Screen settings (getDisplaySettings); missing or unknown values are undefined */
export interface MeterProDisplaySettings {
  middle: MeterProZoneSettings
  bottom: MeterProZoneSettings
  dataUpdateInterval?: number
  dateFormat?: MeterProDateFormat
  batteryIconAlways?: boolean
}

/** Button functions (getButtonFunctions); undefined for reserved or unknown values */
export interface MeterProButtonFunctions {
  /** The button switches the temperature unit */
  unitSwitch?: boolean
  /** The button switches the display source */
  sourceSwitch?: boolean
}

/** Network weather shown on the screen (getWeather) */
export interface MeterProWeather {
  icon: MeterProWeatherIcon
  temperatureC: number
  /** undefined when unset */
  humidity?: number
  fahrenheitDisplay: boolean
}

/** Weather fields to write (setWeather); omitted fields keep their current value */
export interface MeterProWeatherUpdate {
  icon?: MeterProWeatherIcon | number
  /** Celsius, -127.9..127.9, rounded half up to tenths */
  temperatureC?: number
  /** %RH, 1..99, rounded half up */
  humidity?: number
}

// BLE commands (pySwitchbot switchbot/devices/meter_pro.py)
const COMMAND_GET_WEATHER = '570f6906'
const COMMAND_SET_WEATHER = '570f680601'
const COMMAND_GET_COMFORT_LEVEL = '570f69020101'
const COMMAND_GET_TEMPERATURE_HUMIDITY_ALARM = '570f69020100'
const COMMAND_SET_TEMPERATURE_HUMIDITY_LIMITS = '570f680201'
const COMMAND_GET_ALARM_SETTINGS = '570f690204'
const COMMAND_SET_ALARM_SETTINGS = '570f680204'
const COMMAND_GET_CALIBRATION = '570f6903'
const COMMAND_SET_CALIBRATION = '570f6803'
const COMMAND_GET_DISPLAY_SETTINGS = '570f690701'
const COMMAND_SET_DISPLAY_ZONE = '570f680701'
const COMMAND_SET_ZONE_ICONS = '570f68070103'
const COMMAND_SET_DATA_UPDATE_INTERVAL = '570f68070105'
const COMMAND_GET_BUTTON_FUNCTIONS = '570f690704'
const COMMAND_SET_BUTTON_FUNCTIONS = '570f68070106'
const COMMAND_SET_DATE_FORMAT = '570f68070107'
const COMMAND_SET_BATTERY_ICON = '570f68070108'
const COMMAND_SET_TEMPERATURE_UNIT = '570f68070109'

const MAX_HUMIDITY_CALIBRATION = 99
const MAX_DATA_UPDATE_INTERVAL = 0xFFFF
const NO_MAC = '000000000000'
// "Keep current value" differs between the single-zone and two-icon commands
const KEEP_ZONE_ICON = 0xFF
const KEEP_ICON = 0x0F
const KEEP_BUTTON_FUNCTION = 0xFF
const KEEP_ALARM_VOLUME = 0xFF
const TEMPERATURE_HUMIDITY_ALARM_MASK = 0x77
const SOURCES_WITHOUT_MAC = new Set<number>([MeterProDisplaySource.None, MeterProDisplaySource.Network])
const MAC_HEX_REGEX = /^[0-9a-f]{12}$/
const MAC_SEPARATOR_REGEX = /[:-]/g

const hex2 = (value: number) => value.toString(16).padStart(2, '0')
const u16 = (value: number) => value.toString(16).padStart(4, '0')

/** An integer, not a boolean or a fractional number */
export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

/** Round a non-negative value half up, after removing binary floating-point noise (0.15 * 10) */
function roundHalfUp(value: number): number {
  return Math.round(Number(value.toPrecision(12)))
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value === 'boolean') {
    throw new TypeError(`${name} must be a number, not a boolean`)
  }
  if (typeof value !== 'number') {
    throw new TypeError(`${name} must be a number`)
  }
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
  return value
}

/**
 * Encode a Celsius temperature as the meter's two bytes, [tenths, sign << 7 | degrees], with
 * the sign bit set for a positive value (pySwitchbot `_encode_weather_temperature`).
 */
export function encodeMeterProTemperature(temperatureC: number): [number, number] {
  const temperature = finiteNumber(temperatureC, 'Temperature')
  if (Math.abs(temperature) > 127.9) {
    throw new RangeError('Temperature must be -127.9..127.9 C')
  }
  const tenths = roundHalfUp(Math.abs(temperature) * 10)
  const positive = temperature >= 0 || tenths === 0
  return [tenths % 10, Math.floor(tenths / 10) | (positive ? 0x80 : 0)]
}

function decodeThresholdTemperature(signedDegrees: number, tenths: number): number {
  const magnitude = (signedDegrees & 0x7F) * 10 + tenths
  return ((signedDegrees & 0x80) ? magnitude : -magnitude) / 10 || 0
}

/** [high, humid, tenths high << 4 | tenths low, low, dry] -> [low C, high C, dry %, humid %] */
function decodeTemperatureHumidityLimits(data: Buffer): [number, number, number, number] {
  const [high, humidRaw, decimals, low, dryRaw] = data
  const highTenths = decimals >> 4
  const lowTenths = decimals & 0x0F
  const humid = humidRaw & 0x7F
  const dry = dryRaw & 0x7F
  if (Math.max(highTenths, lowTenths) > 9 || Math.max(humid, dry) > 99) {
    throw new RangeError('Invalid temperature or humidity limits')
  }
  return [
    decodeThresholdTemperature(low, lowTenths),
    decodeThresholdTemperature(high, highTenths),
    dry,
    humid,
  ]
}

function encodeTemperatureHumidityLimits(temperatureLowC: number, temperatureHighC: number, humidityLow: number, humidityHigh: number): Buffer {
  const [lowTenths, low] = encodeMeterProTemperature(temperatureLowC)
  const [highTenths, high] = encodeMeterProTemperature(temperatureHighC)
  if ([humidityLow, humidityHigh].some(limit => !isInteger(limit) || limit < 0 || limit > 99)) {
    throw new RangeError('Humidity limits must be integers from 0 to 99')
  }
  return Buffer.from([high, humidityHigh, (highTenths << 4) | lowTenths, low, humidityLow])
}

function encodeWeatherHumidity(humidity: number): number {
  const relativeHumidity = finiteNumber(humidity, 'humidity')
  if (relativeHumidity < 1 || relativeHumidity > 99) {
    throw new RangeError('humidity must be 1..99%')
  }
  return roundHalfUp(relativeHumidity)
}

/** Check that a value is one of a numeric enum's values */
export function coerceEnum<E extends Record<string, string | number>>(enumObject: E, value: unknown, name: string, enumName: string): E[keyof E] {
  if (!isInteger(value)) {
    throw new TypeError(`${name} must be a ${enumName} or integer`)
  }
  if (typeof (enumObject as Record<number, unknown>)[value] !== 'string') {
    throw new RangeError(`${value} is not a valid ${enumName}`)
  }
  return value as E[keyof E]
}

function enumOrUndefined<E extends Record<string, string | number>>(enumObject: E, value: number): E[keyof E] | undefined {
  return typeof (enumObject as Record<number, unknown>)[value] === 'string' ? value as E[keyof E] : undefined
}

/** A MAC address as 12 lowercase hex digits, all zeros when empty */
function macHex(mac: string | undefined): string {
  if (!mac) {
    return NO_MAC
  }
  const cleaned = String(mac).replace(MAC_SEPARATOR_REGEX, '').toLowerCase()
  if (!MAC_HEX_REGEX.test(cleaned)) {
    throw new RangeError(`Invalid MAC address '${mac}'`)
  }
  return cleaned
}

/** "AA:BB:CC:DD:EE:FF", or undefined for an empty MAC */
function formatMac(raw: Buffer): string | undefined {
  if (!raw.some(byte => byte !== 0)) {
    return undefined
  }
  return [...raw].map(byte => hex2(byte).toUpperCase()).join(':')
}

/**
 * Meter Pro (Advanced Temperature/Humidity Sensor)
 *
 * Status comes from advertisements, as for the standard Meter. The settings commands are ported
 * from pySwitchbot's SwitchbotMeterPro (3.12.0-3.15.1) and are BLE only; each throws a
 * SwitchbotOperationError when the meter refuses the command or its reply is invalid. Input is
 * checked before anything is sent.
 */
export class WoSensorTHPro extends WoSensorTH {
  private weatherQueue: Promise<unknown> = Promise.resolve()

  /** Throw a SwitchbotOperationError naming this device */
  protected operationError(message: string): SwitchbotOperationError {
    return new SwitchbotOperationError(`${this.info.name}: ${message}`)
  }

  /** Run a check, turning its TypeError/RangeError into a SwitchbotOperationError */
  protected checked<T>(check: () => T): T {
    try {
      return check()
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) {
        throw this.operationError(error.message)
      }
      throw error
    }
  }

  protected checkBoolean(value: unknown, name: string): void {
    if (typeof value !== 'boolean') {
      throw this.operationError(`${name} must be a boolean, got ${JSON.stringify(value)}`)
    }
  }

  /**
   * Send a meter command and check its reply (pySwitchbot `_validate_result`): status byte 0x01
   * and at least `minLength` bytes. `retry: false` sends once.
   */
  protected async meterCommand(command: string, operation: string, options: { minLength?: number, retry?: boolean } = {}): Promise<Buffer> {
    const result = await this.sendBLECommand(Buffer.from(command, 'hex'), false, { validateResponse: false, retry: options.retry })
    if (!result.success) {
      throw this.operationError(`${operation} failed: ${result.error}`)
    }
    const reply: Buffer | undefined = result.data
    if (!reply || reply.length === 0 || reply[0] !== 1) {
      throw this.operationError(`Unexpected response code for ${operation} (result=${reply && reply.length > 0 ? reply.toString('hex') : 'None'})`)
    }
    if (options.minLength !== undefined && reply.length < options.minLength) {
      throw this.operationError(`Unexpected response len for ${operation}, wanted at least ${options.minLength} (result=${reply.toString('hex')})`)
    }
    return reply
  }

  /** Read the comfort mode, limits in C and %RH, and current status (pySwitchbot 3.15.0) */
  async getComfortLevel(): Promise<MeterProComfortLevel> {
    const data = await this.meterCommand(COMMAND_GET_COMFORT_LEVEL, 'getComfortLevel', { minLength: 8 })
    const mode = data[1]
    let limits: [number, number, number, number] | undefined
    try {
      limits = decodeTemperatureHumidityLimits(data.subarray(2, 7))
    } catch {
      limits = undefined
    }
    if ((mode !== 0 && mode !== 1) || !limits) {
      throw this.operationError(`Invalid comfort level response (result=${data.toString('hex')})`)
    }
    const [temperatureLowC, temperatureHighC, humidityLow, humidityHigh] = limits
    return { custom: mode === 1, temperatureLowC, temperatureHighC, humidityLow, humidityHigh, status: data[7] & 0x03 }
  }

  /**
   * Set comfort limits in C (rounded half up to tenths) and %RH, or with `custom: false` select
   * the default comfort mode (pySwitchbot 3.15.0)
   */
  async setComfortLevel(temperatureLowC: number, temperatureHighC: number, humidityLow: number, humidityHigh: number, options: { custom?: boolean } = {}): Promise<void> {
    const custom = options.custom ?? true
    const limits = this.checked(() => encodeTemperatureHumidityLimits(temperatureLowC, temperatureHighC, humidityLow, humidityHigh))
    this.checkBoolean(custom, 'custom')
    if (custom) {
      const [low, high, dry, humid] = decodeTemperatureHumidityLimits(limits)
      if (low >= high || dry >= humid) {
        throw this.operationError('Lower comfort limits must be below upper limits')
      }
    }
    await this.meterCommand(`${COMMAND_SET_TEMPERATURE_HUMIDITY_LIMITS}${hex2(custom ? 0x88 : 0x80)}${limits.toString('hex')}`, 'setComfortLevel')
  }

  /** Read the local alarm conditions, limits in C and %RH, and both alarm states (pySwitchbot 3.15.0) */
  async getTemperatureHumidityAlarm(): Promise<MeterProTemperatureHumidityAlarm> {
    const data = await this.meterCommand(COMMAND_GET_TEMPERATURE_HUMIDITY_ALARM, 'getTemperatureHumidityAlarm', { minLength: 8 })
    let limits: [number, number, number, number]
    try {
      limits = decodeTemperatureHumidityLimits(data.subarray(2, 7))
    } catch {
      throw this.operationError(`Invalid temperature and humidity alarm response (result=${data.toString('hex')})`)
    }
    const [temperatureLowC, temperatureHighC, humidityLow, humidityHigh] = limits
    // Bits 5:4 are the temperature alarm state and bits 1:0 the humidity alarm state
    return {
      mode: data[1],
      temperatureLowC,
      temperatureHighC,
      humidityLow,
      humidityHigh,
      temperatureStatus: (data[7] >> 4) & 0x03,
      humidityStatus: data[7] & 0x03,
    }
  }

  /**
   * Set both sets of local alarm limits and the enabled conditions together (pySwitchbot
   * 3.15.0). `mode` combines MeterProTemperatureHumidityAlarmMode flags.
   */
  async setTemperatureHumidityAlarm(mode: number, temperatureLowC: number, temperatureHighC: number, humidityLow: number, humidityHigh: number): Promise<void> {
    // Bit 7 selects comfort settings on the shared write command
    if (!isInteger(mode) || mode < 0 || (mode & ~TEMPERATURE_HUMIDITY_ALARM_MASK) !== 0) {
      throw this.operationError(`Invalid temperature and humidity alarm mode ${JSON.stringify(mode)}`)
    }
    const limits = this.checked(() => encodeTemperatureHumidityLimits(temperatureLowC, temperatureHighC, humidityLow, humidityHigh))
    const [low, high, dry, humid] = decodeTemperatureHumidityLimits(limits)
    if (
      ((mode & MeterProTemperatureHumidityAlarmMode.TemperatureInRange) && low > high)
      || ((mode & MeterProTemperatureHumidityAlarmMode.HumidityInRange) && dry > humid)
    ) {
      throw this.operationError('Lower in-range alarm limits must not exceed upper limits')
    }
    await this.meterCommand(`${COMMAND_SET_TEMPERATURE_HUMIDITY_LIMITS}${hex2(mode)}${limits.toString('hex')}`, 'setTemperatureHumidityAlarm')
  }

  /** Read the local alarm mode and buzzer volume (pySwitchbot 3.15.0) */
  async getAlarmSettings(): Promise<MeterProAlarmSettings> {
    const data = await this.meterCommand(COMMAND_GET_ALARM_SETTINGS, 'getAlarmSettings', { minLength: 3 })
    const mode = enumOrUndefined(MeterProAlarmMode, data[2])
    if (mode === undefined) {
      throw this.operationError(`Unknown alarm mode ${hex2(data[2])}`)
    }
    return { mode, volume: enumOrUndefined(MeterProAlarmVolume, data[1]) }
  }

  /** Set the local alarm mode and, when given, the buzzer volume (pySwitchbot 3.15.0) */
  async setAlarmSettings(mode: MeterProAlarmMode, volume?: MeterProAlarmVolume): Promise<void> {
    if (!isInteger(mode) || enumOrUndefined(MeterProAlarmMode, mode) === undefined) {
      throw this.operationError('mode must be a MeterProAlarmMode')
    }
    if (volume !== undefined && (!isInteger(volume) || enumOrUndefined(MeterProAlarmVolume, volume) === undefined)) {
      throw this.operationError('volume must be a MeterProAlarmVolume or undefined')
    }
    await this.meterCommand(`${COMMAND_SET_ALARM_SETTINGS}${hex2(volume ?? KEEP_ALARM_VOLUME)}${hex2(mode)}`, 'setAlarmSettings')
  }

  /** Read the temperature (C) and humidity (%RH) corrections (pySwitchbot 3.14.0) */
  async getCalibration(): Promise<MeterProCalibration> {
    // [status][temp sign|int][hum sign|value][temp tenths]; sign bit set = positive
    const result = await this.meterCommand(COMMAND_GET_CALIBRATION, 'getCalibration', { minLength: 4 })
    const tenths = result[3] & 0x0F
    const humidity = result[2] & 0x7F
    if (tenths > 9 || humidity > MAX_HUMIDITY_CALIBRATION) {
      throw this.operationError(`Invalid calibration response (result=${result.toString('hex')})`)
    }
    const temperature = ((result[1] & 0x7F) * 10 + tenths) / 10
    // A zero correction comes back with the sign bit cleared
    return {
      temperature: (result[1] & 0x80) ? temperature : -temperature || 0,
      humidity: (result[2] & 0x80) ? humidity : -humidity || 0,
    }
  }

  /** Set the temperature (C, rounded half up to tenths) and humidity (%RH) corrections (pySwitchbot 3.14.0) */
  async setCalibration(temperature: number, humidity: number): Promise<void> {
    const [decimal, temperatureByte] = this.checked(() => encodeMeterProTemperature(temperature))
    if (!isInteger(humidity) || Math.abs(humidity) > MAX_HUMIDITY_CALIBRATION) {
      throw this.operationError(`Humidity calibration must be an integer within ±${MAX_HUMIDITY_CALIBRATION}, got ${JSON.stringify(humidity)}`)
    }
    const humidityByte = Math.abs(humidity) | (humidity >= 0 ? 0x80 : 0)
    await this.meterCommand(`${COMMAND_SET_CALIBRATION}${hex2(temperatureByte)}${hex2(humidityByte)}${hex2(decimal)}`, 'setCalibration')
  }

  /**
   * Read the display zones, data update interval, date format and battery icon (pySwitchbot
   * 3.14.0). Older firmware stops after the MAC addresses; the later fields are then undefined.
   */
  async getDisplaySettings(): Promise<MeterProDisplaySettings> {
    // [status][icons mid|bot][sources mid|bot][mac mid x6][mac bot x6]
    // [data update interval u16][date format][reserved][battery icon]
    const result = await this.meterCommand(COMMAND_GET_DISPLAY_SETTINGS, 'getDisplaySettings', { minLength: 15 })
    const zone = (icon: number, source: number, mac: Buffer): MeterProZoneSettings => ({
      icon: icon !== 0 && icon !== KEEP_ICON ? icon : undefined,
      source,
      sourceMac: formatMac(mac),
    })
    return {
      middle: zone(result[1] >> 4, result[2] >> 4, result.subarray(3, 9)),
      bottom: zone(result[1] & 0x0F, result[2] & 0x0F, result.subarray(9, 15)),
      dataUpdateInterval: result.length >= 17 ? result.readUInt16BE(15) : undefined,
      dateFormat: result.length >= 18 && (result[17] === 0 || result[17] === 1) ? result[17] : undefined,
      batteryIconAlways: result.length >= 20 && (result[19] === 0 || result[19] === 1) ? result[19] === 1 : undefined,
    }
  }

  /**
   * Choose what a screen zone shows; an undefined icon keeps the current icon (pySwitchbot
   * 3.14.0). The meter reads the source thermometer over BLE itself. `Network` shows the values
   * written by setWeather; `MeterPro` without a MAC is this meter. The screen applies the change
   * at its next data update.
   */
  async setDisplayZone(zone: MeterProDisplayZone, source: MeterProDisplaySource, sourceMac?: string, icon?: MeterProZoneIcon): Promise<void> {
    const [zoneValue, sourceValue, iconValue, mac] = this.checked(() => [
      coerceEnum(MeterProDisplayZone, zone, 'Display zone', 'MeterProDisplayZone'),
      coerceEnum(MeterProDisplaySource, source, 'Display source', 'MeterProDisplaySource'),
      icon === undefined ? KEEP_ZONE_ICON : coerceEnum(MeterProZoneIcon, icon, 'Zone icon', 'MeterProZoneIcon'),
      macHex(sourceMac),
    ] as const)
    const sourceName = MeterProDisplaySource[sourceValue]
    if (mac !== NO_MAC && SOURCES_WITHOUT_MAC.has(sourceValue)) {
      throw this.operationError(`${sourceName} display source takes no MAC address`)
    }
    if (mac === NO_MAC && !SOURCES_WITHOUT_MAC.has(sourceValue) && sourceValue !== MeterProDisplaySource.MeterPro) {
      throw this.operationError(`${sourceName} display source needs a MAC address`)
    }
    await this.meterCommand(`${COMMAND_SET_DISPLAY_ZONE}${hex2(zoneValue)}${hex2(iconValue)}${hex2(sourceValue)}${mac}`, 'setDisplayZone')
  }

  /** Set the indoor/outdoor icons of both zones; undefined keeps an icon (pySwitchbot 3.14.0) */
  async setZoneIcons(middle?: MeterProZoneIcon, bottom?: MeterProZoneIcon): Promise<void> {
    const [middleByte, bottomByte] = this.checked(() => [
      middle === undefined ? KEEP_ICON : coerceEnum(MeterProZoneIcon, middle, 'Middle icon', 'MeterProZoneIcon'),
      bottom === undefined ? KEEP_ICON : coerceEnum(MeterProZoneIcon, bottom, 'Bottom icon', 'MeterProZoneIcon'),
    ] as const)
    await this.meterCommand(`${COMMAND_SET_ZONE_ICONS}${hex2(middleByte)}${hex2(bottomByte)}`, 'setZoneIcons')
  }

  /** Set the temperature and humidity update interval in seconds; the app offers 300, 600 and 1800 (pySwitchbot 3.14.0) */
  async setDataUpdateInterval(seconds: number): Promise<void> {
    if (!isInteger(seconds) || seconds < 1 || seconds > MAX_DATA_UPDATE_INTERVAL) {
      throw this.operationError(`Data update interval must be an integer from 1 to ${MAX_DATA_UPDATE_INTERVAL} seconds, got ${JSON.stringify(seconds)}`)
    }
    await this.meterCommand(`${COMMAND_SET_DATA_UPDATE_INTERVAL}${u16(seconds)}`, 'setDataUpdateInterval')
  }

  /** Set the date format; the app offers it from firmware 1.5 (pySwitchbot 3.14.0) */
  async setDateFormat(dateFormat: MeterProDateFormat): Promise<void> {
    const value = this.checked(() => coerceEnum(MeterProDateFormat, dateFormat, 'Date format', 'MeterProDateFormat'))
    await this.meterCommand(`${COMMAND_SET_DATE_FORMAT}${hex2(value)}`, 'setDateFormat')
  }

  /** Show the battery icon always, or only when the battery is low (pySwitchbot 3.14.0) */
  async setBatteryIcon(always: boolean): Promise<void> {
    this.checkBoolean(always, 'always')
    await this.meterCommand(`${COMMAND_SET_BATTERY_ICON}${always ? '01' : '00'}`, 'setBatteryIcon')
  }

  /** Set the default temperature unit shown on the screen (pySwitchbot 3.14.0) */
  async setTemperatureUnit(fahrenheit: boolean): Promise<void> {
    this.checkBoolean(fahrenheit, 'fahrenheit')
    await this.meterCommand(`${COMMAND_SET_TEMPERATURE_UNIT}${fahrenheit ? '01' : '00'}`, 'setTemperatureUnit')
  }

  /** Read which button actions are allowed (pySwitchbot 3.14.0) */
  async getButtonFunctions(): Promise<MeterProButtonFunctions> {
    const result = await this.meterCommand(COMMAND_GET_BUTTON_FUNCTIONS, 'getButtonFunctions', { minLength: 3 })
    // The protocol enables unit switching with 0x00 and source switching with 0x01
    return {
      unitSwitch: result[1] === 0 || result[1] === 1 ? result[1] === 0 : undefined,
      sourceSwitch: result[2] === 0 || result[2] === 1 ? result[2] === 1 : undefined,
    }
  }

  /** Allow or forbid the button actions; undefined keeps one as is (pySwitchbot 3.14.0) */
  async setButtonFunctions(unitSwitch?: boolean, sourceSwitch?: boolean): Promise<void> {
    if (unitSwitch !== undefined) {
      this.checkBoolean(unitSwitch, 'unitSwitch')
    }
    if (sourceSwitch !== undefined) {
      this.checkBoolean(sourceSwitch, 'sourceSwitch')
    }
    const unitByte = unitSwitch === undefined ? KEEP_BUTTON_FUNCTION : (unitSwitch ? 0x00 : 0x01)
    const sourceByte = sourceSwitch === undefined ? KEEP_BUTTON_FUNCTION : (sourceSwitch ? 0x01 : 0x00)
    await this.meterCommand(`${COMMAND_SET_BUTTON_FUNCTIONS}${hex2(unitByte)}${hex2(sourceByte)}`, 'setButtonFunctions')
  }

  /** [status][icon][tenths][sign << 7 | degrees][fahrenheit << 7 | humidity]; later bytes are ignored */
  private parseWeather(result: Buffer): [MeterProWeatherIcon, Buffer] {
    const icon = enumOrUndefined(MeterProWeatherIcon, result[1])
    if (icon === undefined) {
      throw this.operationError(`Unknown weather icon ${result[1]} (result=${result.toString('hex')})`)
    }
    if ((result[2] & 0x0F) > 9 || (result[4] & 0x7F) > 99) {
      throw this.operationError(`Invalid weather measurements (result=${result.toString('hex')})`)
    }
    return [icon, Buffer.from(result.subarray(2, 5))]
  }

  private async readWeather(): Promise<[MeterProWeatherIcon, Buffer]> {
    return this.parseWeather(await this.meterCommand(COMMAND_GET_WEATHER, 'getWeather', { minLength: 5 }))
  }

  /** Read the network weather shown on the screen (pySwitchbot 3.12.0) */
  async getWeather(): Promise<MeterProWeather> {
    const [icon, network] = await this.readWeather()
    const magnitude = (network[1] & 0x7F) * 10 + (network[0] & 0x0F)
    return {
      icon,
      temperatureC: magnitude === 0 ? 0 : ((network[1] & 0x80) ? magnitude : -magnitude) / 10,
      humidity: (network[2] & 0x7F) || undefined,
      fahrenheitDisplay: (network[2] & 0x80) !== 0,
    }
  }

  /**
   * Write the given weather fields and verify them by reading back; omitted fields keep their
   * value (pySwitchbot 3.12.0). This does not change display sources. The read, write and
   * read-back of concurrent calls do not interleave; the write is sent once, never retried.
   */
  async setWeather(update: MeterProWeatherUpdate): Promise<void> {
    const { icon, temperatureC, humidity } = update ?? {}
    if (icon === undefined && temperatureC === undefined && humidity === undefined) {
      throw this.operationError('Supply at least one weather field')
    }
    const [iconValue, temperature, relativeHumidity] = this.checked(() => [
      icon === undefined ? undefined : coerceEnum(MeterProWeatherIcon, icon, 'Weather icon', 'MeterProWeatherIcon'),
      temperatureC === undefined ? undefined : encodeMeterProTemperature(temperatureC),
      humidity === undefined ? undefined : encodeWeatherHumidity(humidity),
    ] as const)

    const run = this.weatherQueue.then(async () => {
      const [currentIcon, current] = await this.readWeather()
      const newIcon = iconValue ?? currentIcon
      const network = Buffer.from(current)
      if (temperature) {
        network[0] = (network[0] & 0xF0) | temperature[0]
        network[1] = temperature[1]
      }
      if (relativeHumidity !== undefined) {
        network[2] = (network[2] & 0x80) | relativeHumidity
      }
      // A lost acknowledgement can follow a successful write: never replay stale readings
      await this.meterCommand(`${COMMAND_SET_WEATHER}${hex2(newIcon)}${network.toString('hex')}`, 'setWeather', { retry: false })
      const [updatedIcon, updated] = await this.readWeather()
      if (updatedIcon !== newIcon || !updated.equals(network)) {
        throw this.operationError(`Weather readback mismatch; no rollback attempted (expected_icon=${newIcon} expected_network=${network.toString('hex')} actual_icon=${updatedIcon} actual_network=${updated.toString('hex')})`)
      }
    })
    this.weatherQueue = run.catch(() => {})
    await run
  }
}
