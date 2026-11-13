/**
 * Passive polling interval (24 hours)
 */
// ms
/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * settings.ts: SwitchBot v4.0.0 - Configuration and Constants
 */

import type { Buffer } from 'node:buffer'

import process from 'node:process'

export const PASSIVE_POLL_INTERVAL = 60 * 60 * 24 * 1000

/**
 * OpenAPI Configuration
 */
export const DEFAULT_BASE_URL = 'https://api.switch-bot.com'
export const API_VERSION = 'v1.1'

export const urls: {
  base: string
  devices: string
  scenes: string
  webhook: string
} = {
  base: DEFAULT_BASE_URL,
  devices: `${DEFAULT_BASE_URL}/${API_VERSION}/devices`,
  scenes: `${DEFAULT_BASE_URL}/${API_VERSION}/scenes`,
  webhook: `${DEFAULT_BASE_URL}/${API_VERSION}/webhook`,
}

/**
 * Update the base URL for all API endpoints
 * @param newBaseURL - The new base URL to use
 */
export function updateBaseURL(newBaseURL: string): void {
  urls.base = newBaseURL
  urls.devices = `${newBaseURL}/${API_VERSION}/devices`
  urls.scenes = `${newBaseURL}/${API_VERSION}/scenes`
  urls.webhook = `${newBaseURL}/${API_VERSION}/webhook`
}

/**
 * BLE Configuration
 */
export const BLE_SERVICE_UUID = 'cba20d00224d11e69fb80002a5d5c51b'
export const BLE_WRITE_CHARACTERISTIC_UUID = 'cba20002224d11e69fb80002a5d5c51b'
export const BLE_NOTIFY_CHARACTERISTIC_UUID = 'cba20003224d11e69fb80002a5d5c51b'

// Alternative UUIDs for specific devices
export const SERV_UUID_PRIMARY = 'cba20d00-224d-11e6-9fb8-0002a5d5c51b'
export const CHAR_UUID_WRITE = 'cba20002-224d-11e6-9fb8-0002a5d5c51b'
export const CHAR_UUID_NOTIFY = 'cba20003-224d-11e6-9fb8-0002a5d5c51b'
export const CHAR_UUID_DEVICE = 'cba20d00-224d-11e6-9fb8-0002a5d5c51b'

/**
 * BLE Timeouts (in milliseconds)
 */
export const BLE_SCAN_TIMEOUT = 10000
export const BLE_CONNECT_TIMEOUT = 10000
export const BLE_COMMAND_TIMEOUT = 5000
export const READ_TIMEOUT_MSEC = 10000
export const WRITE_TIMEOUT_MSEC = 10000

/**
 * Device Command Constants
 */
