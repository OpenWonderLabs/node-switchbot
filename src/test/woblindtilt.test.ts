import * as Noble from '@stoprocent/noble'
import { beforeEach, describe, it } from 'vitest'

import { WoBlindTilt } from '../device/woblindtilt.js'

describe('woBlindTilt', () => {
  let woBlindTilt: WoBlindTilt

  beforeEach(() => {
    const peripheral = {} // Replace with the actual peripheral object
    woBlindTilt = new WoBlindTilt(peripheral as Noble.Peripheral, Noble) // Replace 'noble' with the actual Noble object
  })

  describe('pause', () => {
    it('should pause the blind tilt operation', async () => {
      // Mock the _operateBlindTilt method
      const operateBlindTiltMock = jest.spyOn(woBlindTilt, 'operateBlindTilt')
        .mockResolvedValueOnce(undefined)

      await woBlindTilt.pause()

      expect(operateBlindTiltMock).toHaveBeenCalledWith([0x57, 0x0F, 0x45, 0x01, 0x00, 0xFF])
    })

    it('should handle errors correctly', async () => {
      // Mock the _operateBlindTilt method to throw an error
      jest.spyOn(woBlindTilt, 'operateBlindTilt')
        .mockRejectedValueOnce(new Error('Operation failed') as never)

      await expect(woBlindTilt.pause()).rejects.toThrow('Operation failed')
    })
  })
})
