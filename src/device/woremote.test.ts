import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types.js'
import { WoRemote } from './woremote.js'

describe('woRemote', () => {
  describe('parseServiceData', () => {
    it('should return parsed data when serviceData length is 9', async () => {
      const serviceData = Buffer.from([0x7F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
      const emitLog = vi.fn()

      const result = await WoRemote.parseServiceData(serviceData, emitLog)

      expect(result).toEqual({
        model: SwitchBotBLEModel.Remote,
        modelName: SwitchBotBLEModelName.Remote,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.Remote,
        battery: 127,
      })
      expect(emitLog).not.toHaveBeenCalled()
    })

    it('should return null and log error when serviceData length is not 9', async () => {
      const serviceData = Buffer.from([0x7F, 0x00, 0x00])
      const emitLog = vi.fn()

      const result = await WoRemote.parseServiceData(serviceData, emitLog)

      expect(result).toBeNull()
      expect(emitLog).toHaveBeenCalledWith('debugerror', '[parseServiceDataForWoRemote] Buffer length 3 !== 9!')
    })
  })
})
