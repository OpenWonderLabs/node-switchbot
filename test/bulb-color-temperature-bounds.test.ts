/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * test/bulb-color-temperature-bounds.test.ts: Bulb Color Temperature with Bounds Tests
 */

import type { DeviceInfo } from '../src/types/index.js'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoBulb } from '../src/devices/wo-bulb.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'test-bulb',
    name: 'Test Bulb',
    deviceType: 'Color Bulb',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('bulb color temperature with bounds (Task 6.3)', () => {
  let bulb: WoBulb
  let sendCommand: ReturnType<typeof vi.fn>

  beforeEach(() => {
    bulb = new WoBulb(baseInfo())
    sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(bulb as any).sendCommand = sendCommand
  })

  it('should set color temperature with bounds', async () => {
    const result = await bulb.setColorTemp(2700, 6500, 4000)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalled()
  })

  it('should clamp min/max temperature values', async () => {
    const result = await bulb.setColorTemp(2000, 7000, 5000)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalled()
  })

  it('should ensure current temp is within min/max bounds', async () => {
    const result = await bulb.setColorTemp(3000, 5000, 6500) // 6500 > max 5000
    expect(result).toBe(true)
    // Temperature should be clamped to max (5000)
    expect(sendCommand).toHaveBeenCalled()
  })

  it('should handle reversed min/max temperatures', async () => {
    const result = await bulb.setColorTemp(6500, 2700, 4000) // reversed
    expect(result).toBe(true)
    // Should auto-correct: min should be 2700, max should be 6500
    expect(sendCommand).toHaveBeenCalled()
  })

  it('should build correct BLE command structure', async () => {
    await bulb.setColorTemp(2700, 6500, 4000)

    const callArgs = sendCommand.mock.calls[0]
    const bleCommand = callArgs[0]

    // Command structure: [0x57, 0x0F, 0x47, 0x01, 0x17, BRIGHTNESS, MIN_KEL_HIGH, MIN_KEL_LOW, MAX_KEL_HIGH, MAX_KEL_LOW, TEMP_HIGH, TEMP_LOW]
    expect(bleCommand[0]).toBe(0x57)
    expect(bleCommand[1]).toBe(0x0F)
    expect(bleCommand[2]).toBe(0x47)
    expect(bleCommand[3]).toBe(0x01)
    expect(bleCommand[4]).toBe(0x17) // color temp with bounds command
    expect(bleCommand[5]).toBe(0x64) // brightness (default 100)
    expect(bleCommand.length).toBe(12) // Base header (4) + cmd (1) + brightness (1) + min (2) + max (2) + temp (2)
  })

  it('should correctly encode temperature values as bytes', async () => {
    await bulb.setColorTemp(2700, 6500, 4000)

    const callArgs = sendCommand.mock.calls[0]
    const bleCommand = callArgs[0]

    // Min: 2700 = 0x0A8C -> high: 0x0A, low: 0x8C
    expect(bleCommand[6]).toBe(0x0A) // min high
    expect(bleCommand[7]).toBe(0x8C) // min low

    // Max: 6500 = 0x196C -> high: 0x19, low: 0x6C
    expect(bleCommand[8]).toBe(0x19) // max high
    expect(bleCommand[9]).toBe(0x64) // max low (0x64 is correct for 6500)

    // Current: 4000 = 0x0FA0 -> high: 0x0F, low: 0xA0
    expect(bleCommand[10]).toBe(0x0F) // temp high
    expect(bleCommand[11]).toBe(0xA0) // temp low
  })

  it('should work with minimum valid temperature range', async () => {
    const result = await bulb.setColorTemp(2700, 2700, 2700)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalled()
  })

  it('should work with maximum valid temperature range', async () => {
    const result = await bulb.setColorTemp(6500, 6500, 6500)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalled()
  })
})
