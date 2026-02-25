/* Copyright(C) 2017-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * bledevicestatus.ts: @switchbot/homebridge-switchbot platform class.
 */
import type { MacAddress, SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../device.js'

/**
 * BLE discovery and wait methods for SwitchBot devices.
 */
export interface SwitchBotScanner {
  /** Discover BLE devices based on filter criteria */
  discover: (args: { duration?: number, model: string, quick: boolean, id?: MacAddress }) => Promise<unknown>
  /** Wait for given milliseconds */
  wait: (ms: number) => void
}

/**
 * Common service data across BLE devices.
 */
interface BLEServiceData {
  model: SwitchBotBLEModel
  modelName: SwitchBotBLEModelName
  modelFriendlyName: SwitchBotBLEModelFriendlyName
}
/**
 * Base interface for color-controllable devices.
 */
export interface ColorLightServiceDataBase extends BLEServiceData {
  color_temperature: number
  power: boolean
  state: boolean
  red: number
  green: number
  blue: number
  brightness: number
  delay: number
  preset: number
  color_mode: number
  speed: number
  loop_index: number
}

/**
 * Base interface for temperature-humidity meter devices.
 */
export interface TemperatureServiceDataBase extends BLEServiceData {
  celsius: number
  fahrenheit: number
  fahrenheit_mode: boolean
  humidity: number
  battery: number
}

/**
 * Base interface for mini plug devices (US/JP share same schema).
 */
export interface PlugMiniServiceDataBase extends BLEServiceData {
  state: string
  delay: boolean
  timer: boolean
  syncUtcTime: boolean
  wifiRssi: number
  overload: boolean
  currentPower: number
}

/**
 * Base interface for lock-style devices.
 */
export interface LockBaseServiceData extends BLEServiceData {
  battery: number
  calibration: boolean
  status: string
  update_from_secondary_lock: boolean
  door_open: boolean
  double_lock_mode: boolean
  unclosed_alarm: boolean
  unlocked_alarm: boolean
  auto_lock_paused: boolean
  night_latch: boolean
}

export type botServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Bot
  modelName: SwitchBotBLEModelName.Bot
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Bot
  mode: boolean
  state: boolean
  battery: number
}

export type colorBulbServiceData = ColorLightServiceDataBase & {
  model: SwitchBotBLEModel.ColorBulb
  modelName: SwitchBotBLEModelName.ColorBulb
  modelFriendlyName: SwitchBotBLEModelFriendlyName.ColorBulb
}

export type contactSensorServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.ContactSensor
  modelName: SwitchBotBLEModelName.ContactSensor
  modelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor
  movement: boolean
  tested: boolean
  battery: number
  contact_open: boolean
  contact_timeout: boolean
  lightLevel: string
  button_count: number
  doorState: string
}

export type curtainServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Curtain
  modelName: SwitchBotBLEModelName.Curtain
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain
  calibration: boolean
  battery: number
  inMotion: boolean
  position: number
  lightLevel: number
  deviceChain: number
}

export type curtain3ServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Curtain3
  modelName: SwitchBotBLEModelName.Curtain3
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain3
  calibration: boolean
  battery: number
  inMotion: boolean
  position: number
  lightLevel: number
  deviceChain: number
}

export type stripLightServiceData = ColorLightServiceDataBase & {
  model: SwitchBotBLEModel.StripLight
  modelName: SwitchBotBLEModelName.StripLight
  modelFriendlyName: SwitchBotBLEModelFriendlyName.StripLight
}

export type lockServiceData = LockBaseServiceData & {
  model: SwitchBotBLEModel.Lock
  modelName: SwitchBotBLEModelName.Lock
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Lock
}

export type lockProServiceData = LockBaseServiceData & {
  model: SwitchBotBLEModel.LockPro
  modelName: SwitchBotBLEModelName.LockPro
  modelFriendlyName: SwitchBotBLEModelFriendlyName.LockPro
}

