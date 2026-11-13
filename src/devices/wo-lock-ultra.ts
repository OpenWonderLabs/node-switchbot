/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-lock-ultra.ts: SwitchBot Lock Ultra, Lock Ultra Max and UWB Lock
 */

import type { LockModel } from '../settings.js'

import { Buffer } from 'node:buffer'

import { LOCK_QUICK_KEY_GET, LOCK_QUICK_KEY_SET_PREFIX } from '../settings.js'
import { WoSmartLockPro } from './wo-lock-pro.js'

/**
 * Action of the Lock Ultra Quick Key: the 2-bit function field of the Quick Key config byte
 * (pySwitchbot QuickKeyFunction)
 */
export enum QuickKeyFunction {
  LockOnly = 0b00,
  UnlockOnly = 0b01,
  LockAndUnlock = 0b10,
}

/** Lock Ultra Quick Key and basic property settings */
export interface QuickKeySettings {
  /** The config byte as received */
  raw: number
  light: boolean
  sound: boolean
  manualUnlockLinkage: boolean
  /** Quick Key enabled */
  enabled: boolean
  /** Quick Key triggers on a double press instead of a single press */
  doublePress: boolean
  /** undefined for an unknown function value */
  function?: QuickKeyFunction
  /** 0 high, 1 normal, 2 quiet; undefined when the reply does not include it */
  motorSpeed?: number
}

/** Quick Key settings to change; settings left undefined are not changed */
export interface QuickKeyUpdate {
  light?: boolean
  sound?: boolean
  manualUnlockLinkage?: boolean
  enabled?: boolean
  doublePress?: boolean
  function?: QuickKeyFunction
  /** 0 high, 1 normal, 2 quiet, or 0xFF (default) to keep the current speed */
  motorSpeed?: 0 | 1 | 2 | 0xFF
}

/** Command status bytes that mean success: 0x01, or 0x06 for success with a low battery */
const QUICK_KEY_OK = new Set([0x01, 0x06])

const BOOLEAN_BITS: Array<[keyof QuickKeyUpdate & keyof QuickKeySettings, number]> = [
  ['light', 7],
  ['sound', 6],
  ['manualUnlockLinkage', 4],
  ['enabled', 3],
  ['doublePress', 2],
]

/** Decode the Quick Key config byte (pySwitchbot `_parse_quick_key`) */
export function parseQuickKeyConfig(config: number): QuickKeySettings {
  const functionBits = config & 0b11
  return {
    raw: config,
    light: (config & (1 << 7)) !== 0,
    sound: (config & (1 << 6)) !== 0,
    manualUnlockLinkage: (config & (1 << 4)) !== 0,
    enabled: (config & (1 << 3)) !== 0,
    doublePress: (config & (1 << 2)) !== 0,
    function: functionBits in QuickKeyFunction ? functionBits as QuickKeyFunction : undefined,
  }
}

/**
 * Build the Quick Key write command (pySwitchbot `set_quick_key`):
 * `57 0f 4e 04 01 00 <update> <value> <speed>`. Each set bit of the update byte selects that
 * property for writing.
 */
export function buildQuickKeyCommand(update: QuickKeyUpdate): Buffer {
  const motorSpeed = update.motorSpeed ?? 0xFF
  if (![0, 1, 2, 0xFF].includes(motorSpeed)) {
    throw new RangeError(`motorSpeed must be 0 (high), 1 (normal), 2 (quiet) or 0xFF (keep), got ${motorSpeed}`)
  }
  let updateFields = 0
  let value = 0
  for (const [setting, bit] of BOOLEAN_BITS) {
    const requested = update[setting]
    if (requested !== undefined) {
      updateFields |= 1 << bit
      value |= Number(requested) << bit
    }
  }
  if (update.function !== undefined) {
    updateFields |= 1 << 1
    value |= update.function
  }
  if (updateFields === 0 && motorSpeed === 0xFF) {
    throw new RangeError('setQuickKey needs at least one setting to change')
  }
  return Buffer.from([...LOCK_QUICK_KEY_SET_PREFIX, updateFields, value, motorSpeed])
}

/**
 * Lock Ultra, Lock Ultra Max and UWB Lock. They share Lock Pro's commands with their own lock
 * model byte; the Lock Ultra adds half lock and the Quick Key.
 */
export class WoSmartLockUltra extends WoSmartLockPro {
  protected override readonly defaultLockModel: LockModel = 'Lock Ultra'

  /**
   * Half lock (Lock Ultra only)
   */
  async halfLock(): Promise<boolean> {
    const command = this.lockCommands.halfLock
    if (!command) {
      throw new Error(`Half lock is not supported on the ${this.lockModel}`)
    }
    const result = await this.sendCommand(command, 'halfLock')
    return result.success
  }

  private assertQuickKeySupported(): void {
    if (this.lockModel !== 'Lock Ultra') {
      throw new Error(`Quick Key is not supported on the ${this.lockModel}`)
    }
  }

  /**
   * Read the Quick Key and basic property settings (Lock Ultra only, BLE only).
   * Returns undefined when the lock rejects the request or the reply has no config byte.
   */
  async getQuickKey(): Promise<QuickKeySettings | undefined> {
    this.assertQuickKeySupported()
    const result = await this.sendBLECommand(LOCK_QUICK_KEY_GET, false, { validateResponse: false })
    if (!result.success) {
      throw new Error(`Failed to read Quick Key settings: ${result.error}`)
    }
    const reply: Buffer | undefined = result.data
    if (!reply || !QUICK_KEY_OK.has(reply[0]) || reply.length < 2) {
      this.logger.error('Invalid Quick Key response', reply?.toString('hex'))
      return undefined
    }
    return { ...parseQuickKeyConfig(reply[1]), motorSpeed: reply.length > 3 ? reply[3] : undefined }
  }

  /**
   * Change any combination of Quick Key and basic property settings (Lock Ultra only, BLE only).
   * Returns true when the lock accepts the command and its reply confirms every requested
   * setting. The motor speed is confirmed by the status byte only.
   */
  async setQuickKey(update: QuickKeyUpdate): Promise<boolean> {
    this.assertQuickKeySupported()
    const command = buildQuickKeyCommand(update)
    const result = await this.sendBLECommand(command, false, { validateResponse: false })
    if (!result.success) {
      throw new Error(`Failed to write Quick Key settings: ${result.error}`)
    }
    const reply: Buffer | undefined = result.data
    if (!reply || !QUICK_KEY_OK.has(reply[0])) {
      this.logger.error('Quick Key command failed', reply?.toString('hex'))
      return false
    }
    if (reply.length < 2) {
      this.logger.error('Quick Key reply is missing the config byte', reply.toString('hex'))
      return false
    }
    const confirmed = parseQuickKeyConfig(reply[1])
    const mismatches = [...BOOLEAN_BITS.map(([setting]) => setting), 'function' as const]
      .filter(setting => update[setting] !== undefined && confirmed[setting] !== update[setting])
    for (const setting of mismatches) {
      this.logger.error(`Quick Key ${setting} was not applied`, { requested: update[setting], reported: confirmed[setting] })
    }
    return mismatches.length === 0
  }
}
