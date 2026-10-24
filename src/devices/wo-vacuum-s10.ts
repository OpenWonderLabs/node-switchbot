/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-vacuum-s10.ts: SwitchBot v4.0.0 - S10 Vacuum Device
 */

import { WoVacuum } from './wo-vacuum.js'

/**
 * Robot Vacuum Cleaner S10
 */
export class WoVacuumS10 extends WoVacuum {
  /** OpenAPI `startClean`: sweep once at fan level 1 */
  protected override apiCleanCommand(): { command: string, parameter?: unknown } {
    return { command: 'startClean', parameter: { action: 'sweep', param: { fanLevel: 1, waterLevel: 1, times: 1 } } }
  }
}
