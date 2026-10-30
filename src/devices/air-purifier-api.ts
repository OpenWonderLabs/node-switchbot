/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/air-purifier-api.ts: OpenAPI parameters for air purifiers
 */

import type { CommandResult } from '../types/index.js'

import { Buffer } from 'node:buffer'

import { CommandFailedError } from '../errors.js'
import { DEVICE_COMMANDS } from '../settings.js'

/**
 * OpenAPI `setMode` parameter for air purifiers: `{"mode": mode_int, "fanGear": fan_level_int}`,
 * where mode is 1 (normal/fan), 2 (auto), 3 (sleep) or 4 (pet), and fanGear (1-3) applies only
 * to mode 1. OpenAPI has no separate fan speed or preset command; both are `setMode`.
 */
export interface AirPurifierAPIMode {
  mode: 1 | 2 | 3 | 4
  fanGear?: number
}

/** `setMode('auto' | 'manual' | 'sleep')` */
export function airPurifierModeParameter(mode: 'auto' | 'manual' | 'sleep'): AirPurifierAPIMode {
  return { auto: { mode: 2 }, manual: { mode: 1 }, sleep: { mode: 3 } }[mode] as AirPurifierAPIMode
}

/** `setFanSpeed(1-4)`; OpenAPI fan gears go up to 3 */
export function airPurifierFanParameter(speed: number): AirPurifierAPIMode {
  return { mode: 1, fanGear: Math.min(3, Math.max(1, Math.round(speed))) }
}

/** `setPresetMode(level_1 | level_2 | level_3 | auto | sleep | pet)` */
export function airPurifierPresetParameter(preset: 'level_1' | 'level_2' | 'level_3' | 'auto' | 'sleep' | 'pet'): AirPurifierAPIMode {
  return {
    level_1: { mode: 1, fanGear: 1 },
    level_2: { mode: 1, fanGear: 2 },
    level_3: { mode: 1, fanGear: 3 },
    auto: { mode: 2 },
    sleep: { mode: 3 },
    pet: { mode: 4 },
  }[preset] as AirPurifierAPIMode
}

type SendOnce = (command: readonly number[], options: { retry?: boolean, validateResponse?: boolean }) => Promise<CommandResult>

/**
 * Reset an air purifier's filter usage over BLE and confirm it, as pySwitchbot 3.1.0
 * `reset_filter_usage` does: send the reset once (never retried), require status 0x01, then read
 * the usage back and succeed only if it is 0 hours. Throws CommandFailedError otherwise.
 *
 * OpenAPI has no filter reset command. On an encrypted device the transport decrypts the reply
 * (setKey with key id and key). An encryption key without a key id uses the legacy scheme, whose
 * replies cannot be read, so the reset is refused before anything is sent.
 */
export async function resetAirPurifierFilterUsage(device: { encrypted: boolean, hasBLE: boolean, send: SendOnce }): Promise<boolean> {
  if (!device.hasBLE) {
    throw new CommandFailedError('Filter usage reset needs a BLE connection (OpenAPI has no reset command)', 'ble')
  }
  if (device.encrypted) {
    throw new CommandFailedError('Filter usage reset cannot be verified with an encryption key but no key id: set both with setKey()', 'ble')
  }

  const reset = await device.send(DEVICE_COMMANDS.AIR_PURIFIER.RESET_FILTER_USAGE, { retry: false, validateResponse: false })
  const resetReply = Buffer.isBuffer(reset.data) ? reset.data : undefined
  if (!reset.success || resetReply?.[0] !== 0x01) {
    throw new CommandFailedError(`Filter usage reset was rejected${reset.error ? `: ${reset.error}` : ''}`, 'ble')
  }

  const read = await device.send(DEVICE_COMMANDS.AIR_PURIFIER.READ_FILTER_USAGE, { validateResponse: false })
  const reply = Buffer.isBuffer(read.data) ? read.data : undefined
  if (!read.success || !reply || reply.length < 3) {
    throw new CommandFailedError('Reset was sent, but filter usage could not be verified. Check the device before retrying', 'ble')
  }
  if (reply[0] !== 0x01) {
    throw new CommandFailedError('Filter usage read was rejected', 'ble')
  }
  const usedHours = reply.readUInt16BE(1)
  if (usedHours !== 0) {
    throw new CommandFailedError(`Reset was sent, but the device still reports ${usedHours} used hours. Check the device before retrying`, 'ble')
  }
  return true
}
