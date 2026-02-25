/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * device.ts: Switchbot BLE API registration.
 */
import type { Characteristic, Noble, Peripheral, Service } from '@stoprocent/noble'

import type { airPurifierServiceData, airPurifierTableServiceData, batteryCirculatorFanServiceData, blindTiltServiceData, botServiceData, ceilingLightProServiceData, ceilingLightServiceData, colorBulbServiceData, contactSensorServiceData, curtain3ServiceData, curtainServiceData, hub2ServiceData, hub3ServiceData, humidifier2ServiceData, humidifierServiceData, keypadDetectorServiceData, lockProServiceData, lockServiceData, meterPlusServiceData, meterProCO2ServiceData, meterProServiceData, meterServiceData, motionSensorServiceData, outdoorMeterServiceData, plugMiniEUServiceData, plugMiniJPServiceData, plugMiniUSServiceData, presenceSensorServiceData, relaySwitch1PMServiceData, relaySwitch1ServiceData, remoteServiceData, robotVacuumCleanerServiceData, stripLightServiceData, waterLeakDetectorServiceData } from './types/ble.js'

import { Buffer } from 'node:buffer'
import * as Crypto from 'node:crypto'
import { EventEmitter } from 'node:events'

import { CHAR_UUID_DEVICE, CHAR_UUID_NOTIFY, CHAR_UUID_WRITE, READ_TIMEOUT_MSEC, SERV_UUID_PRIMARY, WoSmartLockCommands, WoSmartLockProCommands, WRITE_TIMEOUT_MSEC } from './settings.js'

/**
 * Command constants for various SwitchBot devices.
 * Using readonly arrays to ensure immutability and better type safety.
 */
const DEVICE_COMMANDS = {
  BLIND_TILT: {
    OPEN: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x32] as const,
    CLOSE_UP: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x64] as const,
    CLOSE_DOWN: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x00] as const,
    PAUSE: [0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF] as const,
  },
  BULB: {
    BASE: [0x57, 0x0F, 0x47, 0x01] as const,
    READ_STATE: [0x57, 0x0F, 0x48, 0x01] as const,
    TURN_ON: [0x01, 0x01] as const,
    TURN_OFF: [0x01, 0x02] as const,
    SET_BRIGHTNESS: [0x02, 0x14] as const,
    SET_COLOR_TEMP: [0x02, 0x17] as const,
    SET_RGB: [0x02, 0x12] as const,
  },
  HUMIDIFIER: {
    HEADER: '5701' as const,
    TURN_ON: '570101' as const,
    TURN_OFF: '570102' as const,
    INCREASE: '570103' as const,
    DECREASE: '570104' as const,
    SET_AUTO_MODE: '570105' as const,
    SET_MANUAL_MODE: '570106' as const,
  },
  AIR_PURIFIER: {
    TURN_ON: [0x57, 0x01, 0x01] as const,
    TURN_OFF: [0x57, 0x01, 0x02] as const,
    SET_MODE: [0x57, 0x02] as const,
    SET_SPEED: [0x57, 0x03] as const,
  },
  // Common commands used across multiple devices
  COMMON: {
    POWER_ON: [0x57, 0x01, 0x01] as const,
    POWER_OFF: [0x57, 0x01, 0x02] as const,
  },
} as const

/**
 * Air quality level constants for air purifier devices.
 */
const AIR_QUALITY_LEVELS = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
} as const

/**
 * Air purifier mode constants.
 */
const AIR_PURIFIER_MODES = {
  MANUAL: 'manual',
  AUTO: 'auto',
  SLEEP: 'sleep',
  LEVEL_1: 'level_1',
  LEVEL_2: 'level_2',
  LEVEL_3: 'level_3',
} as const

// Legacy constants for backward compatibility
const BLIND_TILT_COMMANDS = DEVICE_COMMANDS.BLIND_TILT
const BULB_COMMANDS = DEVICE_COMMANDS.BULB
const HUMIDIFIER_COMMAND_HEADER = DEVICE_COMMANDS.HUMIDIFIER.HEADER
const TURN_ON_KEY = DEVICE_COMMANDS.HUMIDIFIER.TURN_ON
const TURN_OFF_KEY = DEVICE_COMMANDS.HUMIDIFIER.TURN_OFF
const INCREASE_KEY = DEVICE_COMMANDS.HUMIDIFIER.INCREASE
const DECREASE_KEY = DEVICE_COMMANDS.HUMIDIFIER.DECREASE
const SET_AUTO_MODE_KEY = DEVICE_COMMANDS.HUMIDIFIER.SET_AUTO_MODE
const SET_MANUAL_MODE_KEY = DEVICE_COMMANDS.HUMIDIFIER.SET_MANUAL_MODE

export type MacAddress = string

export interface ad {
  id: string
  address: string
  rssi: number
  serviceData: airPurifierServiceData | airPurifierTableServiceData | botServiceData | colorBulbServiceData | contactSensorServiceData | curtainServiceData | curtain3ServiceData | stripLightServiceData | lockServiceData | lockProServiceData | meterServiceData | meterPlusServiceData | meterProServiceData | meterProCO2ServiceData | motionSensorServiceData | presenceSensorServiceData | outdoorMeterServiceData | plugMiniUSServiceData | plugMiniJPServiceData | plugMiniEUServiceData | blindTiltServiceData | ceilingLightServiceData | ceilingLightProServiceData | hub2ServiceData | hub3ServiceData | batteryCirculatorFanServiceData | waterLeakDetectorServiceData | humidifierServiceData | humidifier2ServiceData | robotVacuumCleanerServiceData | keypadDetectorServiceData | relaySwitch1PMServiceData | relaySwitch1ServiceData | remoteServiceData
  [key: string]: unknown
}

export type ondiscover = (device: SwitchbotDevice) => Promise<void> | void

export type onadvertisement = (ad: ad) => Promise<void> | void

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
  MeterPro: DeviceInfo
  MeterProCO2: DeviceInfo
  Hub2: DeviceInfo
  Hub3: DeviceInfo
  OutdoorMeter: DeviceInfo
  MotionSensor: DeviceInfo
  PresenceSensor: DeviceInfo
  ContactSensor: DeviceInfo
  ColorBulb: DeviceInfo
  StripLight: DeviceInfo
  PlugMiniUS: DeviceInfo
  PlugMiniJP: DeviceInfo
  PlugMiniEU: DeviceInfo
  Lock: DeviceInfo
  LockPro: DeviceInfo
  CeilingLight: DeviceInfo
  CeilingLightPro: DeviceInfo
  BlindTilt: DeviceInfo
  Unknown: DeviceInfo
  AirPurifier: DeviceInfo
  AirPurifierTable: DeviceInfo
}

export enum SwitchBotModel {
  HubMini = 'W0202200',
  HubPlus = 'SwitchBot Hub S1',
  Hub2 = 'W3202100',
  Hub3 = 'W3302100',
  Bot = 'SwitchBot S1',
  Curtain = 'W0701600',
  Curtain3 = 'W2400000',
  Humidifier = 'W0801800',
  Humidifier2 = 'WXXXXXXX',
  Plug = 'SP11', // Currently only available in Japan
  Meter = 'SwitchBot MeterTH S1',
  MeterPlusJP = 'W2201500',
  MeterPlusUS = 'W2301500',
  MeterPro = 'W4900000',
  MeterProCO2 = 'W4900010',
  OutdoorMeter = 'W3400010',
  MotionSensor = 'W1101500',
  PresenceSensor = 'W8200000',
  ContactSensor = 'W1201500',
  ColorBulb = 'W1401400',
  StripLight = 'W1701100',
  PlugMiniUS = 'W1901400/W1901401',
  PlugMiniJP = 'W2001400/W2001401',
  PlugMiniEU = 'W7732300',
  Lock = 'W1601700',
  LockPro = 'W3500000',
  LockUltra = 'W3600000',
  Keypad = 'W2500010',
  KeypadTouch = 'W2500020',
  K10 = 'K10+',
  K10Pro = 'K10+ Pro',
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
  CirculatorFan = 'W3800511',
  WaterDetector = 'W4402000',
  RelaySwitch1 = 'W5502300',
  RelaySwitch1PM = 'W5502310',
  Unknown = 'Unknown',
  AirPurifier = 'W5302300',
  AirPurifierTable = 'W5302310',
}

export enum SwitchBotBLEModel {
  Bot = 'H',
  Curtain = 'c',
  Curtain3 = '{',
  Humidifier = 'e',
  Humidifier2 = '#',
  Meter = 'T',
  MeterPlus = 'i',
  MeterPro = '4',
  MeterProCO2 = '5',
  Hub2 = 'v',
  Hub3 = 'V',
  OutdoorMeter = 'w',
  MotionSensor = 's',
  PresenceSensor = 'p',
  ContactSensor = 'd',
  ColorBulb = 'u',
  StripLight = 'r',
  PlugMiniUS = 'g',
  PlugMiniJP = 'j', // Only available in Japan.
  PlugMiniEU = 'l', // Only available in Europe.
  Lock = 'o',
  LockPro = '$',
  LockUltra = 'U',
  CeilingLight = 'q', // Currently only available in Japan.
  CeilingLightPro = 'n', // Currently only available in Japan.
  BlindTilt = 'x',
  Leak = '&',
  Keypad = 'y',
  RelaySwitch1 = ';',
  RelaySwitch1PM = '<',
  Remote = 'b',
  Unknown = 'Unknown',
  AirPurifier = '+',
  AirPurifierTable = '7',
}

export enum SwitchBotBLEModelName {
  Bot = 'WoHand',
  Hub2 = 'WoHub2',
  Hub3 = 'WoHub3',
  ColorBulb = 'WoBulb',
  Curtain = 'WoCurtain',
  Curtain3 = 'WoCurtain3',
  Humidifier = 'WoHumi',
  Humidifier2 = 'WoHumi2',
  Meter = 'WoSensorTH',
  MeterPlus = 'WoSensorTHPlus',
  MeterPro = 'WoSensorTHP',
  MeterProCO2 = 'WoSensorTHPc',
  Lock = 'WoSmartLock',
  LockPro = 'WoSmartLockPro',
  LockUltra = 'WoSmartLockUltra',
  PresenceSensor = 'WoPresence',
  PlugMini = 'WoPlugMini',
  StripLight = 'WoStrip',
  OutdoorMeter = 'WoIOSensorTH',
  ContactSensor = 'WoContact',
  MotionSensor = 'WoMotion',
  BlindTilt = 'WoBlindTilt',
  CeilingLight = 'WoCeilingLight',
  CeilingLightPro = 'WoCeilingLightPro',
  Leak = 'WoLeakDetector',
  Keypad = 'WoKeypad',
  RelaySwitch1 = 'WoRelaySwitch1Plus',
  RelaySwitch1PM = 'WoRelaySwitch1PM',
  Remote = 'WoRemote',
  AirPurifier = 'WoAirPurifier',
  AirPurifierTable = 'WoAirPurifierTable',
  Unknown = 'Unknown',
}

export enum SwitchBotBLEModelFriendlyName {
  Bot = 'Bot',
  Hub2 = 'Hub 2',
  Hub3 = 'Hub 3',
  ColorBulb = 'Color Bulb',
  Curtain = 'Curtain',
  Curtain3 = 'Curtain 3',
  Humidifier = 'Humidifier',
  Humidifier2 = 'Humidifier2',
  Meter = 'Meter',
  Lock = 'Lock',
  LockPro = 'Lock Pro',
  LockUltra = 'Lock Ultra',
  PlugMini = 'Plug Mini',
  StripLight = 'Strip Light',
  MeterPlus = 'Meter Plus',
  MeterPro = 'Meter Pro',
  MeterProCO2 = 'Meter Pro CO2',
  BatteryCirculatorFan = 'Battery Circulator Fan',
  CirculatorFan = 'Circulator Fan',
  OutdoorMeter = 'Outdoor Meter',
  ContactSensor = 'Contact Sensor',
  MotionSensor = 'Motion Sensor',
  PresenceSensor = 'Presence Sensor',
  BlindTilt = 'Blind Tilt',
  CeilingLight = 'Ceiling Light',
  CeilingLightPro = 'Ceiling Light Pro',
  Leak = 'Water Detector',
  Keypad = 'Keypad',
  RelaySwitch1 = 'Relay Switch 1',
  RelaySwitch1PM = 'Relay Switch 1PM',
  Remote = 'Remote',
  AirPurifier = 'Air Purifier',
  AirPurifierTable = 'Air Purifier Table',
  Unknown = 'Unknown',
  AirPurifierVOC = 'Air Purifier VOC',
  AirPurifierTableVOC = 'Air Purifier Table VOC',
  AirPurifierPM2_5 = 'Air Purifier PM2.5',
  AirPurifierTablePM2_5 = 'Air Purifier Table PM2.5',
}

export interface Params {
  duration?: number
  model?: string
  id?: string
  quick?: boolean
  noble?: Noble
}

export interface ErrorObject {
  code: string
  message: string
}

export interface Chars {
  write: Characteristic | null
  notify: Characteristic | null
  device: Characteristic | null
}

export interface NobleTypes {
  noble: Noble
  peripheral: Peripheral
}

export interface ServiceData {
  model: string
  [key: string]: unknown
}

export interface AdvertisementData {
  serviceData: Buffer | null
  manufacturerData: Buffer | null
}

export interface Rule {
  required?: boolean
  min?: number
  max?: number
  minBytes?: number
  maxBytes?: number
  pattern?: RegExp
  enum?: unknown[]
  type?: 'float' | 'integer' | 'boolean' | 'array' | 'object' | 'string'
}

/**
 * Enum for log levels.
 */
export enum LogLevel {
  SUCCESS = 'success',
  DEBUGSUCCESS = 'debugsuccess',
  WARN = 'warn',
  DEBUGWARN = 'debugwarn',
  ERROR = 'error',
  DEBUGERROR = 'debugerror',
  DEBUG = 'debug',
  INFO = 'info',
}

/**
 * Utility class for comprehensive input validation with improved error messages.
 */
