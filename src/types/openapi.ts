/* Copyright(C) 2017-2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * openapi.ts: Aggregated types for SwitchBot OpenAPI and IR interfaces.
 */
export interface deviceList {
  device: device[]
}

export interface device {
  deviceId: string
  deviceName: string
  deviceType: string
  enableCloudService: boolean
  hubDeviceId: string
  version?: number
}

export type bot = device

export type curtain = device & {
  curtainDevicesIds: string[]
  calibrate: boolean
  group: boolean
  master: boolean
  openDirection: string
}

export type curtain3 = device & {
  curtainDevicesIds: string[]
  calibrate: boolean
  group: boolean
  master: boolean
  openDirection?: string
}

export type hub2 = device

export type meter = device

export type meterPlus = device

export type meterPro = device

export type outdoorMeter = device

export type lock = device & {
  group: boolean
  master: boolean
  groupName: string
  lockDevicesIds: string[]
}

export type lockPro = device & {
  group: boolean
  master: boolean
  groupName: string
  lockDevicesIds: string[]
}

export type keypad = device & {
  remoteType: string
  lockDeviceId: string
  keyList: keyList
}

export type keypadTouch = device & {
  remoteType: string
  lockDeviceId: string
  keyList: keyList
}

interface keyList {
  id: number
  name: string
  type: string
  password: string
  iv: string
  status: string
  createTime: number
}

export type remote = device

export type motionSensor = device

export type contactSensor = device

export type waterLeakDetector = device

export type ceilingLight = device

export type ceilingLightPro = device

export type plug = device

export type plugMini = device

export type stripLight = device

export type colorBulb = device

export type robotVacuumCleanerS1 = device

export type robotVacuumCleanerS1Plus = device

export type floorCleaningRobotS10 = device

export type humidifier = device

export type IndoorCam = device

export type pantiltCam = device

export type pantiltCam2k = device

export type blindTilt = device & {
  blindTiltDevicesIds: string[]
  calibrate: boolean
  group: boolean
  master: boolean
  direction: string
  slidePosition: number
}

export type batteryCirculatorFan = device

/**
 * Allowed command types for device control.
 */
export type commandType = 'command' | 'customize'

/**
 * Request payload for controlling a device.
 */
export interface pushRequest {
  command: string
  parameter: string
  commandType: commandType
}

/**
 * Body of a device push response.
 */
export interface pushResponseBody {
  commandId: string
}

/**
 * Response from a device control (push) request.
 */
export interface pushResponse {
  statusCode: number
  body: pushResponseBody
  message: string
}

export interface bodyChange {
  command: string
  parameter: string
  commandType: string
}

// json response from SwitchBot API
export interface devices {
  statusCode: number
  message: string
  body: body
}

export interface body {
  deviceList: device[]
  infraredRemoteList: infraredRemoteList
}

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

export interface webhookRequest {
  action: string
  url: string
  deviceList: string
}

export interface setupWebhookResponse {
  statusCode: number
  body: object
  message: string
}

export interface queryWebhookResponse {
  statusCode: number
  body: WebhookDetail[]
  message: string
}

export interface WebhookDetail {
  url: string
  createTime: number
  lastUpdateTime: number
  deviceList: string
  enable: boolean
}

export interface updateWebhookResponse {
  statusCode: number
  body: object
  message: string
}

export interface deleteWebhookResponse {
  statusCode: number
  body: object
  message: string
}

interface deviceWebhook {
  eventType: string
  eventVersion: string
  context: deviceWebhookContext
}

export { deviceWebhook }

export interface deviceWebhookContext {
  // properties on all devices
  deviceMac: string
  deviceType: string
  timeOfSample: number
}

export type botWebhookContext = deviceWebhookContext & {
  power: string // "on"or"off"
  battery: number
  deviceMode: 'pressMode' | 'switchMode' | 'customizeMode'
}