export type meterServiceData = TemperatureServiceDataBase & {
  model: SwitchBotBLEModel.Meter
  modelName: SwitchBotBLEModelName.Meter
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter
}

export type meterPlusServiceData = TemperatureServiceDataBase & {
  model: SwitchBotBLEModel.MeterPlus
  modelName: SwitchBotBLEModelName.MeterPlus
  modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPlus
}

export type meterProServiceData = TemperatureServiceDataBase & {
  model: SwitchBotBLEModel.MeterPro
  modelName: SwitchBotBLEModelName.MeterPro
  modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPro
}

export type meterProCO2ServiceData = TemperatureServiceDataBase & {
  model: SwitchBotBLEModel.MeterProCO2
  modelName: SwitchBotBLEModelName.MeterProCO2
  modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterProCO2
  co2: number
}

export type outdoorMeterServiceData = TemperatureServiceDataBase & {
  model: SwitchBotBLEModel.OutdoorMeter
  modelName: SwitchBotBLEModelName.OutdoorMeter
  modelFriendlyName: SwitchBotBLEModelFriendlyName.OutdoorMeter
}

export type motionSensorServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.MotionSensor
  modelName: SwitchBotBLEModelName.MotionSensor
  modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor
  tested: boolean
  movement: boolean
  battery: number
  led: number
  iot: number
  sense_distance: number
  lightLevel: string
  is_light: boolean
}
export type presenceSensorServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.PresenceSensor
  modelName: SwitchBotBLEModelName.PresenceSensor
  modelFriendlyName: SwitchBotBLEModelFriendlyName.PresenceSensor
  sequenceNumber: number
  adaptiveState: boolean
  motionDetected: boolean
  batteryRange: string
  triggerFlag: number
  ledState: boolean
  lightLevel: number
  battery?: number
}

export type plugMiniUSServiceData = PlugMiniServiceDataBase & {
  model: SwitchBotBLEModel.PlugMiniUS
  modelName: SwitchBotBLEModelName.PlugMini
  modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini
}

export type plugMiniJPServiceData = PlugMiniServiceDataBase & {
  model: SwitchBotBLEModel.PlugMiniJP
  modelName: SwitchBotBLEModelName.PlugMini
  modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini
}

export type plugMiniEUServiceData = PlugMiniServiceDataBase & {
  model: SwitchBotBLEModel.PlugMiniEU
  modelName: SwitchBotBLEModelName.PlugMini
  modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini
}

export type blindTiltServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.BlindTilt
  modelName: SwitchBotBLEModelName.BlindTilt
  modelFriendlyName: SwitchBotBLEModelFriendlyName.BlindTilt
  calibration: boolean
  battery: number
  inMotion: boolean
  tilt: number
  lightLevel: number
  sequenceNumber: number
}

export type ceilingLightServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.CeilingLight
  modelName: SwitchBotBLEModelName.CeilingLight
  modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLight
  color_temperature: number
  power: boolean
  state: boolean
  red: number
  green: number
  blue: number
  brightness: number
  delay: number
  preset: number
  color_mode: number
  speed: number
  loop_index: number
}

export type ceilingLightProServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.CeilingLightPro
  modelName: SwitchBotBLEModelName.CeilingLightPro
  modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLightPro
  color_temperature: number
  power: boolean
  state: boolean
  red: number
  green: number
  blue: number
  brightness: number
  delay: number
  preset: number
  color_mode: number
  speed: number
  loop_index: number
}

export type hub2ServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Hub2
  modelName: SwitchBotBLEModelName.Hub2
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub2
  celsius: number
  fahrenheit: number
  fahrenheit_mode: boolean
  humidity: number
  lightLevel: number
}

export type hub3ServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Hub3
  modelName: SwitchBotBLEModelName.Hub3
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub3
  celsius: number
  fahrenheit: number
  fahrenheit_mode: boolean
  humidity: number
  lightLevel: number
}