export class ValidationUtils {
  /**
   * Validates percentage value (0-100).
   * @param value - The value to validate
   * @param paramName - The parameter name for error reporting
   * @throws {RangeError} When value is not within valid range
   * @throws {TypeError} When value is not a number
   */
  static validatePercentage(value: number, paramName: string = 'value'): void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError(`${paramName} must be a valid number, got: ${value}`)
    }
    if (value < 0 || value > 100) {
      throw new RangeError(`${paramName} must be between 0 and 100 inclusive, got: ${value}`)
    }
  }

  /**
   * Validates RGB color value (0-255).
   * @param value - The color value to validate
   * @param colorName - The color name for error reporting
   * @throws {RangeError} When value is not within valid range
   * @throws {TypeError} When value is not a number
   */
  static validateRGB(value: number, colorName: string = 'color'): void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError(`${colorName} must be a valid number, got: ${value}`)
    }
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new RangeError(`${colorName} must be an integer between 0 and 255 inclusive, got: ${value}`)
    }
  }

  /**
   * Validates buffer and throws descriptive error.
   * @param buffer - The buffer to validate
   * @param expectedLength - Optional expected length
   * @param paramName - The parameter name for error reporting
   * @throws {TypeError} When buffer is not a Buffer
   * @throws {RangeError} When buffer length doesn't match expected
   */
  static validateBuffer(buffer: any, expectedLength?: number, paramName: string = 'buffer'): asserts buffer is Buffer {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError(`${paramName} must be a Buffer instance, got: ${typeof buffer}`)
    }
    if (expectedLength !== undefined && buffer.length !== expectedLength) {
      throw new RangeError(`${paramName} must have exactly ${expectedLength} bytes, got: ${buffer.length} bytes`)
    }
  }

  /**
   * Validates string input with comprehensive checks.
   * @param value - The value to validate
   * @param paramName - The parameter name for error reporting
   * @param minLength - Minimum required length
   * @param maxLength - Optional maximum length
   * @throws {TypeError} When value is not a string
   * @throws {RangeError} When string length is invalid
   */
  static validateString(
    value: any,
    paramName: string = 'value',
    minLength: number = 1,
    maxLength?: number,
  ): asserts value is string {
    if (typeof value !== 'string') {
      throw new TypeError(`${paramName} must be a string, got: ${typeof value}`)
    }
    if (value.length < minLength) {
      throw new RangeError(`${paramName} must have at least ${minLength} character(s), got: ${value.length}`)
    }
    if (maxLength !== undefined && value.length > maxLength) {
      throw new RangeError(`${paramName} must have at most ${maxLength} character(s), got: ${value.length}`)
    }
  }

  /**
   * Validates numeric range with enhanced checks.
   * @param value - The value to validate
   * @param min - Minimum allowed value
   * @param max - Maximum allowed value
   * @param paramName - The parameter name for error reporting
   * @param mustBeInteger - Whether the value must be an integer
   * @throws {TypeError} When value is not a number
   * @throws {RangeError} When value is outside valid range
   */
  static validateRange(
    value: number,
    min: number,
    max: number,
    paramName: string = 'value',
    mustBeInteger: boolean = false,
  ): void {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new TypeError(`${paramName} must be a valid number, got: ${value}`)
    }
    if (mustBeInteger && !Number.isInteger(value)) {
      throw new TypeError(`${paramName} must be an integer, got: ${value}`)
    }
    if (value < min || value > max) {
      throw new RangeError(`${paramName} must be between ${min} and ${max} inclusive, got: ${value}`)
    }
  }

  /**
   * Validates MAC address format.
   * @param address - The MAC address to validate
   * @param paramName - The parameter name for error reporting
   * @throws {TypeError} When address is not a string
   * @throws {Error} When address format is invalid
   */
  static validateMacAddress(address: any, paramName: string = 'address'): asserts address is string {
    if (typeof address !== 'string') {
      throw new TypeError(`${paramName} must be a string`)
    }
    const macRegex = /^(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}$|^[0-9A-F]{12}$/i
    if (!macRegex.test(address)) {
      throw new Error(`${paramName} must be a valid MAC address format, got: ${address}`)
    }
  }

  /**
   * Validates that a value is one of the allowed enum values.
   * @param value - The value to validate
   * @param allowedValues - Array of allowed values
   * @param paramName - The parameter name for error reporting
   * @throws {Error} When value is not in allowed values
   */
  static validateEnum<T>(value: any, allowedValues: readonly T[], paramName: string = 'value'): asserts value is T {
    if (!allowedValues.includes(value)) {
      throw new Error(`${paramName} must be one of: ${allowedValues.join(', ')}, got: ${value}`)
    }
  }
}

/**
 * Enhanced error handling utilities.
 */
