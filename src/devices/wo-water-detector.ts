import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoWaterDetector extends SwitchBotDevice {
  async getStatus(): Promise<DeviceStatus> {
    throw new Error('WoWaterDetector.getStatus not implemented')
  }
}
