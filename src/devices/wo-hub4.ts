/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-hub4.ts: SwitchBot Hub 4
 */

import { WoHub3 } from './wo-hub3.js'

/**
 * Hub 4. pySwitchbot parses it like the Hub 3, with a 20-step light level instead of lux.
 */
export class WoHub4 extends WoHub3 {}
