import type { DeviceStatus } from '../types/index.js'
import { SwitchBotDevice } from './base.js'

export class WoAirPurifierPM25 extends SwitchBotDevice {
  async getStatus(): Promise<DeviceStatus> {
    throw new Error('WoAirPurifierPM25.getStatus not implemented')
  }
}
