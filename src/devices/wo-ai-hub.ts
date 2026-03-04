import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoAIHub extends SwitchBotDevice {
  async getStatus(): Promise<DeviceStatus> {
    throw new Error('WoAIHub.getStatus not implemented')
  }
}