export type batteryCirculatorFanServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Unknown
  modelName: SwitchBotBLEModelName.Unknown
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Unknown
  state: string
  fanSpeed: number
}

export type waterLeakDetectorServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Leak
  modelName: SwitchBotBLEModelName.Leak
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Leak
  leak: boolean
  tampered: boolean
  battery: number
  low_battery: boolean
}

export type humidifierServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Humidifier
  modelName: SwitchBotBLEModelName.Humidifier
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier
  onState: boolean
  autoMode: boolean
  percentage: number
  humidity: number
}

export type humidifier2ServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Humidifier2
  modelName: SwitchBotBLEModelName.Humidifier2
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier2
  onState: boolean
  autoMode: boolean
  percentage: number
  humidity: number
  childLock: boolean
  overHumidifyProtection: boolean
  tankRemoved: boolean
  tiltedAlert: boolean
  filterMissing: boolean
  temperature: number
  filterRunTime: number
  filterAlert: boolean
  waterLevel: number
}

export type robotVacuumCleanerServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Unknown
  modelName: SwitchBotBLEModelName.Unknown
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Unknown
  state: string
  battery: number
}

export type keypadDetectorServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Keypad
  modelName: SwitchBotBLEModelName.Keypad
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Keypad
  event: boolean
  tampered: boolean
  battery: number
  low_battery: boolean
}

export type relaySwitch1ServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.RelaySwitch1
  modelName: SwitchBotBLEModelName.RelaySwitch1
  modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1
  mode: boolean
  state: boolean
  sequence_number: number
}

export type relaySwitch1PMServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.RelaySwitch1PM
  modelName: SwitchBotBLEModelName.RelaySwitch1PM
  modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1PM
  mode: boolean
  state: boolean
  sequence_number: number
  power: number
  voltage: number
  current: number
}

export type remoteServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.Remote
  modelName: SwitchBotBLEModelName.Remote
  modelFriendlyName: SwitchBotBLEModelFriendlyName.Remote
  battery: number
}

export type airPurifierServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.AirPurifier
  modelName: SwitchBotBLEModelName.AirPurifier
  modelFriendlyName: SwitchBotBLEModelFriendlyName.AirPurifier
  isOn: boolean
  mode: string | null
  isAqiValid: boolean
  child_lock: boolean
  speed: number
  aqi_level: string
  filter_element_working_time: number
  err_code: number
  sequence_number: number
}

export type airPurifierTableServiceData = BLEServiceData & {
  model: SwitchBotBLEModel.AirPurifierTable
  modelName: SwitchBotBLEModelName.AirPurifierTable
  modelFriendlyName: SwitchBotBLEModelFriendlyName.AirPurifierTable
  isOn: boolean
  mode: string | null
  isAqiValid: boolean
  child_lock: boolean
  speed: number
  aqi_level: string
  filter_element_working_time: number
  err_code: number
  sequence_number: number
}

export type BLEDeviceServiceData
  = | airPurifierServiceData
    | airPurifierTableServiceData
    | batteryCirculatorFanServiceData
    | blindTiltServiceData
    | botServiceData
    | ceilingLightServiceData
    | ceilingLightProServiceData
    | colorBulbServiceData
    | contactSensorServiceData
    | curtain3ServiceData
    | curtainServiceData
    | hub2ServiceData
    | hub3ServiceData
    | keypadDetectorServiceData
    | lockProServiceData
    | lockServiceData
    | meterPlusServiceData
    | meterProCO2ServiceData
    | meterProServiceData
    | meterServiceData
    | motionSensorServiceData
    | outdoorMeterServiceData
    | presenceSensorServiceData
    | plugMiniJPServiceData
    | plugMiniUSServiceData
    | plugMiniEUServiceData
    | relaySwitch1PMServiceData
    | relaySwitch1ServiceData
    | remoteServiceData
    | robotVacuumCleanerServiceData
    | stripLightServiceData
    | waterLeakDetectorServiceData
    | humidifier2ServiceData
    | humidifierServiceData
