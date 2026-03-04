import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoCandleWarmerLamp extends SwitchBotDevice {
  async getStatus(): Promise<DeviceStatus> {
    throw new Error('WoCandleWarmerLamp.getStatus not implemented')
  }
}