export const DEVICE_COMMANDS = {
  // Bot (WoHand)
  BOT: {
    PRESS: [0x57, 0x01, 0x00] as const,
    TURN_ON: [0x57, 0x01, 0x01] as const,
    TURN_OFF: [0x57, 0x01, 0x02] as const,
    DOWN: [0x57, 0x01, 0x01] as const,
    UP: [0x57, 0x01, 0x02] as const,
    SET_MODE: [0x57, 0x0F, 0x47, 0x01] as const,
    SET_LONG_PRESS: [0x57, 0x0F, 0x47, 0x03] as const,
  },

  // Curtain (WoCurtain)
  CURTAIN: {
    OPEN: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x00] as const,
    CLOSE: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x64] as const,
    PAUSE: [0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF] as const,
    POSITION: [0x57, 0x0F, 0x45, 0x01, 0x05] as const, // Append mode byte and position byte
    EXTENDED_INFO: [0x57, 0x0F, 0x46, 0x01] as const, // Get device chain and grouped status
  },

  // Blind Tilt
  BLIND_TILT: {
    OPEN: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x32] as const,
    CLOSE_UP: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x64] as const,
    CLOSE_DOWN: [0x57, 0x0F, 0x45, 0x01, 0x05, 0xFF, 0x00] as const,
    PAUSE: [0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF] as const,
  },

  // Bulb (WoBulb)
  BULB: {
    BASE: [0x57, 0x0F, 0x47, 0x01] as const,
    READ_STATE: [0x57, 0x0F, 0x48, 0x01] as const,
    TURN_ON: [0x01, 0x01] as const,
    TURN_OFF: [0x01, 0x02] as const,
    SET_BRIGHTNESS: [0x02, 0x14] as const, // Add brightness byte
    SET_COLOR_TEMP: [0x02, 0x17] as const, // Add temp bytes
    SET_RGB: [0x02, 0x12] as const, // Add RGB bytes
    SET_EFFECT: [0x03] as const,
  },

  // Humidifier
  HUMIDIFIER: {
    HEADER: '5701' as const,
    TURN_ON: '570101' as const,
    TURN_OFF: '570102' as const,
    INCREASE: '570103' as const,
    DECREASE: '570104' as const,
    SET_AUTO_MODE: '570105' as const,
    SET_MANUAL_MODE: '570106' as const,
  },

  // Air Purifier
  AIR_PURIFIER: {
    TURN_ON: [0x57, 0x01, 0x01] as const,
    TURN_OFF: [0x57, 0x01, 0x02] as const,
    SET_MODE: [0x57, 0x02] as const, // Add mode byte
    SET_SPEED: [0x57, 0x03] as const, // Add speed byte
    // pySwitchbot 3.1.0 (air_purifier.py): reset filter usage, then read it back
    RESET_FILTER_USAGE: [0x57, 0x0F, 0x4C, 0x09] as const,
    READ_FILTER_USAGE: [0x57, 0x0F, 0x4D, 0x09] as const,
  },

  // Vacuum
  VACUUM: {
    CLEAN_UP: {
      1: [0x57, 0x0F, 0x5A, 0x00, 0xFF, 0xFF, 0x70, 0x01] as const,
      2: [0x5A, 0x40, 0x01, 0x01, 0x01, 0x01, 0x26] as const,
    },
    RETURN_TO_DOCK: {
      1: [0x57, 0x0F, 0x5A, 0x00, 0xFF, 0xFF, 0x70, 0x02] as const,
      2: [0x5A, 0x40, 0x01, 0x01, 0x01, 0x02, 0x25] as const,
    },
  },

  // Plug
  PLUG: {
    TURN_ON: [0x57, 0x0F, 0x50, 0x01, 0x01] as const,
    TURN_OFF: [0x57, 0x0F, 0x50, 0x01, 0x02] as const,
    TOGGLE: [0x57, 0x0F, 0x50, 0x01, 0x00] as const,
  },

  RELAY: {
    GET_BASIC_INFO: [0x57, 0x02] as const,
    CHANNEL1_ON: [0x57, 0x0F, 0x50, 0x01, 0x01] as const,
    CHANNEL1_OFF: [0x57, 0x0F, 0x50, 0x01, 0x02] as const,
    CHANNEL2_ON: [0x57, 0x0F, 0x50, 0x02, 0x01] as const,
    CHANNEL2_OFF: [0x57, 0x0F, 0x50, 0x02, 0x02] as const,
  },

  // Common commands
  COMMON: {
    POWER_ON: [0x57, 0x01, 0x01] as const,
    POWER_OFF: [0x57, 0x01, 0x02] as const,
  },
} as const

/**
 * @deprecated These bytes never matched the lock protocol. Locks use {@link LOCK_COMMANDS}.
 */
export const WoSmartLockCommands = {
  LOCK: [0x57, 0x0F, 0x4E, 0x01, 0x00] as const,
  UNLOCK: [0x57, 0x0F, 0x4E, 0x01, 0x01] as const,
} as const

/**
 * @deprecated These bytes never matched the lock protocol. Locks use {@link LOCK_COMMANDS}.
 */
export const WoSmartLockProCommands = {
  LOCK: [0x57, 0x0F, 0x4F, 0x01, 0x00] as const,
  UNLOCK: [0x57, 0x0F, 0x4F, 0x01, 0x01] as const,
  UNLATCH: [0x57, 0x0F, 0x4F, 0x01, 0x02] as const,
} as const

/** Lock models, with pySwitchbot's names */
export type LockModel
  = | 'Lock'
    | 'Lock Lite'
    | 'Lock Pro'
    | 'Lock Pro WiFi'
    | 'Lock Ultra'
    | 'Lock Ultra Max'
    | 'UWB Lock'
    | 'Lock Nano'
    | 'Lock Vision'
    | 'Lock Vision Pro'

