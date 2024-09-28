/* Copyright(C) 2017-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * types.ts: @switchbot/homebridge-switchbot platform class.
 */
import type * as Noble from '@stoprocent/noble'

export type MacAddress = string

export declare interface SwitchBotBLEDevice {
  Bot: {
    Model: SwitchBotModel.Bot
    BLEModel: SwitchBotBLEModel.Bot
    BLEModelName: SwitchBotBLEModelName.Bot
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Bot
  }
  Curtain: {
    Model: SwitchBotModel.Curtain
    BLEModel: SwitchBotBLEModel.Curtain
    BLEModelName: SwitchBotBLEModelName.Curtain
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain
  }
  Curtain3: {
    Model: SwitchBotModel.Curtain3
    BLEModel: SwitchBotBLEModel.Curtain3
    BLEModelName: SwitchBotBLEModelName.Curtain3
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain3
  }
  Humidifier: {
    Model: SwitchBotModel.Humidifier
    BLEModel: SwitchBotBLEModel.Humidifier
    BLEModelName: SwitchBotBLEModelName.Humidifier
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier
  }
  Meter: {
    Model: SwitchBotModel.Meter
    BLEModel: SwitchBotBLEModel.Meter
    BLEModelName: SwitchBotBLEModelName.Meter
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Meter
  }
  MeterPlus: {
    Model: SwitchBotModel.MeterPlusJP | SwitchBotModel.MeterPlusUS
    BLEModel: SwitchBotBLEModel.MeterPlus
    BLEModelName: SwitchBotBLEModelName.MeterPlus
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Meter
  }
  Hub2: {
    Model: SwitchBotModel.Hub2
    BLEModel: SwitchBotBLEModel.Hub2
    BLEModelName: SwitchBotBLEModelName.Hub2
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Hub2
  }
  OutdoorMeter: {
    Model: SwitchBotModel.OutdoorMeter
    BLEModel: SwitchBotBLEModel.OutdoorMeter
    BLEModelName: SwitchBotBLEModelName.OutdoorMeter
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.OutdoorMeter
  }
  MotionSensor: {
    Model: SwitchBotModel.MotionSensor
    BLEModel: SwitchBotBLEModel.MotionSensor
    BLEModelName: SwitchBotBLEModelName.MotionSensor
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor
  }
  ContactSensor: {
    Model: SwitchBotModel.ContactSensor
    BLEModel: SwitchBotBLEModel.ContactSensor
    BLEModelName: SwitchBotBLEModelName.ContactSensor
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor
  }
  ColorBulb: {
    Model: SwitchBotModel.ColorBulb
    BLEModel: SwitchBotBLEModel.ColorBulb
    BLEModelName: SwitchBotBLEModelName.ColorBulb
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.ColorBulb
  }
  StripLight: {
    Model: SwitchBotModel.StripLight
    BLEModel: SwitchBotBLEModel.StripLight
    BLEModelName: SwitchBotBLEModelName.StripLight
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.StripLight
  }
  PlugMiniUS: {
    Model: SwitchBotModel.PlugMiniUS
    BLEModel: SwitchBotBLEModel.PlugMiniUS
    BLEModelName: SwitchBotBLEModelName.PlugMini
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini
  }
  PlugMiniJP: {
    Model: SwitchBotModel.PlugMiniJP
    BLEModel: SwitchBotBLEModel.PlugMiniJP
    BLEModelName: SwitchBotBLEModelName.PlugMini
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini
  }
  Lock: {
    Model: SwitchBotModel.Lock
    BLEModel: SwitchBotBLEModel.Lock
    BLEModelName: SwitchBotBLEModelName.Lock
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Lock
  }
  LockPro: {
    Model: SwitchBotModel.LockPro
    BLEModel: SwitchBotBLEModel.LockPro
    BLEModelName: SwitchBotBLEModelName.LockPro
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.LockPro
  }
  CeilingLight: {
    Model: SwitchBotModel.CeilingLight
    BLEModel: SwitchBotBLEModel.CeilingLight
    BLEModelName: SwitchBotBLEModelName.Unknown
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Unknown
  }
  CeilingLightPro: {
    Model: SwitchBotModel.CeilingLightPro
    BLEModel: SwitchBotBLEModel.CeilingLightPro
    BLEModelName: SwitchBotBLEModelName.CeilingLightPro
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLightPro
  }
  BlindTilt: {
    Model: SwitchBotModel.BlindTilt
    BLEModel: SwitchBotBLEModel.BlindTilt
    BLEModelName: SwitchBotBLEModelName.BlindTilt
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.BlindTilt
  }
  Unknown: {
    Model: SwitchBotModel.Unknown
    BLEModel: SwitchBotBLEModel.Unknown
    BLEModelName: SwitchBotBLEModelName.Unknown
    ModelFriendlyName: SwitchBotBLEModelFriendlyName.Unknown
  }
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