export class ErrorUtils {
  /**
   * Creates a timeout error with context.
   * @param operation - The operation that timed out
   * @param timeoutMs - The timeout duration in milliseconds
   * @returns A descriptive timeout error
   */
  static createTimeoutError(operation: string, timeoutMs: number): Error {
    return new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`)
  }

  /**
   * Creates a connection error with context.
   * @param deviceId - The device ID that failed to connect
   * @param cause - The underlying cause of the connection failure
   * @returns A descriptive connection error
   */
  static createConnectionError(deviceId: string, cause?: Error): Error {
    const message = `Failed to connect to device ${deviceId}`
    return cause ? new Error(`${message}: ${cause.message}`) : new Error(message)
  }

  /**
   * Creates a command error with context.
   * @param command - The command that failed
   * @param deviceId - The device ID
   * @param cause - The underlying cause
   * @returns A descriptive command error
   */
  static createCommandError(command: string, deviceId: string, cause?: Error): Error {
    const message = `Command '${command}' failed for device ${deviceId}`
    return cause ? new Error(`${message}: ${cause.message}`) : new Error(message)
  }

  /**
   * Wraps an async operation with timeout and enhanced error handling.
   * @param operation - The async operation to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param operationName - Name of the operation for error messages
   * @returns Promise that resolves with the operation result or rejects with timeout
   */
  static async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    operationName: string,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(this.createTimeoutError(operationName, timeoutMs))
      }, timeoutMs)
    })

    return Promise.race([operation, timeoutPromise])
  }
}

/**
 * Represents a Switchbot Device.
 */
export class SwitchbotDevice extends EventEmitter {
  private noble: Noble
  private peripheral: NobleTypes['peripheral']
  private characteristics: Chars | null = null
  private deviceId!: string
  private deviceAddress!: string
  private deviceModel!: SwitchBotBLEModel
  private deviceModelName!: SwitchBotBLEModelName
  private deviceFriendlyName!: SwitchBotBLEModelFriendlyName
  private explicitlyConnected = false
  private isConnected = false
  private onNotify: (buf: Buffer) => void = () => { }
  private onDisconnect: () => Promise<void> = async () => { }
  private onConnect: () => Promise<void> = async () => { }

  /**
   * Initializes a new instance of the SwitchbotDevice class.
   * @param peripheral The peripheral object from noble.
   * @param noble The Noble object.
   */
  constructor(peripheral: NobleTypes['peripheral'], noble: Noble) {
    super()
    this.peripheral = peripheral
    this.noble = noble

    Advertising.parse(peripheral, this.log.bind(this)).then((ad) => {
      this.deviceId = ad?.id ?? ''
      this.deviceAddress = ad?.address ?? ''
      this.deviceModel = ad?.serviceData.model as SwitchBotBLEModel ?? ''
      this.deviceModelName = ad?.serviceData.modelName as SwitchBotBLEModelName ?? ''
      this.deviceFriendlyName = ad?.serviceData.modelFriendlyName as SwitchBotBLEModelFriendlyName ?? ''
    })
  }

  /**
   * Logs a message with the specified log level.
   * @param level The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message The log message to be emitted.
   */
  public async log(level: string, message: string): Promise<void> {
    this.emit('log', { level, message })
  }

  // Getters
  get id(): string {
    return this.deviceId
  }

  get address(): string {
    return this.deviceAddress
  }

  get model(): SwitchBotBLEModel {
    return this.deviceModel
  }

  get modelName(): SwitchBotBLEModelName {
    return this.deviceModelName
  }

  get friendlyName(): SwitchBotBLEModelFriendlyName {
    return this.deviceFriendlyName
  }

  get connectionState(): string {
    return this.isConnected ? 'connected' : this.peripheral.state
  }

  get onConnectHandler(): () => Promise<void> {
    return this.onConnect
  }

  set onConnectHandler(func: () => Promise<void>) {
    if (typeof func !== 'function') {
      throw new TypeError('The `onConnectHandler` must be a function that returns a Promise<void>.')
    }
    this.onConnect = async () => {
      await func()
    }
  }

  get onDisconnectHandler(): () => Promise<void> {
    return this.onDisconnect
  }

  set onDisconnectHandler(func: () => Promise<void>) {
    if (typeof func !== 'function') {
      throw new TypeError('The `onDisconnectHandler` must be a function that returns a Promise<void>.')
    }
    this.onDisconnect = async () => {
      await func()
    }
  }

  /**
   * Connects to the device.
   * @returns A Promise that resolves when the connection is complete.
   */
  async connect(): Promise<void> {
    this.explicitlyConnected = true
    await this.internalConnect()
  }

  /**
   * Internal method to handle the connection process.
   * @returns A Promise that resolves when the connection is complete.
   */
  public async internalConnect(): Promise<void> {
    if (this.noble.state !== 'poweredOn') {
      throw new Error(`The Bluetooth status is ${this.noble.state}, not poweredOn.`)
    }

    const state = this.connectionState
    if (state === 'connected') {
      return
    }
    if (state === 'connecting' || state === 'disconnecting') {
      throw new Error(`Now ${state}. Wait for a few seconds then try again.`)
    }

    this.peripheral.once('connect', async () => {
      this.isConnected = true
      await this.onConnect()
    })

    this.peripheral.once('disconnect', async () => {
      this.isConnected = false
      this.characteristics = null
      this.peripheral.removeAllListeners()
      await this.onDisconnect()
    })

    await this.peripheral.connectAsync()
    this.characteristics = await this.getCharacteristics()
    await this.subscribeToNotify()
  }

  /**
   * Retrieves the device characteristics.
   * @returns A Promise that resolves with the device characteristics.
   */
  public async getCharacteristics(): Promise<Chars> {
    const TIMEOUT_DURATION = 5000

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Failed to discover services and characteristics: TIMEOUT'))
      }, TIMEOUT_DURATION)
    })

    try {
      const services = await Promise.race([this.discoverServices(), timeoutPromise]) as NobleTypes['peripheral']['services']
      const chars: Chars = { write: null, notify: null, device: null }

      for (const service of services) {
        const characteristics = await this.discoverCharacteristics(service)
        for (const char of characteristics) {
          if (char.uuid === CHAR_UUID_WRITE) {
            chars.write = char
          }
          if (char.uuid === CHAR_UUID_NOTIFY) {
            chars.notify = char
          }
          if (char.uuid === CHAR_UUID_DEVICE) {
            chars.device = char
          }
        }
      }

      if (!chars.write || !chars.notify) {
        throw new Error('No characteristic was found.')
      }

      return chars
    } catch (error) {
      throw new Error((error as Error).message || 'An error occurred while discovering characteristics.')
    }
  }

  /**
   * Discovers the device services.
   * @returns A Promise that resolves with the list of services.
   */
  public async discoverServices(): Promise<NobleTypes['peripheral']['services']> {
    try {
      const services = await this.peripheral.discoverServicesAsync([])
      const primaryServices = services.filter(s => s.uuid === SERV_UUID_PRIMARY)

      if (primaryServices.length === 0) {
        throw new Error('No service was found.')
      }
      return primaryServices
    } catch (e: any) {
      throw new Error(`Failed to discover services, Error: ${e.message ?? e}`)
    }
  }

  /**
   * Discovers the characteristics of a service.
   * @param service The service to discover characteristics for.
   * @returns A Promise that resolves with the list of characteristics.
   */
  // Discover characteristics without extra async/await
  private discoverCharacteristics(service: Service): Promise<Characteristic[]> {
    return service.discoverCharacteristicsAsync([])
  }

  /**
   * Subscribes to the notify characteristic.
   * @returns A Promise that resolves when the subscription is complete.
   */
  private async subscribeToNotify(): Promise<void> {
    const char = this.characteristics?.notify
    if (!char) {
      throw new Error('No notify characteristic was found.')
    }
    await char.subscribeAsync()
    char.on('data', (buf: Buffer) => this.onNotify(buf))
  }

  /**
   * Unsubscribes from the notify characteristic.
   * @returns A Promise that resolves when the unsubscription is complete.
   */
  async unsubscribeFromNotify(): Promise<void> {
    const char = this.characteristics?.notify
    if (!char) {
      return
    }
    char.removeAllListeners()
    await char.unsubscribeAsync()
  }

  /**
   * Disconnects from the device.
   * @returns A Promise that resolves when the disconnection is complete.
   */
  async disconnect(): Promise<void> {
    this.explicitlyConnected = false
    const state = this.peripheral.state

    if (state === 'disconnected') {
      return
    }
    if (state === 'connecting' || state === 'disconnecting') {
      throw new Error(`Now ${state}. Wait for a few seconds then try again.`)
    }

    await this.unsubscribeFromNotify()
    await this.peripheral.disconnectAsync()
  }

  /**
   * Internal method to handle disconnection if not explicitly initiated.
   * @returns A Promise that resolves when the disconnection is complete.
   */
  private async internalDisconnect(): Promise<void> {
    if (!this.explicitlyConnected) {
      await this.disconnect()
      this.explicitlyConnected = true
    }
  }

  /**
   * Retrieves the device name.
   * @returns A Promise that resolves with the device name.
   */
  async getDeviceName(): Promise<string> {
    await this.internalConnect()
    try {
      if (!this.characteristics?.device) {
        throw new Error(`Characteristic ${CHAR_UUID_DEVICE} not supported`)
      }
      const buf = await this.readCharacteristic(this.characteristics.device)
      return buf.toString('utf8')
    } catch (error: any) {
      const deviceContext = `device ${this.deviceId || 'unknown'}`
      throw ErrorUtils.createCommandError('getDeviceName', deviceContext, error)
    } finally {
      await this.internalDisconnect()
    }
  }

  /**
   * Sets the device name.
   * @param name The new device name.
   * @returns A Promise that resolves when the name is set.
   */
  async setDeviceName(name: string): Promise<void> {
    ValidationUtils.validateString(name, 'name', 1)

    // Additional validation for device name length
    const nameBuffer = Buffer.from(name, 'utf8')
    if (nameBuffer.length > 100) {
      throw new RangeError('Device name cannot exceed 100 bytes when encoded as UTF-8')
    }

    await this.internalConnect()
    try {
      if (!this.characteristics?.device) {
        throw new Error(`Characteristic ${CHAR_UUID_DEVICE} not supported`)
      }
      await this.writeCharacteristic(this.characteristics.device, nameBuffer)
    } catch (error: any) {
      const deviceContext = `device ${this.deviceId || 'unknown'}`
      throw ErrorUtils.createCommandError('setDeviceName', deviceContext, error)
    } finally {
      await this.internalDisconnect()
    }
  }

  /**
   * Sends a command to the device and awaits a response.
   * @param reqBuf The command buffer.
   * @returns A Promise that resolves with the response buffer.
   */
  async command(reqBuf: Buffer): Promise<Buffer> {
    ValidationUtils.validateBuffer(reqBuf, undefined, 'reqBuf')

    await this.internalConnect()
    if (!this.characteristics?.write) {
      throw new Error('No write characteristic available for command execution')
    }

    try {
      await this.writeCharacteristic(this.characteristics.write, reqBuf)
      const resBuf = await this.waitForCommandResponse()
      return resBuf
    } catch (error: any) {
      const deviceContext = `device ${this.deviceId || 'unknown'}`
      // Use ErrorUtils for enriched error context
      throw ErrorUtils.createCommandError('execute command', deviceContext, error)
    } finally {
      await this.internalDisconnect()
    }
  }

  /**
   * Waits for a response from the device after sending a command.
   * @returns A Promise that resolves with the response buffer.
   */
  private async waitForCommandResponse(): Promise<Buffer> {
    const timeout = READ_TIMEOUT_MSEC
    let timer: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('READ_TIMEOUT')), timeout)
    })

    const readPromise = new Promise<Buffer>((resolve) => {
      this.onNotify = (buf: Buffer) => {
        if (timer) {
          clearTimeout(timer)
        }
        resolve(buf)
      }
    })

    return await Promise.race([readPromise, timeoutPromise])
  }

  /**
   * Reads data from a characteristic with enhanced timeout and error handling.
   * @param char The characteristic to read from.
   * @returns A Promise that resolves with the data buffer.
   */
  private async readCharacteristic(char: Characteristic): Promise<Buffer> {
    try {
      return await ErrorUtils.withTimeout(
        char.readAsync(),
        READ_TIMEOUT_MSEC,
        `read characteristic ${char.uuid}`,
      )
    } catch (error) {
      const deviceContext = `device ${this.deviceId || 'unknown'}`
      throw ErrorUtils.createCommandError(`read characteristic ${char.uuid}`, deviceContext, error as Error)
    }
  }

  /**
   * Writes data to a characteristic with enhanced timeout and error handling.
   * @param char The characteristic to write to.
   * @param buf The data buffer.
   * @returns A Promise that resolves when the write is complete.
   */
  private async writeCharacteristic(char: Characteristic, buf: Buffer): Promise<void> {
    ValidationUtils.validateBuffer(buf, undefined, 'write buffer')

    try {
      return await ErrorUtils.withTimeout(
        char.writeAsync(buf, false),
        WRITE_TIMEOUT_MSEC,
        `write to characteristic ${char.uuid}`,
      )
    } catch (error) {
      const deviceContext = `device ${this.deviceId || 'unknown'}`
      throw ErrorUtils.createCommandError(`write to characteristic ${char.uuid}`, deviceContext, error as Error)
    }
  }
}

/**
 * Represents the advertising data parser for SwitchBot devices.
 */
export class Advertising {
  constructor() { }

  /**
   * Parses the advertisement data coming from SwitchBot device.
   *
   * This function processes advertising packets received from SwitchBot devices
   * and extracts relevant information based on the device type.
   *
   * @param {NobleTypes['peripheral']} peripheral - The peripheral device object from noble.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<Ad | null>} - An object containing parsed data specific to the SwitchBot device type, or `null` if the device is not recognized.
   */
  static async parse(
    peripheral: NobleTypes['peripheral'],
    emitLog: (level: string, message: string) => void,
  ): Promise<ad | null> {
    const ad = peripheral.advertisement
    if (!ad || !ad.serviceData) {
      return null
    }

    const serviceData = ad.serviceData[0]?.data
    const manufacturerData = ad.manufacturerData

    // Service data must exist and contain at least the model byte (1 byte minimum)
    // At least one of serviceData or manufacturerData should have sufficient data (3+ bytes)
    if (!Advertising.validateBuffer(serviceData, 1)) {
      return null
    }

    if (!Advertising.validateBuffer(serviceData, 3) && !Advertising.validateBuffer(manufacturerData, 3)) {
      return null
    }

    const model = serviceData.subarray(0, 1).toString('utf8')
    const sd = await Advertising.parseServiceData(model, serviceData, manufacturerData, emitLog)
    if (!sd) {
      // emitLog('debugerror', `[parseAdvertising.${peripheral.id}.${model}] return null, parsed serviceData empty!`)
      return null
    }

    const address = Advertising.formatAddress(peripheral)
    const data = {
      id: peripheral.id,
      address,
      rssi: peripheral.rssi,
      serviceData: {
        model,
        modelName: sd.modelName || '',
        modelFriendlyName: sd.modelFriendlyName || '',
        ...sd,
      },
    }

    emitLog('debug', `[parseAdvertising.${peripheral.id}.${model}] return ${JSON.stringify(data)}`)
    return data
  }

  /**
   * Validates if the buffer is a valid Buffer object with a minimum length.
   *
   * @param {any} buffer - The buffer to validate.
   * @param {number} minLength - The minimum required length.
   * @returns {boolean} - True if the buffer is valid, false otherwise.
   */
  private static validateBuffer(buffer: any, minLength: number = 3): boolean {
    return buffer && Buffer.isBuffer(buffer) && buffer.length >= minLength
  }

  /**
   * Parses the service data based on the device model.
   *
   * @param {string} model - The device model.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<any>} - The parsed service data.
   */
  public static async parseServiceData(
    model: string,
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<any> {
    switch (model) {
      case SwitchBotBLEModel.Bot:
        return WoHand.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.Curtain:
      case SwitchBotBLEModel.Curtain3:
        return WoCurtain.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.Humidifier:
        return WoHumi.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.Humidifier2:
        return WoHumi2.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.Meter:
        return WoSensorTH.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.MeterPlus:
        return WoSensorTHPlus.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.MeterPro:
        return WoSensorTHPro.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.MeterProCO2:
        return WoSensorTHProCO2.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.Hub2:
        return WoHub2.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.Hub3:
        return WoHub3.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.OutdoorMeter:
        return WoIOSensorTH.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.AirPurifier:
        return WoAirPurifier.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.AirPurifierTable:
        return WoAirPurifierTable.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.MotionSensor:
        return WoPresence.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.PresenceSensor:
        return WoPresence.parsePresenceSensorServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.ContactSensor:
        return WoContact.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.Remote:
        return WoRemote.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.ColorBulb:
        return WoBulb.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.CeilingLight:
        return WoCeilingLight.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.CeilingLightPro:
        return WoCeilingLight.parseServiceData_Pro(manufacturerData, emitLog)
      case SwitchBotBLEModel.StripLight:
        return WoStrip.parseServiceData(serviceData, emitLog)
      case SwitchBotBLEModel.PlugMiniUS:
        return WoPlugMiniUS.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.PlugMiniJP:
        return WoPlugMiniJP.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.PlugMiniEU:
        return WoPlugMiniEU.parseServiceData(manufacturerData, emitLog)
      case SwitchBotBLEModel.Lock:
        return WoSmartLock.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.LockPro:
        return WoSmartLockPro.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.LockUltra:
        return WoSmartLockUltra.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.BlindTilt:
        return WoBlindTilt.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.Leak:
        return WoLeak.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.RelaySwitch1:
        return WoRelaySwitch1.parseServiceData(serviceData, manufacturerData, emitLog)
      case SwitchBotBLEModel.RelaySwitch1PM:
        return WoRelaySwitch1PM.parseServiceData(serviceData, manufacturerData, emitLog)
      default:
        emitLog('debug', `[parseAdvertising.${model}] return null, model "${model}" not available!`)
        return null
    }
  }

  /**
   * Formats the address of the peripheral.
   *
   * @param {NobleTypes['peripheral']} peripheral - The peripheral device object from noble.
   * @returns {string} - The formatted address.
   */
  private static formatAddress(peripheral: NobleTypes['peripheral']): string {
    let address = peripheral.address || ''
    if (address === '') {
      const str = peripheral.advertisement.manufacturerData?.toString('hex').slice(4, 16) || ''
      if (str !== '') {
        address = str.match(/.{1,2}/g)?.join(':') || ''
      }
    } else {
      address = address.replace(/-/g, ':')
    }
    return address
  }
}

/**
 * Class representing a WoBlindTilt device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/curtain.md
 */
export class WoBlindTilt extends SwitchbotDevice {
  private reverse: boolean = false

  /**
   * Parses the service data and manufacturer data for the WoBlindTilt device.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @param {boolean} [reverse] - Whether to reverse the tilt percentage.
   * @returns {Promise<blindTiltServiceData | null>} - The parsed data object or null if the data is invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
    reverse: boolean = false,
  ): Promise<blindTiltServiceData | null> {
    if (![5, 6].includes(manufacturerData.length)) {
      emitLog('debugerror', `[parseServiceDataForWoBlindTilt] Buffer length ${manufacturerData.length} !== 5 or 6!`)
      return null
    }

    const byte2 = serviceData.readUInt8(2)
    const byte6 = manufacturerData.subarray(6)

    const tilt = Math.max(Math.min(byte6.readUInt8(2) & 0b01111111, 100), 0)
    const inMotion = !!(byte2 & 0b10000000)
    const lightLevel = (byte6.readUInt8(1) >> 4) & 0b00001111
    const calibration = !!(byte6.readUInt8(1) & 0b00000001)
    const sequenceNumber = byte6.readUInt8(0)
    const battery = serviceData.length > 2 ? byte2 & 0b01111111 : 0

    const data: blindTiltServiceData = {
      model: SwitchBotBLEModel.BlindTilt,
      modelName: SwitchBotBLEModelName.BlindTilt,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.BlindTilt,
      calibration,
      battery,
      inMotion,
      tilt: reverse ? 100 - tilt : tilt,
      lightLevel,
      sequenceNumber,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Opens the blind tilt to the fully open position.
   * @returns {Promise<void>}
   */
  async open(): Promise<void> {
    await this.operateBlindTilt([...BLIND_TILT_COMMANDS.OPEN])
  }

  /**
   * Closes the blind tilt up to the nearest endpoint.
   * @returns {Promise<void>}
   */
  async closeUp(): Promise<void> {
    await this.operateBlindTilt([...BLIND_TILT_COMMANDS.CLOSE_UP])
  }

  /**
   * Closes the blind tilt down to the nearest endpoint.
   * @returns {Promise<void>}
   */
  async closeDown(): Promise<void> {
    await this.operateBlindTilt([...BLIND_TILT_COMMANDS.CLOSE_DOWN])
  }

  /**
   * Closes the blind tilt to the nearest endpoint.
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    const position = await this.getPosition()
    if (position > 50) {
      await this.closeUp()
    } else {
      await this.closeDown()
    }
  }

  /**
   * Retrieves the current position of the blind tilt.
   * @returns {Promise<number>} - The current position of the blind tilt (0-100).
   */
  async getPosition(): Promise<number> {
    const tiltPosition = await this._getAdvValue('tilt')
    return Math.max(0, Math.min(tiltPosition, 100))
  }

  /**
   * Retrieves the advertised value for a given key.
   * @param {string} key - The key for the advertised value.
   * @returns {Promise<number>} - The advertised value.
   * @private
   */
  private async _getAdvValue(key: string): Promise<number> {
    if (key === 'tilt') {
      return 50 // Example value
    }
    throw new Error(`Unknown key: ${key}`)
  }

  /**
   * Retrieves the basic information of the blind tilt.
   * @returns {Promise<object | null>} - A promise that resolves to an object containing the basic information of the blind tilt.
   */
  async getBasicInfo(): Promise<object | null> {
    const data: any = await this.getBasicInfo()
    if (!data) {
      return null
    }

    const tilt = Math.max(Math.min(data[6], 100), 0)
    const moving = Boolean(data[5] & 0b00000011)
    let opening = false
    let closing = false
    let up = false

    if (moving) {
      opening = Boolean(data[5] & 0b00000010)
      closing = !opening && Boolean(data[5] & 0b00000001)
      if (opening) {
        const flag = Boolean(data[5] & 0b00000001)
        up = flag ? this.reverse : !flag
      } else {
        up = tilt < 50 ? this.reverse : tilt > 50
      }
    }

    return {
      battery: data[1],
      firmware: data[2] / 10.0,
      light: Boolean(data[4] & 0b00100000),
      fault: Boolean(data[4] & 0b00001000),
      solarPanel: Boolean(data[5] & 0b00001000),
      calibration: Boolean(data[5] & 0b00000100),
      calibrated: Boolean(data[5] & 0b00000100),
      inMotion: moving,
      motionDirection: {
        opening: moving && opening,
        closing: moving && closing,
        up: moving && up,
        down: moving && !up,
      },
      tilt: this.reverse ? 100 - tilt : tilt,
      timers: data[7],
    }
  }

  /**
   * Pauses the blind tilt operation.
   * @returns {Promise<void>}
   */
  async pause(): Promise<void> {
    await this.operateBlindTilt([...BLIND_TILT_COMMANDS.PAUSE])
  }

  /**
   * Runs the blind tilt to the specified position.
   * @param {number} percent - The target position percentage (0-100).
   * @param {number} mode - The running mode (0 or 1).
   * @returns {Promise<void>}
   */
  async runToPos(percent: number, mode: number): Promise<void> {
    ValidationUtils.validatePercentage(percent, 'percent')
    ValidationUtils.validateRange(mode, 0, 1, 'mode', true)

    const adjustedPercent = this.reverse ? 100 - percent : percent
    await this.operateBlindTilt([0x57, 0x0F, 0x45, 0x01, 0x05, mode, adjustedPercent])
  }

  /**
   * Sends a command to operate the blind tilt and handles the response.
   * @param {number[]} bytes - The byte array representing the command to be sent to the device.
   * @returns {Promise<void>}
   * @private
   */
  public async operateBlindTilt(bytes: number[]): Promise<void> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    if (resBuf.length !== 3 || resBuf.readUInt8(0) !== 0x01) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}

/**
 * Class representing a WoBulb device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/colorbulb.md
 */
export class WoBulb extends SwitchbotDevice {
  /**
   * Parses the service data for WoBulb.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<colorBulbServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    // eslint-disable-next-line unused-imports/no-unused-vars
    emitLog: (level: string, message: string) => void,
  ): Promise<colorBulbServiceData | null> {
    if (serviceData.length !== 18) {
      // emitLog('debugerror', `[parseServiceDataForWoBulb] Buffer length ${serviceData.length} !== 18!`)
      return null
    }
    if (manufacturerData.length !== 13) {
      // emitLog('debugerror', `[parseServiceDataForWoBulb] Buffer length ${manufacturerData.length} !== 13!`)
      return null
    }

    const [
      , byte1, ,
      byte3,
      byte4,
      byte5,
      byte6,
      byte7,
      byte8,
      byte9,
      byte10,
    ] = manufacturerData

    const data: colorBulbServiceData = {
      model: SwitchBotBLEModel.ColorBulb,
      modelName: SwitchBotBLEModelName.ColorBulb,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ColorBulb,
      power: !!byte1,
      red: byte3,
      green: byte4,
      blue: byte5,
      color_temperature: byte6,
      state: !!(byte7 & 0b01111111),
      brightness: byte7 & 0b01111111,
      delay: (byte8 & 0b10000000) >> 7,
      preset: (byte8 & 0b00001000) >> 3,
      color_mode: byte8 & 0b00000111,
      speed: byte9 & 0b01111111,
      loop_index: byte10 & 0b11111110,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Reads the state of the bulb.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the bulb is ON (true) or OFF (false).
   */
  async readState(): Promise<boolean> {
    return this.operateBulb([...BULB_COMMANDS.READ_STATE])
  }

  /**
   * Sets the state of the bulb.
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   * @private
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    return this.operateBulb([...BULB_COMMANDS.BASE, ...reqByteArray])
  }

  /**
   * Turns on the bulb.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the bulb is ON (true).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([...BULB_COMMANDS.TURN_ON])
  }

  /**
   * Turns off the bulb.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the bulb is OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([...BULB_COMMANDS.TURN_OFF])
  }

  /**
   * Sets the brightness of the bulb.
   * @param {number} brightness - The brightness percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setBrightness(brightness: number): Promise<boolean> {
    ValidationUtils.validatePercentage(brightness, 'brightness')
    return this.setState([...BULB_COMMANDS.SET_BRIGHTNESS, brightness])
  }

  /**
   * Sets the color temperature of the bulb.
   * @param {number} color_temperature - The color temperature percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setColorTemperature(color_temperature: number): Promise<boolean> {
    ValidationUtils.validatePercentage(color_temperature, 'color_temperature')
    return this.setState([...BULB_COMMANDS.SET_COLOR_TEMP, color_temperature])
  }

  /**
   * Sets the RGB color of the bulb.
   * @param {number} brightness - The brightness percentage (0-100).
   * @param {number} red - The red color value (0-255).
   * @param {number} green - The green color value (0-255).
   * @param {number} blue - The blue color value (0-255).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setRGB(brightness: number, red: number, green: number, blue: number): Promise<boolean> {
    ValidationUtils.validatePercentage(brightness, 'brightness')
    ValidationUtils.validateRGB(red, 'red')
    ValidationUtils.validateRGB(green, 'green')
    ValidationUtils.validateRGB(blue, 'blue')
    return this.setState([...BULB_COMMANDS.SET_RGB, brightness, red, green, blue])
  }

  /**
   * Sends a command to the bulb.
   * @param {number[]} bytes - The command bytes.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   * @private
   */
  private async operateBulb(bytes: number[]): Promise<boolean> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    if (resBuf.length === 2) {
      const code = resBuf.readUInt8(1)
      if (code === 0x00 || code === 0x80) {
        return code === 0x80
      }
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
    throw new Error(`Expecting a 2-byte response, got instead: 0x${resBuf.toString('hex')}`)
  }
}

/**
 * Class representing a WoCeilingLight device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/colorbulb.md
 */
export class WoCeilingLight extends SwitchbotDevice {
  /**
   * Parses the service data for WoCeilingLight.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<ceilingLightServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<ceilingLightServiceData | null> {
    if (manufacturerData.length !== 13) {
      emitLog('debugerror', `[parseServiceDataForWoCeilingLight] Buffer length ${manufacturerData.length} !== 13!`)
      return null
    }

    const [
      , byte1, ,
      byte3,
      byte4,
      byte5,
      byte6,
      byte7,
      byte8,
      byte9,
      byte10,
    ] = manufacturerData

    const data: ceilingLightServiceData = {
      model: SwitchBotBLEModel.CeilingLight,
      modelName: SwitchBotBLEModelName.CeilingLight,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLight,
      power: !!byte1,
      red: byte3,
      green: byte4,
      blue: byte5,
      color_temperature: byte6,
      state: !!(byte7 & 0b01111111),
      brightness: byte7 & 0b01111111,
      delay: (byte8 & 0b10000000) ? 1 : 0,
      preset: (byte8 & 0b00001000) ? 1 : 0,
      color_mode: byte8 & 0b00000111,
      speed: byte9 & 0b01111111,
      loop_index: byte10 & 0b11111110,
    }

    return data
  }

  /**
   * Parses the service data for WoCeilingLight Pro.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<ceilingLightProServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData_Pro(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<ceilingLightProServiceData | null> {
    if (manufacturerData.length !== 13) {
      emitLog('debugerror', `[parseServiceDataForWoCeilingLightPro] Buffer length ${manufacturerData.length} !== 13!`)
      return null
    }

    const [
      , byte1, ,
      byte3,
      byte4,
      byte5,
      byte6,
      byte7,
      byte8,
      byte9,
      byte10,
    ] = manufacturerData

    const data: ceilingLightProServiceData = {
      model: SwitchBotBLEModel.CeilingLightPro,
      modelName: SwitchBotBLEModelName.CeilingLightPro,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.CeilingLightPro,
      power: !!byte1,
      red: byte3,
      green: byte4,
      blue: byte5,
      color_temperature: byte6,
      state: !!(byte7 & 0b01111111),
      brightness: byte7 & 0b01111111,
      delay: (byte8 & 0b10000000) ? 1 : 0,
      preset: (byte8 & 0b00001000) ? 1 : 0,
      color_mode: byte8 & 0b00000111,
      speed: byte9 & 0b01111111,
      loop_index: byte10 & 0b11111110,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Reads the state of the ceiling light.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the light is ON (true) or OFF (false).
   */
  async readState(): Promise<boolean> {
    return this.operateCeilingLight([0x57, 0x0F, 0x48, 0x01])
  }

  /**
   * Sets the state of the ceiling light.
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x47, 0x01]
    return this.operateCeilingLight(base.concat(reqByteArray))
  }

  /**
   * Turns on the ceiling light.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the light is ON (true).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x01])
  }

  /**
   * Turns off the ceiling light.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the light is OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x02])
  }

  /**
   * Sets the brightness of the ceiling light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setBrightness(brightness: number): Promise<boolean> {
    if (typeof brightness !== 'number' || brightness < 0 || brightness > 100) {
      throw new TypeError(`Invalid brightness value: ${brightness}`)
    }
    return this.setState([0x02, 0x14, brightness])
  }

  /**
   * Sets the color temperature of the ceiling light.
   * @param {number} color_temperature - The color temperature percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setColorTemperature(color_temperature: number): Promise<boolean> {
    if (typeof color_temperature !== 'number' || color_temperature < 0 || color_temperature > 100) {
      throw new TypeError(`Invalid color temperature value: ${color_temperature}`)
    }
    return this.setState([0x02, 0x17, color_temperature])
  }

  /**
   * Sets the RGB color of the ceiling light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @param {number} red - The red color value (0-255).
   * @param {number} green - The green color value (0-255).
   * @param {number} blue - The blue color value (0-255).
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  async setRGB(brightness: number, red: number, green: number, blue: number): Promise<boolean> {
    if (
      typeof brightness !== 'number' || brightness < 0 || brightness > 100
      || typeof red !== 'number' || red < 0 || red > 255
      || typeof green !== 'number' || green < 0 || green > 255
      || typeof blue !== 'number' || blue < 0 || blue > 255
    ) {
      throw new TypeError('Invalid RGB or brightness values')
    }
    return this.setState([0x02, 0x12, brightness, red, green, blue])
  }

  /**
   * Sends a command to the ceiling light.
   * @param {number[]} bytes - The command bytes.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   */
  public async operateCeilingLight(bytes: number[]): Promise<boolean> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    if (resBuf.length === 2) {
      const code = resBuf.readUInt8(1)
      if (code === 0x00 || code === 0x80) {
        return code === 0x80
      }
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
    throw new Error(`Expecting a 2-byte response, got instead: 0x${resBuf.toString('hex')}`)
  }
}

/**
 * Class representing a WoContact device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/contactsensor.md
 */
export class WoContact extends SwitchbotDevice {
  /**
   * Parses the service data for WoContact.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<contactSensorServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<contactSensorServiceData | null> {
    if (serviceData.length !== 9) {
      emitLog('debugerror', `[parseServiceDataForWoContact] Buffer length ${serviceData.length} !== 9!`)
      return null
    }

    const [byte1, byte2, byte3, , , , , , byte8] = serviceData

    const hallState = (byte3 >> 1) & 0b00000011
    const tested = Boolean(byte1 & 0b10000000)
    const movement = Boolean(byte1 & 0b01000000)
    const battery = byte2 & 0b01111111
    const contact_open = Boolean(byte3 & 0b00000010)
    const contact_timeout = Boolean(byte3 & 0b00000100)
    const lightLevel = byte3 & 0b00000001 ? 'bright' : 'dark'
    const button_count = byte8 & 0b00001111
    const doorState = hallState === 0 ? 'close' : hallState === 1 ? 'open' : 'timeout no closed'

    const data: contactSensorServiceData = {
      model: SwitchBotBLEModel.ContactSensor,
      modelName: SwitchBotBLEModelName.ContactSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.ContactSensor,
      movement,
      tested,
      battery,
      contact_open,
      contact_timeout,
      lightLevel,
      button_count,
      doorState,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoCurtain device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/curtain.md
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/curtain3.md
 */
export class WoCurtain extends SwitchbotDevice {
  /**
   * Parses the service data for WoCurtain.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @param {boolean} [reverse] - Whether to reverse the position.
   * @returns {Promise<curtainServiceData | curtain3ServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
    reverse: boolean = false,
  ): Promise<curtainServiceData | curtain3ServiceData | null> {
    if (![5, 6].includes(serviceData.length)) {
      emitLog('debugerror', `[parseServiceDataForWoCurtain] Buffer length ${serviceData.length} !== 5 or 6!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte2 = serviceData.readUInt8(2)

    let deviceData: Buffer
    let batteryData: number | null = null

    if (manufacturerData.length >= 13) {
      deviceData = manufacturerData.subarray(8, 11)
      batteryData = manufacturerData.readUInt8(12)
    } else if (manufacturerData.length >= 11) {
      deviceData = manufacturerData.subarray(8, 11)
      batteryData = byte2
    } else {
      deviceData = serviceData.subarray(3, 6)
      batteryData = byte2
    }

    const model = serviceData.subarray(0, 1).toString('utf8') as string ? SwitchBotBLEModel.Curtain : SwitchBotBLEModel.Curtain3
    const calibration = Boolean(byte1 & 0b01000000)

    if (model === SwitchBotBLEModel.Curtain) {
      const byte3 = serviceData.readUInt8(3)
      const byte4 = serviceData.readUInt8(4)

      const position = byte3 & 0b01111111
      const inMotion = Boolean(byte3 & 0b10000000)
      const lightLevel = (byte4 >> 4) & 0b00001111
      const deviceChain = byte4 & 0b00000111
      const battery = byte2 & 0b01111111

      const data: curtainServiceData = {
        model: SwitchBotBLEModel.Curtain,
        modelName: SwitchBotBLEModelName.Curtain,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain,
        calibration,
        battery: battery ?? 0,
        inMotion,
        position: reverse ? 100 - position : position,
        lightLevel,
        deviceChain,
      }
      return data
    } else {
      const position = Math.max(Math.min(deviceData.readUInt8(0) & 0b01111111, 100), 0)
      const inMotion = Boolean(deviceData.readUInt8(0) & 0b10000000)
      const lightLevel = (deviceData.readUInt8(1) >> 4) & 0b00001111
      const deviceChain = deviceData.readUInt8(1) & 0b00000111
      const battery = batteryData !== null ? batteryData & 0b01111111 : 0

      const data: curtain3ServiceData = {
        model: SwitchBotBLEModel.Curtain3,
        modelName: SwitchBotBLEModelName.Curtain3,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Curtain3,
        calibration,
        battery,
        inMotion,
        position: reverse ? 100 - position : position,
        lightLevel,
        deviceChain,
      }
      return data
    }
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Opens the curtain.
   * @param {number} [mode] - Running mode (0x01 = QuietDrift, 0xFF = Default).
   * @returns {Promise<void>}
   */
  async open(mode: number = 0xFF): Promise<void> {
    await this.runToPos(0, mode)
  }

  /**
   * Closes the curtain.
   * @param {number} [mode] - Running mode (0x01 = QuietDrift, 0xFF = Default).
   * @returns {Promise<void>}
   */
  async close(mode: number = 0xFF): Promise<void> {
    await this.runToPos(100, mode)
  }

  /**
   * Pauses the curtain.
   * @returns {Promise<void>}
   */
  async pause(): Promise<void> {
    await this.operateCurtain([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
  }

  /**
   * Runs the curtain to the target position.
   * @param {number} percent - The percentage of the target position.
   * @param {number} [mode] - Running mode (0x01 = QuietDrift, 0xFF = Default).
   * @returns {Promise<void>}
   */
  async runToPos(percent: number, mode: number = 0xFF): Promise<void> {
    if (typeof percent !== 'number' || typeof mode !== 'number') {
      throw new TypeError('Invalid type for percent or mode')
    }
    percent = Math.max(0, Math.min(100, percent))
    await this.operateCurtain([0x57, 0x0F, 0x45, 0x01, 0x05, mode, percent])
  }

  /**
   * Sends a command to the curtain.
   * @param {number[]} bytes - The command bytes.
   * @returns {Promise<void>}
   */
  public async operateCurtain(bytes: number[]): Promise<void> {
    const reqBuf = Buffer.from(bytes)
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || code !== 0x01) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}

/**
 * Class representing a WoHand device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/bot.md
 */
export class WoHand extends SwitchbotDevice {
  /**
   * Parses the service data for WoHand.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<botServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<botServiceData | null> {
    if (!serviceData || serviceData.length < 3) {
      emitLog('debugerror', `[parseServiceData] Service Data Buffer length ${serviceData?.length ?? 0} < 3!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte2 = serviceData.readUInt8(2)

    const data: botServiceData = {
      model: SwitchBotBLEModel.Bot,
      modelName: SwitchBotBLEModelName.Bot,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Bot,
      mode: !!(byte1 & 0b10000000), // Whether the light switch Add-on is used or not. 0 = press, 1 = switch
      state: !!(byte1 & 0b01000000), // Whether the switch status is ON or OFF. 0 = on, 1 = off
      battery: byte2 & 0b01111111, // %
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Sends a command to the bot.
   * @param {Buffer} reqBuf - The command buffer.
   * @returns {Promise<void>}
   */
  protected async sendCommand(reqBuf: Buffer): Promise<void> {
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Presses the bot.
   * @returns {Promise<void>}
   */
  public async press(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x00]))
  }

  /**
   * Turns on the bot.
   * @returns {Promise<void>}
   */
  public async turnOn(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x01]))
  }

  /**
   * Turns off the bot.
   * @returns {Promise<void>}
   */
  public async turnOff(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x02]))
  }

  /**
   * Moves the bot down.
   * @returns {Promise<void>}
   */
  public async down(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x03]))
  }

  /**
   * Moves the bot up.
   * @returns {Promise<void>}
   */
  public async up(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x04]))
  }
}

