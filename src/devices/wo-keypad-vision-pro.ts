/**
 * WoKeypadVisionPro device class for SwitchBot Keypad Vision Pro
 * Extends base WoKeypad functionality for lock keypad operations
 */
import type { KeypadStatus } from '../types/device.js'

import { WoKeypad } from './wo-keypad.js'

/**
 * SwitchBot Keypad Vision Pro device
 * @extends WoKeypad
 */
export class WoKeypadVisionPro extends WoKeypad {
  /**
   * Get keypad status (inherited from WoKeypad)
   * @returns Promise resolving to KeypadStatus
   */
  async getStatus(): Promise<KeypadStatus> {
    return super.getStatus()
  }
}
