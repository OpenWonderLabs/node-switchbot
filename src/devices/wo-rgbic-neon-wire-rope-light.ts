import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoRGBICNeonWireRopeLight extends SwitchBotDevice {
  async getStatus(): Promise<DeviceStatus> {
    throw new Error('WoRGBICNeonWireRopeLight.getStatus not implemented')
  }
}