/** BLE commands for one lock model, before encryption */
export interface LockCommandSet {
  lock: readonly number[]
  unlock: readonly number[]
  unlockWithoutUnlatch: readonly number[]
  /** Read the lock info */
  info: readonly number[]
  enableNotifications: readonly number[]
  /** Lock Ultra only */
  halfLock?: readonly number[]
}

function hex(value: string): readonly number[] {
  return Object.freeze(value.match(/../g)!.map(byte => Number.parseInt(byte, 16)))
}

/** Lock, Lock Lite: lock and unlock commands end with a mode byte (pySwitchbot) */
function lock1Commands(modelByte: string): LockCommandSet {
  return {
    lock: hex('570f4e01011000'),
    unlock: hex('570f4e01011080'),
    unlockWithoutUnlatch: hex('570f4e010110a0'),
    info: hex(`570f4f81${modelByte}`),
    enableNotifications: hex(`570e01001e000081${modelByte}`),
  }
}

/** Every other lock model */
function lock2Commands(modelByte: string): LockCommandSet {
  return {
    lock: hex('570f4e0101000000'),
    unlock: hex('570f4e0101000080'),
    unlockWithoutUnlatch: hex('570f4e01010000a0'),
    info: hex(`570f4f81${modelByte}`),
    enableNotifications: hex(`570e01001e000081${modelByte}`),
  }
}

/**
 * BLE lock commands for each lock model, as pySwitchbot's tables in switchbot/devices/lock.py.
 * Locks are encrypted devices: set the key with `device.setKey({ keyId, encryptionKey })`.
 */
export const LOCK_COMMANDS: Record<LockModel, LockCommandSet> = {
  'Lock': lock1Commands('01'),
  'Lock Lite': lock1Commands('01'),
  'Lock Pro': lock2Commands('04'),
  'Lock Ultra': { ...lock2Commands('07'), halfLock: hex('570f4e0101000008') },
  'Lock Ultra Max': lock2Commands('07'),
  'UWB Lock': lock2Commands('07'),
  'Lock Nano': lock2Commands('0c'),
  'Lock Vision Pro': lock2Commands('02'),
  'Lock Vision': lock2Commands('02'),
  'Lock Pro WiFi': lock2Commands('0a'),
}

/** Lock Ultra Quick Key: read the settings */
export const LOCK_QUICK_KEY_GET = hex('570f4f0401')
/** Lock Ultra Quick Key: write prefix, followed by the update, value and motor speed bytes */
export const LOCK_QUICK_KEY_SET_PREFIX = hex('570f4e040100')

/**
 * Lock models for the device type names node-switchbot and the OpenAPI use. Device types that
 * are not listed fall back to the lock class's own model.
 */
export const LOCK_MODEL_BY_DEVICE_TYPE: Record<string, LockModel> = {
  'lock': 'Lock',
  'smart lock': 'Lock',
  'lock lite': 'Lock Lite',
  'smart lock lite': 'Lock Lite',
  'lock pro': 'Lock Pro',
  'smart lock pro': 'Lock Pro',
  'lock pro wifi': 'Lock Pro WiFi',
  'smart lock pro wifi': 'Lock Pro WiFi',
  'lock ultra': 'Lock Ultra',
  'smart lock ultra': 'Lock Ultra',
  'lock ultra max': 'Lock Ultra Max',
  'smart lock ultra max': 'Lock Ultra Max',
  'uwb lock': 'UWB Lock',
  'smart lock uwb': 'UWB Lock',
  'lock nano': 'Lock Nano',
  'smart lock nano': 'Lock Nano',
  'lock vision': 'Lock Vision',
  'lock vision pro': 'Lock Vision Pro',
}

/**
 * Devices identified by the 4-byte product ID at the end of their service data, as pySwitchbot's
 * multi-byte SUPPORTED_TYPES keys (found by `_find_model_from_service_data_suffix`). Keys are hex;
 * each product has a `00` and a `01` form.
 *
 * Only products whose BLE status and commands node-switchbot implements are listed: recognising a
 * product over BLE makes its status BLE-first.
 */
