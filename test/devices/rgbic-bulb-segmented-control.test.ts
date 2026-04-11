/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * test/rgbic-bulb-segmented-control.test.ts: RGBIC Bulb Segmented Control Tests
 */

import type { DeviceInfo } from '../../src/types/index.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoRGBICBulb } from '../../src/devices/wo-rgbic-bulb.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'test-rgbic',
    name: 'Test RGBIC Bulb',
    deviceType: 'RGBICWW Strip Light',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('rgbic bulb segmented control (Task 6.2)', () => {
  let rgbic: WoRGBICBulb
  let sendCommand: ReturnType<typeof vi.fn>

  beforeEach(() => {
    rgbic = new WoRGBICBulb(baseInfo())
    sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(rgbic as any).sendCommand = sendCommand
  })

  describe('setSegmentColor', () => {
    it('should set color for individual segment', async () => {
      const result = await rgbic.setSegmentColor(0, 255, 0, 0) // Red segment 0
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([0x57, 0x0F, 0x47, 0x01, 0x13, 0, 255, 0, 0]),
        'setSegmentColor',
        'seg0:255:0:0',
      )
    })

    it('should clamp segment color values', async () => {
      // Values > 255 should be clamped
      const result = await rgbic.setSegmentColor(0, 300, -50, 256)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([0x57, 0x0F, 0x47, 0x01, 0x13, 0, 255, 0, 255]),
        'setSegmentColor',
        'seg0:255:0:255',
      )
    })

    it('should clamp segment id value', async () => {
      // Segment ID > 255 should be clamped to 255
      const result = await rgbic.setSegmentColor(300, 100, 100, 100)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([255]), // segment id clamped to 255
        'setSegmentColor',
        'seg255:100:100:100',
      )
    })

    it('should handle full RGB spectrum on segment', async () => {
      const result = await rgbic.setSegmentColor(1, 0, 128, 255) // Blue-green
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([0x57, 0x0F, 0x47, 0x01, 0x13, 1, 0, 128, 255]),
        'setSegmentColor',
        'seg1:0:128:255',
      )
    })

    it('should support multiple segments sequentially', async () => {
      await rgbic.setSegmentColor(0, 255, 0, 0) // Red
      await rgbic.setSegmentColor(1, 0, 255, 0) // Green
      await rgbic.setSegmentColor(2, 0, 0, 255) // Blue

      const calls = sendCommand.mock.calls
      expect(calls).toHaveLength(3)
      expect(calls[0][2]).toBe('seg0:255:0:0')
      expect(calls[1][2]).toBe('seg1:0:255:0')
      expect(calls[2][2]).toBe('seg2:0:0:255')
    })
  })

  describe('setSegmentEffect', () => {
    it('should set segment effect with speed control', async () => {
      const result = await rgbic.setSegmentEffect(1, 'rainbow', 75)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([0x57, 0x0F, 0x47, 0x01, 0x14, 1, 0x06, 75]), // rainbow = 0x06
        'setSegmentEffect',
        'seg1:rainbow:75',
      )
    })

    it('should support RGBIC-specific effects', async () => {
      const rgbicEffects = [
        'segment_cycle',
        'segment_wave',
        'segment_chase',
        'segment_strobe',
        'segment_twinkle',
      ]

      for (const effect of rgbicEffects) {
        const result = await rgbic.setSegmentEffect(0, effect, 50)
        expect(result).toBe(true)
      }
    })

    it('should throw on unsupported RGBIC effect', async () => {
      await expect(rgbic.setSegmentEffect(0, 'unsupported_effect', 50)).rejects.toThrow(
        'Unsupported RGBIC effect: unsupported_effect',
      )
    })

    it('should clamp segment speed values', async () => {
      // Speed > 100 should be clamped to 100
      const result = await rgbic.setSegmentEffect(0, 'rainbow', 150)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([100]), // speed clamped to 100
        'setSegmentEffect',
        'seg0:rainbow:100',
      )
    })

    it('should enforce minimum speed value', async () => {
      // Speed < 1 should be clamped to 1
      const result = await rgbic.setSegmentEffect(0, 'rainbow', -50)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([1]), // speed clamped to 1
        'setSegmentEffect',
        'seg0:rainbow:1',
      )
    })

    it('should handle effect names case-insensitively', async () => {
      const result = await rgbic.setSegmentEffect(0, 'RAINBOW', 50)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalled()
    })
  })

  describe('inheritance and compatibility', () => {
    it('should support standard bulb effects on RGBIC', async () => {
      const standardEffects = [
        'christmas',
        'sunset',
        'rainbow',
        'ocean',
        'flicker',
      ]

      for (const effect of standardEffects) {
        const result = await rgbic.setEffect(effect, 80)
        expect(result).toBe(true)
      }
    })

    it('should support color temperature bounds inherited from WoBulb', async () => {
      const result = await rgbic.setColorTemp(2700, 6500, 4000)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalled()
    })

    it('should support basic color setting inherited from WoBulb', async () => {
      const result = await rgbic.setColor(255, 128, 64)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalled()
    })

    it('should support brightness control inherited from WoBulb', async () => {
      const result = await rgbic.setBrightness(75)
      expect(result).toBe(true)
      expect(sendCommand).toHaveBeenCalled()
    })
  })

  describe('device instantiation', () => {
    it('should create WoRGBICBulb with all segment commands', () => {
      expect(rgbic).toBeDefined()
      expect(typeof rgbic.setSegmentColor).toBe('function')
      expect(typeof rgbic.setSegmentEffect).toBe('function')
      expect(typeof rgbic.setColorTemp).toBe('function')
      expect(typeof rgbic.setEffect).toBe('function')
      expect(typeof rgbic.setColor).toBe('function')
      expect(typeof rgbic.setBrightness).toBe('function')
    })
  })
})