/**
 * Class representing a WoHub2 device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoHub2 extends SwitchbotDevice {
  /**
   * Parses the service data for WoHub2.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<hub2ServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<hub2ServiceData | null> {
    if (manufacturerData.length !== 16) {
      emitLog('debugerror', `[parseServiceDataForWoHub2] Buffer length ${manufacturerData.length} !== 16!`)
      return null
    }

    const [byte0, byte1, byte2, , , , , , , , , , byte12] = manufacturerData

    const tempSign = byte1 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte1 & 0b01111111) + (byte0 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10
    const lightLevel = byte12 & 0b11111

    const data: hub2ServiceData = {
      model: SwitchBotBLEModel.Hub2,
      modelName: SwitchBotBLEModelName.Hub2,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub2,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte2 & 0b10000000),
      humidity: byte2 & 0b01111111,
      lightLevel,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoHub3 device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoHub3 extends SwitchbotDevice {
  /**
   * Parses the service data for WoHub3.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<hub3ServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<hub3ServiceData | null> {
    if (manufacturerData.length !== 16) {
      emitLog('debugerror', `[parseServiceDataForWoHub3] Buffer length ${manufacturerData.length} !== 16!`)
      return null
    }

    const [byte0, byte1, byte2, , , , , , , , , , byte12] = manufacturerData

    const tempSign = byte1 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte1 & 0b01111111) + (byte0 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10
    const lightLevel = byte12 & 0b11111

    const data: hub3ServiceData = {
      model: SwitchBotBLEModel.Hub3,
      modelName: SwitchBotBLEModelName.Hub3,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Hub3,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte2 & 0b10000000),
      humidity: byte2 & 0b01111111,
      lightLevel,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoHumi device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/tree/latest/devicetypes
 */
