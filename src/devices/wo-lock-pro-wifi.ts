/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-lock-pro-wifi.ts: SwitchBot v4.0.0 - Smart Lock Pro WiFi Device
 */

import type { LockModel } from '../settings.js'

import { WoSmartLockPro } from './wo-lock-pro.js'

/**
 * Smart Lock Pro WiFi Device (with WiFi connectivity and unlatch support)
 */
export class WoSmartLockProWiFi extends WoSmartLockPro {
  protected override readonly defaultLockModel: LockModel = 'Lock Pro WiFi'
}
