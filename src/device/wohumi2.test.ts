import type { NobleTypes } from '../types/types.js'

import { Buffer } from 'node:buffer'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SwitchbotDevice } from '../device.js'
import { WoHumi2 } from '../device/wohumi2.js'

describe('woHumi', () => {
  let wohumi: WoHumi2
  let mockPeripheral: NobleTypes['peripheral']
  let mockNoble: NobleTypes['noble']

  beforeEach(() => {
    mockPeripheral = {} as NobleTypes['peripheral']
    mockNoble = {} as NobleTypes['noble']
    wohumi = new WoHumi2(mockPeripheral, mockNoble)
    vi.spyOn(SwitchbotDevice.prototype, 'command').mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('percentage', () => {
    it('should throw an error if level is less than 0', async () => {
      await expect(wohumi.percentage(-1)).rejects.toThrow('Level must be between 0 and 100')
    })

    it('should throw an error if level is greater than 100', async () => {
      await expect(wohumi.percentage(101)).rejects.toThrow('Level must be between 0 and 100')
    })

    it('should send the correct command for a valid level', async () => {
      const level = 50
      const expectedCommand = Buffer.from(`57010107${level.toString(16).padStart(2, '0')}`, 'hex')
      const operateHumiSpy = vi.spyOn(wohumi as any, 'operateHumi')

      await wohumi.percentage(level)

      expect(operateHumiSpy).toHaveBeenCalledWith(expectedCommand)
    })
  })
})
