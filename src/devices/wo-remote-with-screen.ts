import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoRemoteWithScreen extends SwitchBotDevice {
  async getStatus(): Promise<DeviceStatus> {
    throw new Error('WoRemoteWithScreen.getStatus not implemented')
  }
}