export type curtainWebhookContext = deviceWebhookContext & {
  calibrate: boolean
  group: boolean
  slidePosition: number // 0~100
  battery: number
}

export type curtain3WebhookContext = deviceWebhookContext & {
  calibrate: boolean
  group: boolean
  slidePosition: number // 0~100
  battery: number
}

export type motionSensorWebhookContext = deviceWebhookContext & {
  detectionState: 'NOT_DETECTED' | 'DETECTED'
  battery: number // 0~100
}

export type contactSensorWebhookContext = deviceWebhookContext & {
  detectionState: 'NOT_DETECTED' | 'DETECTED'
  battery: number // 0~100
  doorMode: 'IN_DOOR' | 'OUT_DOOR'
  brightness: 'dim' | 'bright'
  openState: 'open' | 'close' | 'timeOutNotClose'
}

export type waterLeakDetectorWebhookContext = deviceWebhookContext & {
  detectionState: 0 | 1
  battery: number // 0~100
}

export type meterWebhookContext = deviceWebhookContext & {
  temperature: number
  battery: number // 0~100
  scale: 'CELSIUS' | 'FAHRENHEIT'
  humidity: number
}

export type meterPlusWebhookContext = deviceWebhookContext & {
  temperature: number
  battery: number // 0~100
  scale: 'CELSIUS' | 'FAHRENHEIT'
  humidity: number
}

export type meterProWebhookContext = deviceWebhookContext & {
  temperature: number
  battery: number // 0~100
  scale: 'CELSIUS' | 'FAHRENHEIT'
  humidity: number
}

export type meterProCO2WebhookContext = deviceWebhookContext & {
  temperature: number
  battery: number // 0~100
  scale: 'CELSIUS' | 'FAHRENHEIT'
  humidity: number
  CO2: number
}

export type outdoorMeterWebhookContext = deviceWebhookContext & {
  temperature: number
  battery: number // 0~100
  scale: 'CELSIUS' | 'FAHRENHEIT'
  humidity: number
}

export type lockWebhookContext = deviceWebhookContext & {
  lockState: 'UNLOCKED' | 'LOCKED' | 'JAMMED'
  battery: number // 0~100
}

export type lockProWebhookContext = deviceWebhookContext & {
  lockState: 'UNLOCKED' | 'LOCKED' | 'JAMMED'
  battery: number // 0~100
}

export type indoorCameraWebhookContext = deviceWebhookContext & {
  detectionState: 'DETECTED'
}

export type panTiltCamWebhookContext = deviceWebhookContext & {
  detectionState: 'DETECTED'
}

export type colorBulbWebhookContext = deviceWebhookContext & {
  powerState: 'ON' | 'OFF'
  brightness: number
  color: string // RGB 255:255:255
  colorTemperature: number // 2700~6500
}

export type stripLightWebhookContext = deviceWebhookContext & {
  powerState: 'ON' | 'OFF'
  brightness: number
  color: string // RGB 255:255:255
}

export type plugWebhookContext = deviceWebhookContext & {
  powerState: 'ON' | 'OFF'
}

export type plugMiniUSWebhookContext = deviceWebhookContext & {
  powerState: 'ON' | 'OFF'
}

export type plugMiniJPWebhookContext = deviceWebhookContext & {
  powerState: 'ON' | 'OFF'
}

export type robotVacuumCleanerS1WebhookContext = deviceWebhookContext & {
  workingStatus: 'Standby' | 'Clearing' | 'Paused' | 'GotoChargeBase' | 'Charging' | 'ChargeDone' | 'Dormant' | 'InTrouble' | 'InRemoteControl' | 'InDustCollecting'
  onlineStatus: 'online' | 'offline'
  battery: number // 0~100
}

