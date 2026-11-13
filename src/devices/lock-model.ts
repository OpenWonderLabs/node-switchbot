/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/lock-model.ts: Which lock model a lock device is, for its BLE commands
 */

import type { LockCommandSet, LockModel } from '../settings.js'

import { LOCK_COMMANDS, LOCK_MODEL_BY_DEVICE_TYPE } from '../settings.js'

/**
 * The lock model for a device type (a node-switchbot or OpenAPI device type name), or `fallback`
 * when the device type does not name a lock model.
 */
export function resolveLockModel(deviceType: string | undefined, fallback: LockModel): LockModel {
  const key = (deviceType ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return LOCK_MODEL_BY_DEVICE_TYPE[key] ?? fallback
}

/** The BLE commands for a lock model */
export function lockCommandsFor(model: LockModel): LockCommandSet {
  return LOCK_COMMANDS[model]
}