export const PRODUCT_ID_MODEL_MAP: Record<string, string> = {
  '0010a5b8': 'Lock Ultra',
  '0110a5b8': 'Lock Ultra',
  '00119fb8': 'Lock Ultra Max',
  '01119fb8': 'Lock Ultra Max',
  '00121100': 'UWB Lock',
  '01121100': 'UWB Lock',
  '00122488': 'Lock Nano',
  '01122488': 'Lock Nano',
  '00116908': 'Lock Vision',
  '01116908': 'Lock Vision',
  '00116909': 'Lock Vision Pro',
  '01116909': 'Lock Vision Pro',
  '0010ff90': 'Lock Pro WiFi',
  '0110ff90': 'Lock Pro WiFi',
}

/**
 * The product ID from the end of a service data payload, as pySwitchbot checks it: the last 4
 * bytes, then the 4 bytes before the last.
 */
export function findProductId(data: Buffer): string | undefined {
  if (data.length <= 5) {
    return undefined
  }
  for (const candidate of [data.subarray(-4), data.subarray(-5, -1)]) {
    const key = candidate.toString('hex')
    if (Object.hasOwn(PRODUCT_ID_MODEL_MAP, key)) {
      return key
    }
  }
  return undefined
}

/**
 * Device Model to Type Mapping
 */
export const DEVICE_MODEL_MAP: Record<string, string> = {
  // Codes are byte 0 of the service data with the top bit cleared, as in pySwitchbot's
  // SUPPORTED_TYPES (switchbot/adv_parser.py). Most products have two codes.
  'H': 'Bot',
  'c': 'Curtain',
  'C': 'Curtain',
  '{': 'Curtain3',
  '[': 'Curtain3',
  'x': 'Blind Tilt',
  'X': 'Blind Tilt',
  ',': 'Roller Shade',
  '\x0C': 'Roller Shade',
  'g': 'Plug Mini (US)',
  'G': 'Plug Mini (US)',
  'j': 'Plug Mini (JP)',
  'J': 'Plug Mini (JP)',
  '?': 'Plug Mini (EU)',
  '\x1F': 'Plug Mini (EU)',
  ';': 'Relay Switch 1',
  '\x1B': 'Relay Switch 1',
  '<': 'Relay Switch 1PM',
  '\x1C': 'Relay Switch 1PM',
  '=': 'Relay Switch 2PM',
  '\x1D': 'Relay Switch 2PM',
  '>': 'Garage Door Opener',
  '\x1E': 'Garage Door Opener',
  'T': 'Meter',
  't': 'Meter',
  'i': 'Meter Plus',
  'I': 'Meter Plus',
  '4': 'Meter Pro',
  '\x14': 'Meter Pro',
  '5': 'Meter Pro (CO2)',
  '\x15': 'Meter Pro (CO2)',
  'w': 'Indoor/Outdoor Thermo-Hygrometer',
  'W': 'Indoor/Outdoor Thermo-Hygrometer',
  'o': 'Lock',
  'O': 'Lock',
  '$': 'Lock Pro',
  '\x04': 'Lock Pro',
  '-': 'Lock Lite',
  '\x0D': 'Lock Lite',
  'y': 'Keypad',
  'Y': 'Keypad',
  's': 'Motion Sensor',
  'S': 'Motion Sensor',
  'd': 'Contact Sensor',
  'D': 'Contact Sensor',
  '&': 'Water Leak Detector',
  '\x06': 'Water Leak Detector',
  'q': 'Ceiling Light',
  'Q': 'Ceiling Light',
  'n': 'Ceiling Light Pro',
  'N': 'Ceiling Light Pro',
  'r': 'Strip Light',
  'R': 'Strip Light',
  'u': 'Color Bulb',
  'U': 'Color Bulb',
  'e': 'Humidifier',
  'E': 'Humidifier',
  '#': 'Evaporative Humidifier',
  '\x03': 'Evaporative Humidifier',
  '*': 'Air Purifier',
  '\x0A': 'Air Purifier',
  '+': 'Air Purifier',
  '\x0B': 'Air Purifier',
  '7': 'Air Purifier Table',
  '\x17': 'Air Purifier Table',
  '8': 'Air Purifier Table',
  '\x18': 'Air Purifier Table',
  '~': 'Circulator Fan',
  '^': 'Circulator Fan',
  'v': 'Hub 2',
  'V': 'Hub 2',
  '%': 'HubMini Matter',
  '\x05': 'HubMini Matter',
  'b': 'Remote',
  'B': 'Remote',
  'z': 'Robot Vacuum Cleaner S10',
  'Z': 'Robot Vacuum Cleaner S10',
  '}': 'Robot Vacuum Cleaner K10+',
  ']': 'Robot Vacuum Cleaner K10+',
  '(': 'Robot Vacuum Cleaner K10+ Pro',
  '\x08': 'Robot Vacuum Cleaner K10+ Pro',
  '3': 'K10+ Pro Combo',
  '\x13': 'K10+ Pro Combo',
  '.': 'Robot Vacuum Cleaner K20',
  '\x0F': 'Robot Vacuum Cleaner K20',
  // Codes not in pySwitchbot, kept from earlier node-switchbot releases
  '\x01': 'Hub 2',
  '\x02': 'Hub 3',
  '\x09': 'Air Purifier Table',
  '\x0E': 'Relay Switch 1',
  '\x10': 'K10+ Pro Combo',
  '\x11': 'Lock Pro',
  'k': 'Keypad',
  'p': 'Strip Light',
} as const

