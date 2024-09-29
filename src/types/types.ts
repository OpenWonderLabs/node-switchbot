/* Copyright(C) 2017-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * types.ts: @switchbot/homebridge-switchbot platform class.
 */
import type { Buffer } from 'node:buffer'

import type * as Noble from '@stoprocent/noble'

export type MacAddress = string

interface DeviceInfo {
  Model: SwitchBotModel
  BLEModel: SwitchBotBLEModel
  BLEModelName: SwitchBotBLEModelName
  ModelFriendlyName: SwitchBotBLEModelFriendlyName
}

export declare interface SwitchBotBLEDevice {
  Bot: DeviceInfo
  Curtain: DeviceInfo
  Curtain3: DeviceInfo
  Humidifier: DeviceInfo
  Meter: DeviceInfo
  MeterPlus: DeviceInfo
  Hub2: DeviceInfo
  OutdoorMeter: DeviceInfo
  MotionSensor: DeviceInfo
  ContactSensor: DeviceInfo
  ColorBulb: DeviceInfo
  StripLight: DeviceInfo
  PlugMiniUS: DeviceInfo
  PlugMiniJP: DeviceInfo
  Lock: DeviceInfo
  LockPro: DeviceInfo
  CeilingLight: DeviceInfo
  CeilingLightPro: DeviceInfo
  BlindTilt: DeviceInfo
  Unknown: DeviceInfo
}

export enum SwitchBotModel {
  HubMini = 'W0202200',
  HubPlus = 'SwitchBot Hub S1',
  Hub2 = 'W3202100',
  Bot = 'SwitchBot S1',
  Curtain = 'W0701600',
  Curtain3 = 'W2400000',
  Humidifier = 'W0801800',
  Plug = 'SP11', // Currently only available in Japan
  Meter = 'SwitchBot MeterTH S1',
  MeterPlusJP = 'W2201500',
  MeterPlusUS = 'W2301500',
  OutdoorMeter = 'W3400010',
  MotionSensor = 'W1101500',
  ContactSensor = 'W1201500',
  ColorBulb = 'W1401400',
  StripLight = 'W1701100',
  PlugMiniUS = 'W1901400/W1901401',
  PlugMiniJP = 'W2001400/W2001401',
  Lock = 'W1601700',
  LockPro = 'W3500000',
  Keypad = 'W2500010',
  KeypadTouch = 'W2500020',
  K10 = 'K10+',
  WoSweeper = 'WoSweeper',
  WoSweeperMini = 'WoSweeperMini',
  RobotVacuumCleanerS1 = 'W3011000', // Currently only available in Japan.
  RobotVacuumCleanerS1Plus = 'W3011010', // Currently only available in Japan.
  RobotVacuumCleanerS10 = 'W3211800',
  Remote = 'Remote',
  UniversalRemote = 'UniversalRemote',
  CeilingLight = 'W2612230/W2612240', // Currently only available in Japan.
  CeilingLightPro = 'W2612210/W2612220', // Currently only available in Japan.
  IndoorCam = 'W1301200',
  PanTiltCam = 'W1801200',
  PanTiltCam2K = 'W3101100',
  BlindTilt = 'W2701600',
  BatteryCirculatorFan = 'W3800510',
  WaterDetector = 'W4402000',
  Unknown = 'Unknown',
}

export enum SwitchBotBLEModel {
  Bot = 'H',
  Curtain = 'c',
  Curtain3 = '{',
  Humidifier = 'e',
  Meter = 'T',
  MeterPlus = 'i',
  Hub2 = 'v',
  OutdoorMeter = 'w',
  MotionSensor = 's',
  ContactSensor = 'd',
  ColorBulb = 'u',
  StripLight = 'r',
  PlugMiniUS = 'g',
  PlugMiniJP = 'j',
  Lock = 'o',
  LockPro = '$',
  CeilingLight = 'q', // Currently only available in Japan.
  CeilingLightPro = 'n', // Currently only available in Japan.
  BlindTilt = 'x',
  Unknown = 'Unknown',
}

export enum SwitchBotBLEModelName {
  Bot = 'WoHand',
  Hub2 = 'WoHub2',
  ColorBulb = 'WoBulb',
  Curtain = 'WoCurtain',
  Curtain3 = 'WoCurtain3',
  Humidifier = 'WoHumi',
  Meter = 'WoSensorTH',
  Lock = 'WoSmartLock',
  LockPro = 'WoSmartLockPro',
  PlugMini = 'WoPlugMini',
  StripLight = 'WoStrip',
  MeterPlus = 'WoSensorTHPlus',
  OutdoorMeter = 'WoIOSensorTH',
  ContactSensor = 'WoContact',
  MotionSensor = 'WoMotion',
  BlindTilt = 'WoBlindTilt',
  CeilingLight = 'WoCeilingLight',
  CeilingLightPro = 'WoCeilingLightPro',
  Unknown = 'Unknown',
}

export enum SwitchBotBLEModelFriendlyName {
  Bot = 'Bot',
  Hub2 = 'Hub 2',
  ColorBulb = 'Color Bulb',
  Curtain = 'Curtain',
  Curtain3 = 'Curtain 3',
  Humidifier = 'Humidifier',
  Meter = 'Meter',
  Lock = 'Lock',
  LockPro = 'Lock Pro',
  PlugMini = 'Plug Mini',
  StripLight = 'Strip Light',
  MeterPlus = 'Meter Plus',
  OutdoorMeter = 'Outdoor Meter',
  ContactSensor = 'Contact Sensor',
  MotionSensor = 'Motion Sensor',
  BlindTilt = 'Blind Tilt',
  CeilingLight = 'Ceiling Light',
  CeilingLightPro = 'Ceiling Light Pro',
  Unknown = 'Unknown',
}

export interface Params {
  duration?: number
  model?: string
  id?: string
  quick?: false
  noble?: typeof Noble
}

export interface ErrorObject {
  code: string
  message: string
}

export interface Chars {
  write: Noble.Characteristic | null
  notify: Noble.Characteristic | null
  device: Noble.Characteristic | null
}

export interface ServiceData {
  model: string
  [key: string]: unknown
}

export interface Ad {
  id: string
  address: string
  rssi: number
  serviceData: ServiceData
  [key: string]: unknown
}

export interface AdvertisementData {
  serviceData: Buffer | null
  manufacturerData: Buffer | null
}

/**
 * Interface for API response.
 */
export interface ApiResponse {
  statusCode?: number
  message?: string
  body?: {
    urls?: string[]
  }
}

/**
 * Enum for log levels.
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}