export class WoHumi extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoHumi.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<humidifierServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<humidifierServiceData | null> {
    if (serviceData.length !== 8) {
      emitLog('debugerror', `[parseServiceDataForWoHumi] Buffer length ${serviceData.length} !== 8!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte4 = serviceData.readUInt8(4)

    const onState = !!(byte1 & 0b10000000) // 1 - on
    const autoMode = !!(byte4 & 0b10000000) // 1 - auto
    const percentage = byte4 & 0b01111111 // 0-100%, 101/102/103 - Quick gear 1/2/3
    const humidity = autoMode ? 0 : percentage === 101 ? 33 : percentage === 102 ? 66 : percentage === 103 ? 100 : percentage

    const data: humidifierServiceData = {
      model: SwitchBotBLEModel.Humidifier,
      modelName: SwitchBotBLEModelName.Humidifier,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier,
      onState,
      autoMode,
      percentage: autoMode ? 0 : percentage,
      humidity,
    }

    return data
  }

  /**
   * Sends a command to the humidifier.
   * @param {Buffer} reqBuf - The command buffer.
   * @returns {Promise<void>}
   */
  protected async operateHumi(reqBuf: Buffer): Promise<void> {
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Turns on the humidifier.
   * @returns {Promise<void>}
   */
  public async turnOn(): Promise<void> {
    await this.operateHumi(Buffer.from(TURN_ON_KEY, 'hex'))
  }

  /**
   * Turns off the humidifier.
   * @returns {Promise<void>}
   */
  public async turnOff(): Promise<void> {
    await this.operateHumi(Buffer.from(TURN_OFF_KEY, 'hex'))
  }

  /**
   * Increases the humidifier setting.
   * @returns {Promise<void>}
   */
  public async increase(): Promise<void> {
    await this.operateHumi(Buffer.from(INCREASE_KEY, 'hex'))
  }

  /**
   * Decreases the humidifier setting.
   * @returns {Promise<void>}
   */
  public async decrease(): Promise<void> {
    await this.operateHumi(Buffer.from(DECREASE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier to auto mode.
   * @returns {Promise<void>}
   */
  public async setAutoMode(): Promise<void> {
    await this.operateHumi(Buffer.from(SET_AUTO_MODE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier to manual mode.
   * @returns {Promise<void>}
   */
  public async setManualMode(): Promise<void> {
    await this.operateHumi(Buffer.from(SET_MANUAL_MODE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier level.
   * @param {number} level - The level to set (0-100).
   * @returns {Promise<void>}
   */
  public async percentage(level: number): Promise<void> {
    if (level < 0 || level > 100) {
      throw new Error('Level must be between 0 and 100')
    }
    const levelKey = `${HUMIDIFIER_COMMAND_HEADER}0107${level.toString(16).padStart(2, '0')}`
    await this.operateHumi(Buffer.from(levelKey, 'hex'))
  }
}

/**
 * Class representing a WoHumi device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/tree/latest/devicetypes
 */
export class WoHumi2 extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoHumi.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<humidifier2ServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<humidifier2ServiceData | null> {
    if (serviceData.length !== 8) {
      emitLog('debugerror', `[parseServiceDataForWoHumi] Buffer length ${serviceData.length} !== 8!`)
      return null
    }

    const byte1 = serviceData.readUInt8(1)
    const byte4 = serviceData.readUInt8(4)
    const byte8 = serviceData.readUInt8(8)
    const byte10 = serviceData.readUInt8(10)
    const byte11 = serviceData.readUInt8(11)
    const byte12 = serviceData.readUInt8(12)

    const onState = !!(byte1 & 0b10000000) // 1 - on
    const autoMode = !!(byte4 & 0b10000000) // 1 - auto
    const percentage = byte4 & 0b01111111 // 0-100%, 101/102/103 - Quick gear 1/2/3
    const humidity = autoMode ? 0 : percentage === 101 ? 33 : percentage === 102 ? 66 : percentage === 103 ? 100 : percentage
    const childLock = !!(byte8 & 0b00100000)
    const overHumidifyProtection = !!(byte8 & 0b10000000)
    const tankRemoved = !!(byte8 & 0b00000100)
    const tiltedAlert = !!(byte8 & 0b00000010)
    const filterMissing = !!(byte8 & 0b00000001)
    const temperature = (byte10 & 0b01111111) + (byte11 >> 4) / 10
    const filterRunTime = byte12
    const filterAlert = filterRunTime >= 240
    const waterLevel = byte11 & 0b00000011

    const data: humidifier2ServiceData = {
      model: SwitchBotBLEModel.Humidifier2,
      modelName: SwitchBotBLEModelName.Humidifier2,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier2,
      onState,
      autoMode,
      percentage: autoMode ? 0 : percentage,
      humidity,
      childLock,
      overHumidifyProtection,
      tankRemoved,
      tiltedAlert,
      filterMissing,
      temperature,
      filterRunTime,
      filterAlert,
      waterLevel,
    }

    return data
  }

  /**
   * Sends a command to the humidifier.
   * @param {Buffer} reqBuf - The command buffer.
   * @returns {Promise<void>}
   */
  protected async operateHumi(reqBuf: Buffer): Promise<void> {
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Turns on the humidifier.
   * @returns {Promise<void>}
   */
  public async turnOn(): Promise<void> {
    await this.operateHumi(Buffer.from(TURN_ON_KEY, 'hex'))
  }

  /**
   * Turns off the humidifier.
   * @returns {Promise<void>}
   */
  public async turnOff(): Promise<void> {
    await this.operateHumi(Buffer.from(TURN_OFF_KEY, 'hex'))
  }

  /**
   * Increases the humidifier setting.
   * @returns {Promise<void>}
   */
  public async increase(): Promise<void> {
    await this.operateHumi(Buffer.from(INCREASE_KEY, 'hex'))
  }

  /**
   * Decreases the humidifier setting.
   * @returns {Promise<void>}
   */
  public async decrease(): Promise<void> {
    await this.operateHumi(Buffer.from(DECREASE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier to auto mode.
   * @returns {Promise<void>}
   */
  public async setAutoMode(): Promise<void> {
    await this.operateHumi(Buffer.from(SET_AUTO_MODE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier to manual mode.
   * @returns {Promise<void>}
   */
  public async setManualMode(): Promise<void> {
    await this.operateHumi(Buffer.from(SET_MANUAL_MODE_KEY, 'hex'))
  }

  /**
   * Sets the humidifier level.
   * @param {number} level - The level to set (0-100).
   * @returns {Promise<void>}
   */
  public async percentage(level: number): Promise<void> {
    if (level < 0 || level > 100) {
      throw new Error('Level must be between 0 and 100')
    }
    const levelKey = `${HUMIDIFIER_COMMAND_HEADER}0107${level.toString(16).padStart(2, '0')}`
    await this.operateHumi(Buffer.from(levelKey, 'hex'))
  }
}

/**
 * Class representing a WoIOSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md#outdoor-temperaturehumidity-sensor
 */
export class WoIOSensorTH extends SwitchbotDevice {
  /**
   * Parses the service data for WoIOSensorTH.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<outdoorMeterServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<outdoorMeterServiceData | null> {
    if (serviceData.length !== 3) {
      emitLog('debugerror', `[parseServiceDataForWoIOSensorTH] Service Data Buffer length ${serviceData.length} !== 3!`)
      return null
    }
    if (manufacturerData.length !== 14) {
      emitLog('debugerror', `[parseServiceDataForWoIOSensorTH] Manufacturer Data Buffer length ${manufacturerData.length} !== 14!`)
      return null
    }

    const [mdByte10, mdByte11, mdByte12] = [
      manufacturerData.readUInt8(10),
      manufacturerData.readUInt8(11),
      manufacturerData.readUInt8(12),
    ]
    const sdByte2 = serviceData.readUInt8(2)

    const tempSign = mdByte11 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((mdByte11 & 0b01111111) + (mdByte10 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

    const data: outdoorMeterServiceData = {
      model: SwitchBotBLEModel.OutdoorMeter,
      modelName: SwitchBotBLEModelName.OutdoorMeter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.OutdoorMeter,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(mdByte12 & 0b10000000),
      humidity: mdByte12 & 0b01111111,
      battery: sdByte2 & 0b01111111,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoKeypad device.
 */
export class WoKeypad extends SwitchbotDevice {
  /**
   * Parses the service data for WoKeypad.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<keypadDetectorServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<keypadDetectorServiceData | null> {
    if (!serviceData || serviceData.length < 3) {
      emitLog('debugerror', `[parseServiceDataForWoKeypad] Service Data Buffer length ${serviceData?.length ?? 0} < 3!`)
      return null
    }

    if (!manufacturerData || manufacturerData.length < 2) {
      emitLog('debugerror', `[parseServiceDataForWoKeypad] Manufacturer Data Buffer length ${manufacturerData?.length ?? 0} < 2!`)
      return null
    }

    const modelId = serviceData.readUInt8(0)

    if (modelId !== 0x26) {
      // Not a Keypad
      emitLog('debugerror', `[parseServiceDataForWoKeypad] Model ID ${modelId} !== 0x26!`)
      return null
    }

    const eventFlags = serviceData.readUInt8(1)
    const keypadEventDetected = !!(eventFlags & 0b00000001) // Bit 0
    const deviceTampered = !!(eventFlags & 0b00000010) // Bit 1

    const batteryInfo = serviceData.readUInt8(2)
    const batteryLevel = batteryInfo & 0b01111111 // Bits 0-6
    const lowBattery = !!(batteryInfo & 0b10000000) // Bit 7

    // Manufacturer data can be processed here if needed

    const data = {
      model: SwitchBotBLEModel.Keypad,
      modelName: SwitchBotBLEModelName.Keypad,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Keypad,
      event: keypadEventDetected,
      tampered: deviceTampered,
      battery: batteryLevel,
      low_battery: lowBattery,
    }

    return data as keypadDetectorServiceData
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoLeak device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md#outdoor-temperaturehumidity-sensor
 */
export class WoLeak extends SwitchbotDevice {
  /**
   * Parses the service data for WoLeak.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<waterLeakDetectorServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<waterLeakDetectorServiceData | null> {
    if (!serviceData || serviceData.length < 3) {
      emitLog('debugerror', `[parseServiceDataForWoLeakDetector] Service Data Buffer length ${serviceData?.length ?? 0} < 3!`)
      return null
    }

    if (!manufacturerData || manufacturerData.length < 2) {
      emitLog('debugerror', `[parseServiceDataForWoLeakDetector] Manufacturer Data Buffer length ${manufacturerData?.length ?? 0} < 2!`)
      return null
    }

    const waterLeakDetected = manufacturerData.length > 8 && !!(manufacturerData.readUInt8(8) & 0b00000001) // Bit 0
    const deviceTampered = !!(manufacturerData.readUInt8(8) & 0b00000010) // Bit 1
    const batteryLevel = manufacturerData.readUInt8(7) & 0b01111111 // Bits 0-6
    const lowBattery = !!(manufacturerData.readUInt8(7) & 0b10000000) // Bit 7

    // Manufacturer data can be processed here if needed

    const data = {
      model: SwitchBotBLEModel.Leak,
      modelName: SwitchBotBLEModelName.Leak,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Leak,
      leak: waterLeakDetected,
      tampered: deviceTampered,
      battery: batteryLevel,
      low_battery: lowBattery,
    }

    return data as waterLeakDetectorServiceData
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoPlugMini device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/plugmini.md
 */
export class WoPlugMiniJP extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoPlugMini JP.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<plugMiniJPServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<plugMiniJPServiceData | null> {
    if (manufacturerData.length !== 14) {
      emitLog('debugerror', `[parseServiceDataForWoPlugMiniJP] Buffer length ${manufacturerData.length} should be 14`)
      return null
    }

    const [byte9, byte10, byte11, byte12, byte13] = [
      manufacturerData.readUInt8(9),
      manufacturerData.readUInt8(10),
      manufacturerData.readUInt8(11),
      manufacturerData.readUInt8(12),
      manufacturerData.readUInt8(13),
    ]

    const state = byte9 === 0x00 ? 'off' : byte9 === 0x80 ? 'on' : null
    const delay = !!(byte10 & 0b00000001)
    const timer = !!(byte10 & 0b00000010)
    const syncUtcTime = !!(byte10 & 0b00000100)
    const wifiRssi = byte11
    const overload = !!(byte12 & 0b10000000)
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10 // in watt

    const data = {
      model: SwitchBotBLEModel.PlugMiniJP,
      modelName: SwitchBotBLEModelName.PlugMini,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini,
      state: state ?? 'unknown',
      delay,
      timer,
      syncUtcTime,
      wifiRssi,
      overload,
      currentPower,
    }

    return data as plugMiniJPServiceData
  }

  /**
   * Reads the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async readState(): Promise<boolean> {
    return this.operatePlug([0x57, 0x0F, 0x51, 0x01])
  }

  /**
   * Sets the state of the plug.
   * @private
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x50, 0x01]
    return this.operatePlug([...base, ...reqByteArray])
  }

  /**
   * Turns on the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x80])
  }

  /**
   * Turns off the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x00])
  }

  /**
   * Toggles the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async toggle(): Promise<boolean> {
    return this.setState([0x02, 0x80])
  }

  /**
   * Operates the plug with the given bytes.
   * @param {number[]} bytes - The byte array to send to the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async operatePlug(bytes: number[]): Promise<boolean> {
    const reqBuf = Buffer.from(bytes)
    const resBytes = await this.command(reqBuf)
    const resBuf = Buffer.from(resBytes)

    if (resBuf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${resBuf.toString('hex')}`)
    }