export type robotVacuumCleanerS1PlusWebhookContext = deviceWebhookContext & {
  workingStatus: 'Standby' | 'Clearing' | 'Paused' | 'GotoChargeBase' | 'Charging' | 'ChargeDone' | 'Dormant' | 'InTrouble' | 'InRemoteControl' | 'InDustCollecting'
  onlineStatus: 'online' | 'offline'
  battery: number // 0~100
}

export type floorCleaningRobotS10WebhookContext = deviceWebhookContext & {
  workingStatus: 'Standby' | 'Clearing' | 'Paused' | 'GotoChargeBase' | 'Charging' | 'ChargeDone' | 'Dormant' | 'InTrouble' | 'InRemoteControl' | 'InDustCollecting'
  onlineStatus: 'online' | 'offline'
  battery: number // 0~100
  waterBaseBattery: number // 0~100
  taskType: 'standBy' | 'explore' | 'cleanAll' | 'cleanArea' | 'cleanRoom' | 'fillWater' | 'deepWashing' | 'backToCharge' | 'markingWaterBase' | 'drying' | 'collectDust' | 'remoteControl' | 'cleanWithExplorer' | 'fillWaterForHumi' | 'markingHumi'
}

export type ceilingLightWebhookContext = deviceWebhookContext & {
  powerState: 'ON' | 'OFF'
  brightness: number
  colorTemperature: number // 2700~6500
}

export type ceilingLightProWebhookContext = deviceWebhookContext & {
  powerState: 'ON' | 'OFF'
  brightness: number
  colorTemperature: number // 2700~6500
}

export type keypadWebhookContext = deviceWebhookContext & {
  eventName: 'createKey' | 'deleteKey'
  commandId: string
  result: 'success' | 'failed' | 'timeout'
}

export type keypadTouchWebhookContext = deviceWebhookContext & {
  eventName: 'createKey' | 'deleteKey'
  commandId: string
  result: 'success' | 'failed' | 'timeout'
}

export type hub2WebhookContext = deviceWebhookContext & {
  temperature: number
  humidity: number
  lightLevel: number
  scale: 'CELSIUS' | 'FAHRENHEIT'
}

export type batteryCirculatorFanWebhookContext = deviceWebhookContext & {
  mode: 'direct' | 'natural' | 'sleep' | 'baby'
  version: string
  battery: number
  powerState: 'ON' | 'OFF'
  nightStatus: 'off' | 1 | 2
  oscillation: 'on' | 'off'
  verticalOscillation: 'on' | 'off'
  chargingStatus: 'charging' | 'uncharged'
  fanSpeed: number // 1~100
}

export type circulatorFanWebhookContext = deviceWebhookContext & {
  mode: 'direct' | 'natural' | 'sleep' | 'baby'
  version: string
  battery: number
  powerState: 'ON' | 'OFF'
  nightStatus: 'off' | 1 | 2
  oscillation: 'on' | 'off'
  verticalOscillation: 'on' | 'off'
  fanSpeed: number // 1~100
}

export type blindTiltWebhookContext = deviceWebhookContext & {
  version: string
  calibrate: boolean
  group: boolean
  direction: string
  slidePosition: number // 0~100
  battery: number
}

export type humidifierWebhookContext = deviceWebhookContext & {
  temperature: number
  humidity: number
  scale: 'CELSIUS' | 'FAHRENHEIT'
}

export type humidifier2WebhookContext = deviceWebhookContext & {
  temperature: number
  humidity: number
  scale: 'CELSIUS' | 'FAHRENHEIT'
}

export type relaySwitch1Context = deviceWebhookContext & {
  online: boolean
  overTemperature: boolean
  switchStatus: 0 | 1
  version: string
}

export type relaySwitch1PMContext = deviceWebhookContext & {
  online: boolean
  overTemperature: boolean
  switchStatus: 0 | 1
  overload: boolean
  version: string
}

export interface infraredRemoteList {
  device: irdevice[]
}

export interface irdevice {
  deviceId?: string
  deviceName: string
  remoteType: string
  hubDeviceId: string
}
