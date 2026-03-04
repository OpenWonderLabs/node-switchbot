import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoPanTiltCamPlus3K extends SwitchBotDevice {
  async getStatus(): Promise<DeviceStatus> {
    throw new Error('WoPanTiltCamPlus3K.getStatus not implemented')
  }
}