/**
 * Device Type to Class Name Mapping
 */
export const DEVICE_CLASS_MAP: Record<string, string> = {
  'Bot': 'WoHand',
  'Curtain': 'WoCurtain',
  'Curtain3': 'WoCurtain',
  'WoCurtain3': 'WoCurtain',
  'Roller Shade': 'WoRollerShade',
  'SwitchBot Roller Shade': 'WoRollerShade',
  'Plug': 'WoPlugMiniUS',
  'WoPlugUS': 'WoPlugMiniUS',
  'Plug Mini (US)': 'WoPlugMiniUS',
  'Plug Mini (JP)': 'WoPlugMiniJP',
  'WoPlugJP': 'WoPlugMiniJP',
  'Plug Mini (EU)': 'WoPlugMiniEU',
  // Same relay-type plug as the Plug Mini (EU) in pySwitchbot
  'Plug Mini (IT)': 'WoPlugMiniEU',
  // Plug Mini (EU) relay with production metering in pySwitchbot (SwitchbotOutdoorPlug)
  'Outdoor Plug (EU)': 'WoPlugMiniEU',
  'Outdoor Plug': 'WoPlugMiniEU',
  'Meter': 'WoSensorTH',
  'Meter Plus': 'WoSensorTHPlus',
  'WoMeterPlus': 'WoSensorTHPlus',
  'Meter Pro': 'WoSensorTHPro',
  'Meter Pro (CO2)': 'WoSensorTHProCO2',
  'WoTHPc': 'WoSensorTHProCO2',
  'Indoor/Outdoor Thermo-Hygrometer': 'WoIOSensorTH',
  'Outdoor Meter': 'WoIOSensorTH',
  'WoIOSensor': 'WoIOSensorTH',
  'WoIOSensorTH': 'WoIOSensorTH',
  'Lock': 'WoSmartLock',
  'Lock Lite': 'WoSmartLockLite',
  'Lock Pro': 'WoSmartLockPro',
  'Lock Pro WiFi': 'WoSmartLockProWiFi',
  // OpenAPI deviceType names (SwitchBotAPI device pages)
  'Smart Lock': 'WoSmartLock',
  'Smart Lock Pro': 'WoSmartLockPro',
  'Smart Lock Pro Wifi': 'WoSmartLockProWiFi',
  'Smart Lock Ultra': 'WoSmartLockUltra',
  'Lock Ultra': 'WoSmartLockUltra', // deviceType in the Lock Ultra status response
  'Lock Ultra Max': 'WoSmartLockUltra',
  'Smart Lock Ultra Max': 'WoSmartLockUltra',
  'UWB Lock': 'WoSmartLockUltra',
  'Smart Lock UWB': 'WoSmartLockUltra',
  'Lock Nano': 'WoSmartLockNano',
  'Smart Lock Nano': 'WoSmartLockNano',
  'Lock Vision': 'WoSmartLockVision',
  'Lock Vision Pro': 'WoSmartLockVisionPro',
  'Keypad': 'WoKeypad',
  'Keypad Touch': 'WoKeypad',
  'Keypad Vision': 'WoKeypadVision',
  'SwitchBot Keypad Vision': 'WoKeypadVision',
  'Keypad Vision Pro': 'WoKeypadVisionPro',
  'SwitchBot Keypad Vision Pro': 'WoKeypadVisionPro',
  'Motion Sensor': 'WoPresence',
  'Contact Sensor': 'WoContact',
  'Ceiling Light': 'WoCeilingLight',
  'Ceiling Light Pro': 'WoCeilingLight',
  'WoCeilingPro': 'WoCeilingLight',
  'Strip Light': 'WoStrip',
  'Strip Light 3': 'WoStripLight3',
  'SwitchBot Strip Light 3': 'WoStripLight3',
  'Color Bulb': 'WoBulb',
  'Floor Lamp': 'WoFloorLamp',
  'SwitchBot Floor Lamp': 'WoFloorLamp',
  'RGBICWW Strip Light': 'WoRGBICWWStripLight',
  'SwitchBot RGBICWW Strip Light': 'WoRGBICWWStripLight',
  // Same OpenAPI commands as the RGBICWW Strip Light: turnOn/turnOff/toggle, setBrightness, setColor, setColorTemperature
  'Permanent Outdoor Lights': 'WoRGBICWWStripLight',
  'RGBICWW Floor Lamp': 'WoRGBICWWFloorLamp',
  'SwitchBot RGBICWW Floor Lamp': 'WoRGBICWWFloorLamp',
  'Art Frame': 'WoArtFrame',
  'AI Art Frame': 'WoArtFrame',
  'SwitchBot Art Frame': 'WoArtFrame',
  // S1 and S1 Plus use the original start/stop/dock OpenAPI commands, unlike the S10/S20
  'Robot Vacuum Cleaner S1': 'WoVacuum',
  'Robot Vacuum Cleaner S1 Plus': 'WoVacuum',
  'Robot Vacuum Cleaner K10 Plus': 'WoVacuumK10Plus',
  'Robot Vacuum Cleaner K10+': 'WoVacuumK10Plus',
  'Robot Vacuum Cleaner K10+ Pro': 'WoVacuumK10Pro',
  'Robot Vacuum Cleaner K11+': 'WoVacuumK11Plus',
  'Robot Vacuum Cleaner K20': 'WoVacuumK20',
  'Robot Vacuum Cleaner K20 Plus Pro': 'WoVacuumK20',
  'Robot Vacuum Cleaner S10': 'WoVacuumS10',
  'Robot Vacuum Cleaner S20': 'WoVacuumS20',
  'Humidifier': 'WoHumi',
  'Humidifier 2': 'WoHumi2',
  'Evaporative Humidifier': 'WoHumi2',
  'Evaporative Humidifier (Auto-refill)': 'WoHumi2',
  'SwitchBot Evaporative Humidifier (Auto-refill)': 'WoHumi2',
  'Blind Tilt': 'WoBlindTilt',
  'Hub 2': 'WoHub2',
  'Hub 3': 'WoHub3',
  'SwitchBot Hub 3': 'WoHub3',
  'Hub 4': 'WoHub4',
  'Hub4': 'WoHub4',
  'SwitchBot Hub 4': 'WoHub4',
  'Hub Mini': 'WoHub2',
  'WoLinkMini': 'WoHub2',
  'HubMini Matter': 'WoHubMiniMatter',
  'WoLinkMatter': 'WoHubMiniMatter',
  'SwitchBot HubMini Matter': 'WoHubMiniMatter',
  'Hub Plus': 'WoHub2',
  'Hub': 'WoHub2',
  'Remote': 'WoRemote',
  'Battery Circulator Fan': 'WoCirculatorFan',
  'Circulator Fan': 'WoCirculatorFan',
  'Battery Circulator Fan 2 Pro': 'WoCirculatorFan',
  'Standing Fan': 'WoCirculatorFan',
  'USB Circulator Fan': 'WoCirculatorFan',
  'Smart Thermostat Radiator': 'WoSmartThermostatRadiator',
  'Smart Radiator Thermostat': 'WoSmartThermostatRadiator',
  'Thermostat Radiator': 'WoSmartThermostatRadiator',
  'Radiator Thermostat': 'WoSmartThermostatRadiator',
  'Climate Panel': 'WoClimatePanel',
  'Home Climate Panel': 'WoClimatePanel',
  'Smart Climate Panel': 'WoClimatePanel',
  'Air Purifier': 'WoAirPurifier',
  'Air Purifier Table': 'WoAirPurifierTable',
  'Air Purifier VOC': 'WoAirPurifier',
  'Air Purifier Table PM2.5': 'WoAirPurifierTable',
  'Air Purifier Table VOC': 'WoAirPurifierTable',
  'Water Leak Detector': 'WoLeak',
  'Presence Sensor': 'WoPresence',
  'Relay Switch 1PM': 'WoRelaySwitch1PM',
  'Relay Switch 1': 'WoRelaySwitch1',
  'Relay Switch 2PM': 'WoRelaySwitch2PM',
  'Garage Door Opener': 'WoGarageDoorOpener',
  'K10+ Pro Combo': 'WoVacuumK10ProCombo',
  'Robot Vacuum Cleaner K10+ Pro Combo': 'WoVacuumK10ProCombo',
  // User-reported unknown device types
  'Air Purifier PM2.5': 'WoAirPurifierPM25',
  'K10+': 'WoVacuumK10Plus',
  'K10+ Pro': 'WoVacuumK10Pro',
  'RGBIC Neon Wire Rope Light': 'WoRGBICNeonWireRopeLight',
  'RGBIC Neon Rope Light': 'WoRGBICNeonWireRopeLight',
  'Candle Warmer Lamp': 'WoCandleWarmerLamp',
  'Pan/Tilt Cam Plus 3K': 'WoPanTiltCamPlus3K',
  'remote with screen': 'WoRemoteWithScreen',
  'AI Hub': 'WoAIHub',
  'Water Detector': 'WoWaterDetector',
} as const

