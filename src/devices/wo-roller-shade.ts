/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-roller-shade.ts: SwitchBot v4.0.0 - Roller Shade
 */

import { DEVICE_COMMANDS } from '../settings.js'
import { clamp } from '../utils/index.js'
import { WoCurtain } from './wo-curtain.js'

/**
 * Roller Shade Device
 *
 * Status is read like a Curtain, but commands use the Roller Shade command set (`57 0F 47 01`),
 * as in pySwitchbot's `SwitchbotRollerShade`. The Roller Shade rejects the Curtain command
 * (`57 0F 45 01`) with `0x0D`. Positions are as the shade reports them: 0 open, 100 closed.
 */
export class WoRollerShade extends WoCurtain {
  /**
   * Open the shade (position 0). `mode`: 0 performance, 1 quiet.
   */
  override async open(mode = 0): Promise<boolean> {
    return this.moveTo(0, mode)
  }

  /**
   * Close the shade (position 100). `mode`: 0 performance, 1 quiet.
   */
  override async close(mode = 0): Promise<boolean> {
    return this.moveTo(100, mode)
  }

  /**
   * Stop the shade.
   */
  override async pause(): Promise<boolean> {
    const result = await this.sendCommand(DEVICE_COMMANDS.ROLLER_SHADE.PAUSE, 'pause')
    return result.success
  }

  /**
   * Move to a position (0 open, 100 closed). `mode`: 0 performance, 1 quiet.
   */
  override async setPosition(position: number, mode = 0): Promise<boolean> {
    return this.moveTo(position, mode)
  }

  /**
   * pySwitchbot sends the plain position command and the position-with-mode command and
   * succeeds if either is accepted. Here the plain command goes first (with OpenAPI fallback,
   * whose `setPosition` takes the bare position); the mode command is tried over BLE only if it
   * fails.
   */
  private async moveTo(position: number, mode: number): Promise<boolean> {
    if (mode !== 0 && mode !== 1) {
      throw new RangeError(`mode must be 0 (performance) or 1 (quiet), got ${mode}`)
    }
    const target = Math.round(clamp(position, 0, 100))
    const result = await this.sendCommand(
      [...DEVICE_COMMANDS.ROLLER_SHADE.POSITION, target],
      'setPosition',
      target,
    )
    if (result.success || !this.hasBLE()) {
      return result.success
    }
    const withMode = await this.sendBLECommand([...DEVICE_COMMANDS.ROLLER_SHADE.POSITION_WITH_MODE, mode, target])
    return withMode.success
  }
}