    const code = resBuf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}

/**
 * Class representing a WoPlugMini EU device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/plugmini.md
 */
export class WoPlugMiniEU extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoPlugMini EU.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<plugMiniEUServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<plugMiniEUServiceData | null> {
    if (manufacturerData.length !== 14) {
      emitLog('debugerror', `[parseServiceDataForWoPlugMiniEU] Buffer length ${manufacturerData.length} should be 14`)
      return null
    }

    const [byte9, byte10, byte11, byte12, byte13] = [
      manufacturerData.readUInt8(9),
      manufacturerData.readUInt8(10),
      manufacturerData.readUInt8(11),
      manufacturerData.readUInt8(12),
      manufacturerData.readUInt8(13),
    ]

    const state = byte9 === 0x00 ? 'off' : byte9 === 0x80 ? 'on' : null
    const delay = !!(byte10 & 0b00000001)
    const timer = !!(byte10 & 0b00000010)
    const syncUtcTime = !!(byte10 & 0b00000100)
    const wifiRssi = byte11
    const overload = !!(byte12 & 0b10000000)
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10 // in watt

    const data = {
      model: SwitchBotBLEModel.PlugMiniEU,
      modelName: SwitchBotBLEModelName.PlugMini,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini,
      state: state ?? 'unknown',
      delay,
      timer,
      syncUtcTime,
      wifiRssi,
      overload,
      currentPower,
    }

    return data as plugMiniEUServiceData
  }

  /**
   * Reads the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async readState(): Promise<boolean> {
    return this.operatePlug([0x57, 0x0F, 0x51, 0x01])
  }

  /**
   * Sets the state of the plug.
   * @private
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x50, 0x01]
    return this.operatePlug([...base, ...reqByteArray])
  }

  /**
   * Turns on the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x80])
  }

  /**
   * Turns off the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x00])
  }

  /**
   * Toggles the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async toggle(): Promise<boolean> {
    return this.setState([0x02, 0x80])
  }

  /**
   * Operates the plug with the given bytes.
   * @param {number[]} bytes - The byte array to send to the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async operatePlug(bytes: number[]): Promise<boolean> {
    const reqBuf = Buffer.from(bytes)
    const resBytes = await this.command(reqBuf)
    const resBuf = Buffer.from(resBytes)

    if (resBuf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${resBuf.toString('hex')}`)
    }

    const code = resBuf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}

/**
 * Class representing a WoPlugMini device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/plugmini.md
 */
export class WoPlugMiniUS extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoPlugMini US.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<plugMiniUSServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<plugMiniUSServiceData | null> {
    if (manufacturerData.length !== 14) {
      emitLog('debugerror', `[parseServiceDataForWoPlugMini] Buffer length ${manufacturerData.length} should be 14`)
      return null
    }

    const [byte9, byte10, byte11, byte12, byte13] = [
      manufacturerData.readUInt8(9),
      manufacturerData.readUInt8(10),
      manufacturerData.readUInt8(11),
      manufacturerData.readUInt8(12),
      manufacturerData.readUInt8(13),
    ]

    const state = byte9 === 0x00 ? 'off' : byte9 === 0x80 ? 'on' : null
    const delay = !!(byte10 & 0b00000001)
    const timer = !!(byte10 & 0b00000010)
    const syncUtcTime = !!(byte10 & 0b00000100)
    const wifiRssi = byte11
    const overload = !!(byte12 & 0b10000000)
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10 // in watt

    const data = {
      model: SwitchBotBLEModel.PlugMiniUS,
      modelName: SwitchBotBLEModelName.PlugMini,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.PlugMini,
      state: state ?? 'unknown',
      delay,
      timer,
      syncUtcTime,
      wifiRssi,
      overload,
      currentPower,
    }

