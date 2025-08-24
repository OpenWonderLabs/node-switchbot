/* Copyright(C) 2017-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devicestatus.ts: @switchbot/homebridge-switchbot platform class.
 */
import type { device } from './devicelist.js'

export interface deviceStatusRequest {
  statusCode: number
  message: string
  body: deviceStatus
}

export interface deviceStatus extends device {
  // properties on all devices
  deviceId: string
  deviceType: string
  hubDeviceId: string
  version: number
};

export type botStatus = deviceStatus & {
  power: string
  battery: number
  mode: 'pressMode' | 'switchMode' | 'customizeMode'
}

export type curtainStatus = deviceStatus & {
  calibrate: boolean
  group: boolean
  moving: boolean
  battery: number
  slidePosition: number
  lightLevel?: 'bright' | 'dim'
}

export type meterStatus = deviceStatus & {
  temperature: number
  battery: number
  humidity: number
}

export type meterPlusStatus = deviceStatus & {
  temperature: number
  battery: number
  humidity: number
}

export type meterProStatus = deviceStatus & {
  temperature: number
  battery: number
  humidity: number
  version: string
}

export type meterProCO2Status = deviceStatus & {
  temperature: number
  battery: number
  humidity: number
  version: string
  CO2: number
}

export type outdoorMeterStatus = deviceStatus & {
  battery: number
  temperature: number
  humidity: number
}

export type lockStatus = deviceStatus & {
  lockState: string
  doorState: string
  moveDetected: boolean
  battery: number
}

export type lockProStatus = deviceStatus & {
  lockState: string
  doorState: string
  moveDetected: boolean
  battery: number
}

export type motionSensorStatus = deviceStatus & {
  battery: number
  moveDetected: boolean
  brightness: 'bright' | 'dim'
}

export type contactSensorStatus = deviceStatus & {
  battery: number
  moveDetected: boolean
  openState: 'open' | 'close' | 'timeOutNotClose'
  brightness: 'bright' | 'dim'
}

export type waterLeakDetectorStatus = deviceStatus & {
  battery: number
  status: 0 /* dry */ | 1 /* leak detected */
}

export type ceilingLightStatus = deviceStatus & {
  power: boolean
  brightness: number
  colorTemperature: number
}

export type ceilingLightProStatus = deviceStatus & {
  power: boolean
  brightness: number
  colorTemperature: number
}

export type plugStatus = deviceStatus & {
  power: string
  version: string
}

export type plugMiniStatus = deviceStatus & {
  voltage: Float64Array
  weight: Float64Array
  electricityOfDay: number
  electricCurrent: Float64Array
  power: string
}

export type stripLightStatus = deviceStatus & {
  power: string
  brightness: number
  color: string
}

export type colorBulbStatus = deviceStatus & {
  power: string
  brightness: number
  color: string
  colorTemperature: number
}

export type robotVacuumCleanerS1Status = deviceStatus & {
  workingStatus: string
  onlineStatus: string
  battery: number
}

export type robotVacuumCleanerS1PlusStatus = deviceStatus & {
  workingStatus: string
  onlineStatus: string
  battery: number
}

export type floorCleaningRobotS10Status = deviceStatus & {
  workingStatus: string
  onlineStatus: string
  battery: number
  waterBaseBattery: number
  taskType: string
}

export type humidifierStatus = deviceStatus & {
  power: string
  humidity: number
  temperature: number
  nebulizationEfficiency: number
  auto: boolean
  childLock: boolean
  sound: boolean
  lackWater: boolean
}

export type humidifier2Status = deviceStatus & {
  power: string
  humidity: number
  temperature: number
  nebulizationEfficiency: number
  auto: boolean
  childLock: boolean
  sound: boolean
  lackWater: boolean
}

export type blindTiltStatus = deviceStatus & {
  calibrate: boolean
  battery: number
  direction: string
  slidePosition: string
  lightLevel?: 'bright' | 'dim'
}

export type hub2Status = deviceStatus & {
  temperature: number
  lightLevel: number
  humidity: number
}

export type hub3Status = deviceStatus & {
  temperature: number
  lightLevel: number
  humidity: number
}

export type batteryCirculatorFanStatus = deviceStatus & {
  mode: 'direct' | 'natural' | 'sleep' | 'baby'
  version: string
  battery: number
  power: string
  nightStatus: number
  oscillation: string
  verticalOscillation: string
  chargingStatus: string
  fanSpeed: number
}

export type circulatorFanStatus = deviceStatus & {
  mode: 'direct' | 'natural' | 'sleep' | 'baby'
  version: string
  power: string
  nightStatus: number
  oscillation: string
  verticalOscillation: string
  fanSpeed: number
}

export type relaySwitch1Status = deviceStatus & {
  switchStatus: 0 | 1
  version: string
}

export type relaySwitch1PMStatus = deviceStatus & {
  switchStatus: 0 | 1
  voltage: number
  version: string
  power: number
  usedElectricity: number
  electricCurrent: number
}
