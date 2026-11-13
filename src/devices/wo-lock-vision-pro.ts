/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-lock-vision-pro.ts: SwitchBot v4.0.0 - Smart Lock Vision Pro Device
 */

import type { LockModel } from '../settings.js'

import { WoSmartLockPro } from './wo-lock-pro.js'

/**
 * Smart Lock Vision Pro Device (with camera and unlatch support)
 */
export class WoSmartLockVisionPro extends WoSmartLockPro {
  protected override readonly defaultLockModel: LockModel = 'Lock Vision Pro'
}