    return data as plugMiniUSServiceData
  }

  /**
   * Reads the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async readState(): Promise<boolean> {
    return this.operatePlug([0x57, 0x0F, 0x51, 0x01])
  }

  /**
   * Sets the state of the plug.
   * @private
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  private async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x50, 0x01]
    return this.operatePlug([...base, ...reqByteArray])
  }

  /**
   * Turns on the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x80])
  }

  /**
   * Turns off the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x00])
  }

  /**
   * Toggles the state of the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  async toggle(): Promise<boolean> {
    return this.setState([0x02, 0x80])
  }

  /**
   * Operates the plug with the given bytes.
   * @param {number[]} bytes - The byte array to send to the plug.
   * @returns {Promise<boolean>} - Resolves with a boolean that tells whether the plug is ON (true) or OFF (false).
   */
  public async operatePlug(bytes: number[]): Promise<boolean> {
    const reqBuf = Buffer.from(bytes)
    const resBytes = await this.command(reqBuf)
    const resBuf = Buffer.from(resBytes)

    if (resBuf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${resBuf.toString('hex')}`)
    }

    const code = resBuf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }
}

const PRESENCE_SENSOR_BATTERY_RANGE_MAP = ['<10%', '10-19%', '20-59%', '>=60%'] as const

/**
 * Class representing a WoPresence device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoPresence extends SwitchbotDevice {
  /**
   * Parses the service data for WoPresence.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<motionSensorServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<motionSensorServiceData | null> {
    if (serviceData.length !== 6) {
      emitLog('debugerror', `[parseServiceDataForWoPresence] Buffer length ${serviceData.length} !== 6!`)
      return null
    }

    const [byte1, byte2, , , , byte5] = serviceData

    const data: motionSensorServiceData = {
      model: SwitchBotBLEModel.MotionSensor,
      modelName: SwitchBotBLEModelName.MotionSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor,
      tested: !!(byte1 & 0b10000000),
      movement: !!(byte1 & 0b01000000),
      battery: byte2 & 0b01111111,
      led: (byte5 & 0b00100000) >> 5,
      iot: (byte5 & 0b00010000) >> 4,
      sense_distance: (byte5 & 0b00001100) >> 2,
      lightLevel: (byte5 & 0b00000011) === 1 ? 'dark' : (byte5 & 0b00000011) === 2 ? 'bright' : 'unknown',
      is_light: !!(byte5 & 0b00000010),
    }

    return data
  }

  /**
   * Parses the manufacturer data for presence sensors.
   * @param {Buffer | null} serviceData - The optional service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<presenceSensorServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parsePresenceSensorServiceData(
    serviceData: Buffer | null,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<presenceSensorServiceData | null> {
    if (!manufacturerData || manufacturerData.length < 12) {
      emitLog('debugerror', `[parsePresenceSensorServiceData] Manufacturer buffer length ${manufacturerData?.length ?? 0} < 12!`)
      return null
    }

    const statusByte = manufacturerData[7]
    const batteryBits = (statusByte >> 2) & 0b11

    const data: presenceSensorServiceData = {
      model: SwitchBotBLEModel.PresenceSensor,
      modelName: SwitchBotBLEModelName.PresenceSensor,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.PresenceSensor,
      sequenceNumber: manufacturerData[6],
      adaptiveState: !!(statusByte & 0b10000000),
      motionDetected: !!(statusByte & 0b01000000),
      batteryRange: PRESENCE_SENSOR_BATTERY_RANGE_MAP[batteryBits] ?? 'Unknown',
      triggerFlag: manufacturerData[10],
      ledState: !!(manufacturerData[11] & 0b10000000),
      lightLevel: manufacturerData[11] & 0x0F,
    }

    if (serviceData && serviceData.length >= 3) {
      data.battery = serviceData[2] & 0x7F
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoRelaySwitch1 device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/
 */
export class WoRelaySwitch1 extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoRelaySwitch1.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<relaySwitch1ServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<relaySwitch1ServiceData | null> {
    if (serviceData.length < 8 || manufacturerData.length === null) {
      emitLog('debugerror', `[parseServiceDataForWoRelaySwitch1Plus] Buffer length ${serviceData.length} < 8!`)
      return null
    }

    const data: relaySwitch1ServiceData = {
      model: SwitchBotBLEModel.RelaySwitch1,
      modelName: SwitchBotBLEModelName.RelaySwitch1,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1,
      mode: true, // for compatibility, useless
      state: !!(manufacturerData[7] & 0b10000000),
      sequence_number: manufacturerData[6],
    }

    return data
  }

  /**
   * Sends a command to the bot.
   * @param {Buffer} reqBuf - The command buffer.
   * @returns {Promise<void>}
   */
  protected async sendCommand(reqBuf: Buffer): Promise<void> {
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Turns on the bot.
   * @returns {Promise<void>}
   */
  public async turnOn(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x01]))
  }

  /**
   * Turns off the bot.
   * @returns {Promise<void>}
   */
  public async turnOff(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x02]))
  }
}

/**
 * Class representing a WoRelaySwitch1PM device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/
 */
export class WoRelaySwitch1PM extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Parses the service data for WoRelaySwitch1PM.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<relaySwitch1PMServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<relaySwitch1PMServiceData | null> {
    if (serviceData.length < 8 || manufacturerData.length === 0) {
      emitLog('debugerror', `[parseServiceDataForWoRelaySwitch1PM] Buffer length ${serviceData.length} < 8!`)
      return null
    }

    const data: relaySwitch1PMServiceData = {
      model: SwitchBotBLEModel.RelaySwitch1PM,
      modelName: SwitchBotBLEModelName.RelaySwitch1PM,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.RelaySwitch1PM,
      mode: true, // for compatibility, useless
      state: !!(manufacturerData[7] & 0b10000000),
      sequence_number: manufacturerData[6],
      power: ((manufacturerData[10] << 8) + manufacturerData[11]) / 10,
      voltage: 0,
      current: 0,
    }

    return data
  }

  /**
   * Sends a command to the bot.
   * @param {Buffer} reqBuf - The command buffer.
   * @returns {Promise<void>}
   */
  protected async sendCommand(reqBuf: Buffer): Promise<void> {
    const resBuf = await this.command(reqBuf)
    const code = resBuf.readUInt8(0)

    if (resBuf.length !== 3 || (code !== 0x01 && code !== 0x05)) {
      throw new Error(`The device returned an error: 0x${resBuf.toString('hex')}`)
    }
  }

  /**
   * Turns on the bot.
   * @returns {Promise<void>}
   */
  public async turnOn(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x01]))
  }

  /**
   * Turns off the bot.
   * @returns {Promise<void>}
   */
  public async turnOff(): Promise<void> {
    await this.sendCommand(Buffer.from([0x57, 0x01, 0x02]))
  }
}

/**
 * Class representing a WoRemote device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/
 */
export class WoRemote extends SwitchbotDevice {
  /**
   * Parses the service data for WoRemote.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<remoteServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<remoteServiceData | null> {
    if (serviceData.length !== 9) {
      emitLog('debugerror', `[parseServiceDataForWoRemote] Buffer length ${serviceData.length} !== 9!`)
      return null
    }

    const [byte2] = serviceData

    const battery = byte2 & 0b01111111

    const data: remoteServiceData = {
      model: SwitchBotBLEModel.Remote,
      modelName: SwitchBotBLEModelName.Remote,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Remote,
      battery,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }
}

/**
 * Class representing a WoSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoSensorTH extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<meterServiceData | null> {
    if (serviceData.length !== 6) {
      emitLog('debugerror', `[parseServiceData] Buffer length ${serviceData.length} !== 6!`)
      return null
    }

    const [byte2, byte3, byte4, byte5] = [
      serviceData.readUInt8(2),
      serviceData.readUInt8(3),
      serviceData.readUInt8(4),
      serviceData.readUInt8(5),
    ]
    const tempSign = byte4 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

    const data = {
      model: SwitchBotBLEModel.Meter,
      modelName: SwitchBotBLEModelName.Meter,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Meter,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }
    return data as meterServiceData
  }
}

/**
 * Class representing a WoSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoSensorTHPlus extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<meterPlusServiceData | null> {
    if (serviceData.length !== 6) {
      emitLog('debugerror', `[parseServiceData] Buffer length ${serviceData.length} !== 6 or 7!`)
      return null
    }

    const [byte2, byte3, byte4, byte5] = [
      serviceData.readUInt8(2),
      serviceData.readUInt8(3),
      serviceData.readUInt8(4),
      serviceData.readUInt8(5),
    ]
    const tempSign = byte4 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

    const data = {
      model: SwitchBotBLEModel.MeterPlus,
      modelName: SwitchBotBLEModelName.MeterPlus,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPlus,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }
    return data as meterPlusServiceData
  }
}
/**
 * Class representing a WoSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoSensorTHPro extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<meterProServiceData | null> {
    if (serviceData.length !== 6) {
      emitLog('debugerror', `[parseServiceData] Buffer length ${serviceData.length} !== 6 or 7!`)
      return null
    }

    const [byte2, byte3, byte4, byte5] = [
      serviceData.readUInt8(2),
      serviceData.readUInt8(3),
      serviceData.readUInt8(4),
      serviceData.readUInt8(5),
    ]
    const tempSign = byte4 & 0b10000000 ? 1 : -1
    const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
    const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

    const data = {
      model: SwitchBotBLEModel.MeterPro,
      modelName: SwitchBotBLEModelName.MeterPro,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterPro,
      celsius: tempC,
      fahrenheit: tempF,
      fahrenheit_mode: !!(byte5 & 0b10000000),
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    }
    return data as meterProServiceData
  }
}

/**
 * Class representing a WoSensorTH device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/meter.md
 */
export class WoSensorTHProCO2 extends SwitchbotDevice {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<meterProCO2ServiceData | null> {
    if (serviceData.length !== 7 && serviceData.length !== 3) {
      emitLog('debugerror', `[parseServiceData] Buffer length ${serviceData.length} !== 3 or 7!`)
      return null
    }

    if (serviceData.length === 7) {
      const [byte2, byte3, byte4, byte5, byte6] = [
        serviceData.readUInt8(2),
        serviceData.readUInt8(3),
        serviceData.readUInt8(4),
        serviceData.readUInt8(5),
        manufacturerData.readUInt16BE(6),
      ]
      const tempSign = byte4 & 0b10000000 ? 1 : -1
      const tempC = tempSign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10)
      const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

      return {
        model: SwitchBotBLEModel.MeterProCO2,
        modelName: SwitchBotBLEModelName.MeterProCO2,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterProCO2,
        celsius: tempC,
        fahrenheit: tempF,
        fahrenheit_mode: !!(byte5 & 0b10000000),
        humidity: byte5 & 0b01111111,
        battery: byte2 & 0b01111111,
        co2: byte6,
      } as meterProCO2ServiceData
    } else {
      const [mdByte10, mdByte11, mdByte12] = [
        manufacturerData.readUInt8(10),
        manufacturerData.readUInt8(11),
        manufacturerData.readUInt8(12),
      ]
      const sdByte2 = serviceData.readUInt8(2)

      const tempSign = mdByte11 & 0b10000000 ? 1 : -1
      const tempC = tempSign * ((mdByte11 & 0b01111111) + (mdByte10 & 0b00001111) / 10)
      const tempF = Math.round(((tempC * 9) / 5 + 32) * 10) / 10

      return {
        model: SwitchBotBLEModel.MeterProCO2,
        modelName: SwitchBotBLEModelName.MeterProCO2,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MeterProCO2,
        celsius: tempC,
        fahrenheit: tempF,
        fahrenheit_mode: !!(mdByte12 & 0b10000000),
        humidity: mdByte12 & 0b01111111,
        battery: sdByte2 & 0b01111111,
        co2: manufacturerData.readUInt16BE(15),
      } as meterProCO2ServiceData
    }
  }
}

/**
 * Class representing a WoSmartLock device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/lock.md
 */
export class WoSmartLock extends SwitchbotDevice {
  public iv: Buffer | null = null
  public key_id: string = ''
  public encryption_key: Buffer | null = null

  static Result = {
    ERROR: 0x00,
    SUCCESS: 0x01,
    SUCCESS_LOW_BATTERY: 0x06,
  }

  static async validateResponse(res: Buffer): Promise<number> {
    if (res.length >= 3) {
      const result = res.readUInt8(0)
      if (result === WoSmartLock.Result.SUCCESS || result === WoSmartLock.Result.SUCCESS_LOW_BATTERY) {
        return result
      }
    }
    return WoSmartLock.Result.ERROR
  }

  static getLockStatus(code: number): string {
    const statusMap: { [key: number]: string } = {
      0b0000000: 'LOCKED',
      0b0010000: 'UNLOCKED',
      0b0100000: 'LOCKING',
      0b0110000: 'UNLOCKING',
      0b1000000: 'LOCKING_STOP',
      0b1010000: 'UNLOCKING_STOP',
      0b1100000: 'NOT_FULLY_LOCKED', // Only EU lock type
    }
    return statusMap[code] || 'UNKNOWN'
  }

  /**
   * Parses the service data from the SwitchBot Strip Light.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<lockServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<lockServiceData | null> {
    if (manufacturerData.length < 11) {
      emitLog('debugerror', `[parseServiceDataForWoSmartLock] Buffer length ${manufacturerData.length} is too short!`)
      return null
    }

    const byte2 = serviceData.readUInt8(2)
    const byte15 = manufacturerData.readUInt8(9)
    const byte16 = manufacturerData.readUInt8(10)

    const data: lockServiceData = {
      model: SwitchBotBLEModel.Lock,
      modelName: SwitchBotBLEModelName.Lock,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Lock,
      battery: byte2 & 0b01111111,
      calibration: !!(byte15 & 0b10000000),
      status: WoSmartLock.getLockStatus(byte15 & 0b01110000),
      update_from_secondary_lock: !!(byte15 & 0b00001000),
      door_open: !!(byte15 & 0b00000100),
      double_lock_mode: !!(byte16 & 0b10000000),
      unclosed_alarm: !!(byte16 & 0b00100000),
      unlocked_alarm: !!(byte16 & 0b00010000),
      auto_lock_paused: !!(byte16 & 0b00000010),
      night_latch: !!(manufacturerData.length > 11 && manufacturerData.readUInt8(11) & 0b00000001),
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Initializes the encryption key info for valid lock communication.
   * @param {string} keyId - The key ID.
   * @param {string} encryptionKey - The encryption key.
   */
  async setKey(keyId: string, encryptionKey: string): Promise<void> {
    this.iv = null
    this.key_id = keyId
    this.encryption_key = Buffer.from(encryptionKey, 'hex')
  }

  /**
   * Unlocks the Smart Lock.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlock(): Promise<number> {
    const resBuf = await this.operateLock(WoSmartLockCommands.UNLOCK)
    return resBuf ? WoSmartLock.validateResponse(resBuf) : WoSmartLock.Result.ERROR
  }

  /**
   * Unlocks the Smart Lock without unlatching the door.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlockNoUnlatch(): Promise<number> {
    const resBuf = await this.operateLock(WoSmartLockCommands.UNLOCK_NO_UNLATCH)
    return resBuf ? WoSmartLock.validateResponse(resBuf) : WoSmartLock.Result.ERROR
  }

  /**
   * Locks the Smart Lock.
   * @returns {Promise<number>} - The result of the lock operation.
   */
  async lock(): Promise<number> {
    const resBuf = await this.operateLock(WoSmartLockCommands.LOCK)
    return resBuf ? WoSmartLock.validateResponse(resBuf) : WoSmartLock.Result.ERROR
  }

  /**
   * Gets general state info from the Smart Lock.
   * @returns {Promise<object | null>} - The state object or null if an error occurred.
   */
  async info(): Promise<object | null> {
    const resBuf = await this.operateLock(WoSmartLockCommands.LOCK_INFO)
    if (resBuf) {
      return {
        calibration: Boolean(resBuf[1] & 0b10000000),
        status: WoSmartLock.getLockStatus((resBuf[1] & 0b01110000)),
        door_open: Boolean(resBuf[1] & 0b00000100),
        unclosed_alarm: Boolean(resBuf[2] & 0b00100000),
        unlocked_alarm: Boolean(resBuf[2] & 0b00010000),
      }
    }
    return null
  }

  /**
   * Encrypts a string using AES-128-CTR.
   * @param {string} str - The string to encrypt.
   * @returns {Promise<string>} - The encrypted string in hex format.
   */
  async encrypt(str: string): Promise<string> {
    const cipher = Crypto.createCipheriv('aes-128-ctr', this.encryption_key!, this.iv)
    return Buffer.concat([cipher.update(str, 'hex'), cipher.final()]).toString('hex')
  }

  /**
   * Decrypts a buffer using AES-128-CTR.
   * @param {Buffer} data - The data to decrypt.
   * @returns {Promise<Buffer>} - The decrypted data.
   */
  async decrypt(data: Buffer): Promise<Buffer> {
    const decipher = Crypto.createDecipheriv('aes-128-ctr', this.encryption_key!, this.iv)
    return Buffer.concat([decipher.update(data), decipher.final()])
  }

  /**
   * Retrieves the IV from the device.
   * @returns {Promise<Buffer>} - The IV buffer.
   */
  async getIv(): Promise<Buffer> {
    if (!this.iv) {
      const res = await this.operateLock(WoSmartLockCommands.GET_CKIV + this.key_id, false)
      if (res) {
        this.iv = res.subarray(4)
      } else {
        throw new Error('Failed to retrieve IV from the device.')
      }
    }
    return this.iv
  }

  /**
   * Sends an encrypted command to the device.
   * @param {string} key - The command key.
   * @returns {Promise<Buffer>} - The response buffer.
   */
  async encryptedCommand(key: string): Promise<Buffer> {
    const iv = await this.getIv()
    const req = Buffer.from(
      key.substring(0, 2) + this.key_id + Buffer.from(iv.subarray(0, 2)).toString('hex') + await this.encrypt(key.substring(2)),
      'hex',
    )

    const bytes = await this.command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLock.validateResponse(buf)

    if (await code !== WoSmartLock.Result.ERROR) {
      return Buffer.concat([buf.subarray(0, 1), await this.decrypt(buf.subarray(4))])
    } else {
      throw new Error(`The device returned an error: 0x${buf.toString('hex')}`)
    }
  }

  /**
   * Operates the lock with the given command.
   * @param {string} key - The command key.
   * @param {boolean} [encrypt] - Whether to encrypt the command.
   * @returns {Promise<Buffer>} - The response buffer.
   */
  async operateLock(key: string, encrypt: boolean = true): Promise<Buffer> {
    if (encrypt) {
      return this.encryptedCommand(key)
    }
    const req = Buffer.from(`${key.substring(0, 2)}000000${key.substring(2)}`, 'hex')
    const bytes = await this.command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLock.validateResponse(buf)

    if (await code === WoSmartLock.Result.ERROR) {
      throw new Error(`The device returned an error: 0x${buf.toString('hex')}`)
    }
    return buf
  }
}

/**
 * Class representing a WoSmartLockPro device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/lock.md
 */
export class WoSmartLockPro extends SwitchbotDevice {
  public iv: Buffer | null = null
  public key_id: string = ''
  public encryption_key: Buffer | null = null

  static Result = {
    ERROR: 0x00,
    SUCCESS: 0x01,
    SUCCESS_LOW_BATTERY: 0x06,
  }

  static async validateResponse(res: Buffer) {
    if (res.length >= 3) {
      const result = res.readUInt8(0)
      if (result === WoSmartLockPro.Result.SUCCESS || result === WoSmartLockPro.Result.SUCCESS_LOW_BATTERY) {
        return result
      }
    }
    return WoSmartLockPro.Result.ERROR
  }

  static getLockStatus(code: number) {
    const statusMap: { [key: number]: string } = {
      0b0000000: 'LOCKED',
      0b0010000: 'UNLOCKED',
      0b0100000: 'LOCKING',
      0b0110000: 'UNLOCKING',
      0b1000000: 'LOCKING_STOP',
      0b1010000: 'UNLOCKING_STOP',
      0b01100000: 'NOT_FULLY_LOCKED', // Only EU lock type
    }
    return statusMap[code] || 'UNKNOWN'
  }

  /**
   * Parses the service data from the SwitchBot Strip Light.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Buffer} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<lockProServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<lockProServiceData | null> {
    if (manufacturerData.length < 11) {
      emitLog('debugerror', `[parseServiceDataForWoSmartLockPro] Buffer length ${manufacturerData.length} is too short!`)
      return null
    }

    const byte2 = serviceData.readUInt8(2)
    const byte7 = manufacturerData.readUInt8(7)
    const byte8 = manufacturerData.readUInt8(8)
    const byte9 = manufacturerData.readUInt8(9)
    const byte11 = manufacturerData.readUInt8(11)

    const data: lockProServiceData = {
      model: SwitchBotBLEModel.LockPro,
      modelName: SwitchBotBLEModelName.LockPro,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.LockPro,
      battery: byte2 & 0b01111111,
      calibration: !!(byte7 & 0b10000000),
      status: WoSmartLockPro.getLockStatus((byte7 & 0b00111000) >> 3),
      door_open: !!(byte8 & 0b01100000),
      update_from_secondary_lock: false,
      double_lock_mode: false,
      unclosed_alarm: !!(byte11 & 0b10000000),
      unlocked_alarm: !!(byte11 & 0b01000000),
      auto_lock_paused: !!(byte8 & 0b100000),
      night_latch: !!(byte9 & 0b00000001),
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Initializes the encryption key info for valid lock communication.
   * @param {string} keyId - The key ID.
   * @param {string} encryptionKey - The encryption key.
   */
  async setKey(keyId: string, encryptionKey: string) {
    this.iv = null
    this.key_id = keyId
    this.encryption_key = Buffer.from(encryptionKey, 'hex')
  }

  /**
   * Unlocks the Smart Lock.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlock(): Promise<number> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.UNLOCK)
    return resBuf ? WoSmartLockPro.validateResponse(resBuf) : WoSmartLockPro.Result.ERROR
  }

  /**
   * Unlocks the Smart Lock without unlatching the door.
   * @returns {Promise<number>} - The result of the unlock operation.
   */
  async unlockNoUnlatch(): Promise<number> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.UNLOCK_NO_UNLATCH)
    return resBuf ? WoSmartLockPro.validateResponse(resBuf) : WoSmartLockPro.Result.ERROR
  }

  /**
   * Locks the Smart Lock.
   * @returns {Promise<number>} - The result of the lock operation.
   */
  async lock(): Promise<number> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.LOCK)
    return resBuf ? WoSmartLockPro.validateResponse(resBuf) : WoSmartLockPro.Result.ERROR
  }

  /**
   * Gets general state info from the Smart Lock.
   * @returns {Promise<object | null>} - The state object or null if an error occurred.
   */
  async info(): Promise<object | null> {
    const resBuf = await this.operateLockPro(WoSmartLockProCommands.LOCK_INFO)
    if (resBuf) {
      return {
        calibration: Boolean(resBuf[0] & 0b10000000),
        status: WoSmartLockPro.getLockStatus((resBuf[0] & 0b01110000) >> 4),
        door_open: Boolean(resBuf[0] & 0b00000100),
        unclosed_alarm: Boolean(resBuf[1] & 0b00100000),
        unlocked_alarm: Boolean(resBuf[1] & 0b00010000),
      }
    }
    return null
  }

  /**
   * Encrypts a string using AES-128-CTR.
   * @param {string} str - The string to encrypt.
   * @returns {Promise<string>} - The encrypted string in hex format.
   */
  async encrypt(str: string): Promise<string> {
    const cipher = Crypto.createCipheriv('aes-128-ctr', this.encryption_key!, this.iv)
    return Buffer.concat([cipher.update(str, 'hex'), cipher.final()]).toString('hex')
  }

  /**
   * Decrypts a buffer using AES-128-CTR.
   * @param {Buffer} data - The data to decrypt.
   * @returns {Promise<Buffer>} - The decrypted data.
   */
  async decrypt(data: Buffer): Promise<Buffer> {
    const decipher = Crypto.createDecipheriv('aes-128-ctr', this.encryption_key!, this.iv)
    return Buffer.concat([decipher.update(data), decipher.final()])
  }

  /**
   * Retrieves the IV from the device.
   * @returns {Promise<Buffer>} - The IV buffer.
   */
  async getIv(): Promise<Buffer> {
    if (!this.iv) {
      const res = await this.operateLockPro(WoSmartLockProCommands.GET_CKIV + this.key_id, false)
      if (res) {
        this.iv = res.subarray(4)
      } else {
        throw new Error('Failed to retrieve IV from the device.')
      }
    }
    return this.iv
  }

  /**
   * Sends an encrypted command to the device.
   * @param {string} key - The command key.
   * @returns {Promise<Buffer>} - The response buffer.
   */
  async encryptedCommand(key: string): Promise<Buffer> {
    const iv = await this.getIv()
    const req = Buffer.from(
      key.substring(0, 2) + this.key_id + Buffer.from(iv.subarray(0, 2)).toString('hex') + await this.encrypt(key.substring(2)),
      'hex',
    )

    const bytes = await this.command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLockPro.validateResponse(buf)

    if (await code !== WoSmartLockPro.Result.ERROR) {
      return Buffer.concat([buf.subarray(0, 1), await this.decrypt(buf.subarray(4))])
    } else {
      throw new Error(`The device returned an error: 0x${buf.toString('hex')}`)
    }
  }

  /**
   * Operates the lock with the given command.
   * @param {string} key - The command key.
   * @param {boolean} [encrypt] - Whether to encrypt the command.
   * @returns {Promise<Buffer>} - The response buffer.
   */
  async operateLockPro(key: string, encrypt: boolean = true): Promise<Buffer> {
    if (encrypt) {
      return this.encryptedCommand(key)
    }
    const req = Buffer.from(`${key.substring(0, 2)}000000${key.substring(2)}`, 'hex')
    const bytes = await this.command(req)
    const buf = Buffer.from(bytes as Uint8Array)
    const code = WoSmartLockPro.validateResponse(buf)

    if (await code === WoSmartLockPro.Result.ERROR) {
      throw new Error(`The device returned an error: 0x${buf.toString('hex')}`)
    }
    return buf
  }
}

/**
 * Class representing a WoSmartLockUltra device.
 * Reuses the LockPro parsing and encrypted command behavior but reports a distinct model.
 */
export class WoSmartLockUltra extends WoSmartLockPro {
  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  static async parseServiceData(
    serviceData: Buffer,
    manufacturerData: Buffer,
    emitLog: (level: string, message: string) => void,
  ) {
    const data = await WoSmartLockPro.parseServiceData(serviceData, manufacturerData, emitLog)
    if (!data) return null
    const out = data as any
    out.model = SwitchBotBLEModel.LockUltra
    out.modelName = SwitchBotBLEModelName.LockUltra
    out.modelFriendlyName = SwitchBotBLEModelFriendlyName.LockUltra
    return out
  }
}

/**
 * Class representing a WoStrip device.
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/ledstriplight.md
 */
export class WoStrip extends SwitchbotDevice {
  /**
   * Parses the service data from the SwitchBot Strip Light.
   * @param {Buffer} serviceData - The service data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {Promise<stripLightServiceData | null>} - Parsed service data or null if invalid.
   */
  static async parseServiceData(
    serviceData: Buffer,
    emitLog: (level: string, message: string) => void,
  ): Promise<stripLightServiceData | null> {
    if (serviceData.length !== 18) {
      emitLog('debugerror', `[parseServiceDataForWoStrip] Buffer length ${serviceData.length} !== 18!`)
      return null
    }

    const [byte3, byte4, byte5, byte7, byte8, byte9, byte10] = [
      serviceData.readUInt8(3),
      serviceData.readUInt8(4),
      serviceData.readUInt8(5),
      serviceData.readUInt8(7),
      serviceData.readUInt8(8),
      serviceData.readUInt8(9),
      serviceData.readUInt8(10),
    ]

    const data: stripLightServiceData = {
      model: SwitchBotBLEModel.StripLight,
      modelName: SwitchBotBLEModelName.StripLight,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.StripLight,
      power: !!(byte7 & 0b10000000),
      state: !!(byte7 & 0b10000000),
      brightness: byte7 & 0b01111111,
      red: byte3,
      green: byte4,
      blue: byte5,
      color_temperature: 0, // Add a default value or extract from serviceData if available
      delay: byte8 & 0b10000000,
      preset: byte8 & 0b00001000,
      color_mode: byte8 & 0b00000111,
      speed: byte9 & 0b01111111,
      loop_index: byte10 & 0b11111110,
    }

    return data
  }

  constructor(peripheral: NobleTypes['peripheral'], noble: NobleTypes['noble']) {
    super(peripheral, noble)
  }

  /**
   * Reads the state of the strip light.
   * @returns {Promise<boolean>} - Resolves with true if the strip light is ON, false otherwise.
   */
  async readState(): Promise<boolean> {
    return this.operateStripLight([0x57, 0x0F, 0x4A, 0x01])
  }

  /**
   * Sets the state of the strip light.
   * @public
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    const base = [0x57, 0x0F, 0x49, 0x01]
    return this.operateStripLight([...base, ...reqByteArray])
  }

  /**
   * Turns the strip light on.
   * @returns {Promise<boolean>} - Resolves with true if the strip light is ON.
   */
  async turnOn(): Promise<boolean> {
    return this.setState([0x01, 0x01])
  }

  /**
   * Turns the strip light off.
   * @returns {Promise<boolean>} - Resolves with true if the strip light is OFF.
   */
  async turnOff(): Promise<boolean> {
    return this.setState([0x01, 0x02])
  }

  /**
   * Sets the brightness of the strip light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setBrightness(brightness: number): Promise<boolean> {
    if (typeof brightness !== 'number' || brightness < 0 || brightness > 100) {
      throw new TypeError(`Invalid brightness value: ${brightness}`)
    }
    return this.setState([0x02, 0x14, brightness])
  }

  /**
   * Sets the RGB values of the strip light.
   * @param {number} brightness - The brightness percentage (0-100).
   * @param {number} red - The red value (0-255).
   * @param {number} green - The green value (0-255).
   * @param {number} blue - The blue value (0-255).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setRGB(brightness: number, red: number, green: number, blue: number): Promise<boolean> {
    if (![brightness, red, green, blue].every(val => typeof val === 'number')) {
      throw new TypeError('Invalid RGB or brightness value')
    }

    brightness = Math.max(0, Math.min(100, brightness))
    red = Math.max(0, Math.min(255, red))
    green = Math.max(0, Math.min(255, green))
    blue = Math.max(0, Math.min(255, blue))

    return this.setState([0x02, 0x12, brightness, red, green, blue])
  }

  /**
   * Operates the strip light with the given byte array.
   * @public
   * @param {number[]} bytes - The byte array to send.
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  public async operateStripLight(bytes: number[]): Promise<boolean> {
    const req_buf = Buffer.from(bytes)
    const res_buf = await this.command(req_buf)

    if (res_buf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${res_buf.toString('hex')}`)
    }

    const code = res_buf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${res_buf.toString('hex')}`)
    }
  }
}

/**
 * Class representing a SwitchBot Air Purifier device.
 * @extends SwitchbotDevice
 */
export class WoAirPurifier extends SwitchbotDevice {
  /**
   * Parses service data for air purifier devices.
   * @param {Buffer | null} serviceData - The service data buffer.
   * @param {Buffer | null} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {airPurifierServiceData | null} - The parsed service data or null.
   */
  static parseServiceData(serviceData: Buffer | null, manufacturerData: Buffer | null, emitLog?: (level: string, message: string) => void): airPurifierServiceData | null {
    if (!manufacturerData || manufacturerData.length < 14) {
      return null
    }

    const deviceData = manufacturerData.subarray(6)

    if (deviceData.length < 8) {
      return null
    }

    const sequenceNumber = deviceData[0]
    const isOn = Boolean(deviceData[1] & 0b10000000)
    const mode = deviceData[1] & 0b00000111
    const isAqiValid = Boolean(deviceData[2] & 0b00000100)
    const childLock = Boolean(deviceData[2] & 0b00000010)
    const speed = deviceData[3] & 0b01111111
    const aqiLevelRaw = (deviceData[4] & 0b00000110) >> 1
    const workTime = (deviceData[5] << 8) | deviceData[6]
    const errCode = deviceData[7]

    // Map AQI level to string using the defined constant
    const aqiLevelValues = [
      AIR_QUALITY_LEVELS.EXCELLENT,
      AIR_QUALITY_LEVELS.GOOD,
      AIR_QUALITY_LEVELS.FAIR,
      AIR_QUALITY_LEVELS.POOR,
    ]
    const aqiLevel = aqiLevelValues[aqiLevelRaw] || 'unknown'

    // Determine mode based on mode value and speed
    let modeString: string | null = null
    if (mode === 1) {
      if (speed >= 0 && speed <= 33) {
        modeString = AIR_PURIFIER_MODES.LEVEL_1
      } else if (speed >= 34 && speed <= 66) {
        modeString = AIR_PURIFIER_MODES.LEVEL_2
      } else {
        modeString = AIR_PURIFIER_MODES.LEVEL_3
      }
    } else if (mode > 1 && mode <= 4) {
      const modeMap = [null, null, 'auto', 'sleep', 'manual']
      modeString = modeMap[mode + 2] || null
    }

    if (emitLog) {
      emitLog('debug', `Air Purifier Service Data: isOn=${isOn}, mode=${modeString}, speed=${speed}, AQI=${aqiLevel}`)
    }

    return {
      model: SwitchBotBLEModel.AirPurifier,
      modelName: SwitchBotBLEModelName.AirPurifier,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.AirPurifier,
      isOn,
      mode: modeString,
      isAqiValid,
      child_lock: childLock,
      speed,
      aqi_level: aqiLevel,
      filter_element_working_time: workTime,
      err_code: errCode,
      sequence_number: sequenceNumber,
    }
  }

  /**
   * Sets the state of the air purifier.
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   * @private
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    return this.operateAirPurifier(reqByteArray)
  }

  /**
   * Turns the air purifier on.
   * @returns {Promise<boolean>} - Resolves with true if the air purifier is turned on.
   */
  async turnOn(): Promise<boolean> {
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.TURN_ON])
  }

  /**
   * Turns the air purifier off.
   * @returns {Promise<boolean>} - Resolves with true if the air purifier is turned off.
   */
  async turnOff(): Promise<boolean> {
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.TURN_OFF])
  }

  /**
   * Sets the speed of the air purifier.
   * @param {number} speed - The speed value (0-100).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setSpeed(speed: number): Promise<boolean> {
    if (typeof speed !== 'number' || speed < 0 || speed > 100) {
      throw new TypeError(`Invalid speed value: ${speed}`)
    }
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.SET_SPEED, speed])
  }

  /**
   * Sets the mode of the air purifier.
   * @param {number} mode - The mode value (1-4).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setMode(mode: number): Promise<boolean> {
    if (typeof mode !== 'number' || mode < 1 || mode > 4) {
      throw new TypeError(`Invalid mode value: ${mode}`)
    }
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.SET_MODE, mode])
  }

  /**
   * Operates the air purifier with the given byte array.
   * @public
   * @param {number[]} bytes - The byte array to send.
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  public async operateAirPurifier(bytes: number[]): Promise<boolean> {
    const req_buf = Buffer.from(bytes)
    const res_buf = await this.command(req_buf)

    if (res_buf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${res_buf.toString('hex')}`)
    }

    const code = res_buf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${res_buf.toString('hex')}`)
    }
  }
}

/**
 * Class representing a SwitchBot Air Purifier Table device.
 * @extends SwitchbotDevice
 */
export class WoAirPurifierTable extends SwitchbotDevice {
  /**
   * Parses service data for air purifier table devices.
   * @param {Buffer | null} serviceData - The service data buffer.
   * @param {Buffer | null} manufacturerData - The manufacturer data buffer.
   * @param {Function} emitLog - The function to emit log messages.
   * @returns {airPurifierTableServiceData | null} - The parsed service data or null.
   */
  static parseServiceData(serviceData: Buffer | null, manufacturerData: Buffer | null, emitLog?: (level: string, message: string) => void): airPurifierTableServiceData | null {
    if (!manufacturerData || manufacturerData.length < 14) {
      return null
    }

    const deviceData = manufacturerData.subarray(6)

    if (deviceData.length < 8) {
      return null
    }

    const sequenceNumber = deviceData[0]
    const isOn = Boolean(deviceData[1] & 0b10000000)
    const mode = deviceData[1] & 0b00000111
    const isAqiValid = Boolean(deviceData[2] & 0b00000100)
    const childLock = Boolean(deviceData[2] & 0b00000010)
    const speed = deviceData[3] & 0b01111111
    const aqiLevelRaw = (deviceData[4] & 0b00000110) >> 1
    const workTime = (deviceData[5] << 8) | deviceData[6]
    const errCode = deviceData[7]

    // Map AQI level to string using the defined constant
    const aqiLevelValues = [
      AIR_QUALITY_LEVELS.EXCELLENT,
      AIR_QUALITY_LEVELS.GOOD,
      AIR_QUALITY_LEVELS.FAIR,
      AIR_QUALITY_LEVELS.POOR,
    ]
    const aqiLevel = aqiLevelValues[aqiLevelRaw] || 'unknown'

    // Determine mode based on mode value and speed
    let modeString: string | null = null
    if (mode === 1) {
      if (speed >= 0 && speed <= 33) {
        modeString = AIR_PURIFIER_MODES.LEVEL_1
      } else if (speed >= 34 && speed <= 66) {
        modeString = AIR_PURIFIER_MODES.LEVEL_2
      } else {
        modeString = AIR_PURIFIER_MODES.LEVEL_3
      }
    } else if (mode > 1 && mode <= 4) {
      const modeMap = [null, null, 'auto', 'sleep', 'manual']
      modeString = modeMap[mode + 2] || null
    }

    if (emitLog) {
      emitLog('debug', `Air Purifier Table Service Data: isOn=${isOn}, mode=${modeString}, speed=${speed}, AQI=${aqiLevel}`)
    }

    return {
      model: SwitchBotBLEModel.AirPurifierTable,
      modelName: SwitchBotBLEModelName.AirPurifierTable,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.AirPurifierTable,
      isOn,
      mode: modeString,
      isAqiValid,
      child_lock: childLock,
      speed,
      aqi_level: aqiLevel,
      filter_element_working_time: workTime,
      err_code: errCode,
      sequence_number: sequenceNumber,
    }
  }

  /**
   * Sets the state of the air purifier table.
   * @param {number[]} reqByteArray - The request byte array.
   * @returns {Promise<boolean>} - Resolves with a boolean indicating whether the operation was successful.
   * @private
   */
  public async setState(reqByteArray: number[]): Promise<boolean> {
    return this.operateAirPurifierTable(reqByteArray)
  }

  /**
   * Turns the air purifier table on.
   * @returns {Promise<boolean>} - Resolves with true if the air purifier table is turned on.
   */
  async turnOn(): Promise<boolean> {
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.TURN_ON])
  }

  /**
   * Turns the air purifier table off.
   * @returns {Promise<boolean>} - Resolves with true if the air purifier table is turned off.
   */
  async turnOff(): Promise<boolean> {
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.TURN_OFF])
  }

  /**
   * Sets the speed of the air purifier table.
   * @param {number} speed - The speed value (0-100).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setSpeed(speed: number): Promise<boolean> {
    if (typeof speed !== 'number' || speed < 0 || speed > 100) {
      throw new TypeError(`Invalid speed value: ${speed}`)
    }
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.SET_SPEED, speed])
  }

  /**
   * Sets the mode of the air purifier table.
   * @param {number} mode - The mode value (1-4).
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  async setMode(mode: number): Promise<boolean> {
    if (typeof mode !== 'number' || mode < 1 || mode > 4) {
      throw new TypeError(`Invalid mode value: ${mode}`)
    }
    return this.setState([...DEVICE_COMMANDS.AIR_PURIFIER.SET_MODE, mode])
  }

  /**
   * Operates the air purifier table with the given byte array.
   * @public
   * @param {number[]} bytes - The byte array to send.
   * @returns {Promise<boolean>} - Resolves with true if the operation was successful.
   */
  public async operateAirPurifierTable(bytes: number[]): Promise<boolean> {
    const req_buf = Buffer.from(bytes)
    const res_buf = await this.command(req_buf)

    if (res_buf.length !== 2) {
      throw new Error(`Expecting a 2-byte response, got instead: 0x${res_buf.toString('hex')}`)
    }

    const code = res_buf.readUInt8(1)
    if (code === 0x00 || code === 0x80) {
      return code === 0x80
    } else {
      throw new Error(`The device returned an error: 0x${res_buf.toString('hex')}`)
    }
  }
}
