/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-art-frame.ts: SwitchBot v4.0.0 - Art Frame
 */

import { WoBulb } from './wo-bulb.js'

/**
 * Art Frame Device
 * Uses same logic as Color Bulb, plus the OpenAPI image commands
 */
export class WoArtFrame extends WoBulb {
  /**
   * Show the next image (OpenAPI `next`)
   */
  async nextImage(): Promise<boolean> {
    const result = await this.sendAPICommand('next')
    return result.success
  }

  /**
   * Show the previous image (OpenAPI `previous`)
   */
  async prevImage(): Promise<boolean> {
    const result = await this.sendAPICommand('previous')
    return result.success
  }
}
