/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-lock-nano.ts: SwitchBot Lock Nano
 */

import type { LockModel } from '../settings.js'

import { WoSmartLockPro } from './wo-lock-pro.js'

/**
 * Lock Nano: Lock Pro commands with its own lock model byte (pySwitchbot)
 */
export class WoSmartLockNano extends WoSmartLockPro {
  protected override readonly defaultLockModel: LockModel = 'Lock Nano'
}