/**
 * Normalise a device type string so the same model resolves regardless of
 * which discovery path reported it.
 *
 * `DEVICE_CLASS_MAP` is keyed by the BLE display names, for example
 * `'Meter Pro (CO2)'`. The OpenAPI `deviceType` field uses compact spellings
 * for the same models, for example `'MeterPro(CO2)'`. Lowercasing and removing
 * spaces, underscores and hyphens maps both spellings onto one key.
 */
export function normalizeDeviceTypeKey(deviceType: string): string {
  return String(deviceType ?? '').toLowerCase().replace(/[\s_-]+/g, '')
}

const NORMALIZED_DEVICE_CLASS_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(DEVICE_CLASS_MAP).map(([key, value]) => [normalizeDeviceTypeKey(key), value]),
)

/**
 * Resolve the device class name for a BLE display name or an OpenAPI
 * `deviceType`. An exact match wins; otherwise the normalised form is used.
 * Returns `undefined` for models that are genuinely unsupported.
 */
export function resolveDeviceClassName(deviceType: string): string | undefined {
  return DEVICE_CLASS_MAP[deviceType] ?? NORMALIZED_DEVICE_CLASS_MAP[normalizeDeviceTypeKey(deviceType)]
}

/**
 * Default configuration values
 */
export const DEFAULTS = {
  logLevel: 2, // WARN
  scanTimeout: BLE_SCAN_TIMEOUT,
  connectTimeout: BLE_CONNECT_TIMEOUT,
  commandTimeout: BLE_COMMAND_TIMEOUT,
  enableBLE: true,
  enableFallback: true,
  baseURL: DEFAULT_BASE_URL,
  enableConnectionIntelligence: true,
  enableCircuitBreaker: true,
  enableRetry: true,
  maxRetryAttempts: 3,
  retryInitialDelayMs: 100,
  retryMaxDelayMs: 5000,
} as const

/**
 * Platform detection
 */
export const IS_LINUX = process.platform === 'linux'
export const IS_MACOS = process.platform === 'darwin'
export const BLE_SUPPORTED = IS_LINUX || IS_MACOS
