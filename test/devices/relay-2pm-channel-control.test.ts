import type { DeviceInfo } from '../../src/types/index.js'
/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * test/relay-2pm-channel-control.test.ts: Relay Switch 2PM Channel Control Tests
 */
import { Buffer } from 'node:buffer'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WoRelaySwitch2PM } from '../../src/devices/wo-relay-switch-2pm.js'
import { DEVICE_COMMANDS } from '../../src/settings.js'

function baseInfo(): DeviceInfo {
  return {
    id: 'test-relay-2pm',
    name: 'Test Relay 2PM',
    deviceType: 'Relay Switch 2PM',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
  }
}

describe('relay switch 2PM channel control (Task 5.3)', () => {
  let relay: WoRelaySwitch2PM
  let sendCommand: ReturnType<typeof vi.fn>

  beforeEach(() => {
    relay = new WoRelaySwitch2PM(baseInfo())
    sendCommand = vi.fn().mockResolvedValue({ success: true })
    ;(relay as any).sendCommand = sendCommand
  })

  it('should set channel 1 ON', async () => {
    const result = await relay.setChannel1(true)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith(
      Buffer.from(DEVICE_COMMANDS.RELAY.CHANNEL1_ON),
      'setChannel1:true',
    )
  })

  it('should set channel 1 OFF', async () => {
    const result = await relay.setChannel1(false)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith(
      Buffer.from(DEVICE_COMMANDS.RELAY.CHANNEL1_OFF),
      'setChannel1:false',
    )
  })

  it('should set channel 2 ON', async () => {
    const result = await relay.setChannel2(true)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith(
      Buffer.from(DEVICE_COMMANDS.RELAY.CHANNEL2_ON),
      'setChannel2:true',
    )
  })

  it('should set channel 2 OFF', async () => {
    const result = await relay.setChannel2(false)
    expect(result).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith(
      Buffer.from(DEVICE_COMMANDS.RELAY.CHANNEL2_OFF),
      'setChannel2:false',
    )
  })

  it('should verify correct channel command bytes', () => {
    // Verify command constants
    expect(DEVICE_COMMANDS.RELAY.CHANNEL1_ON).toEqual([0x57, 0x0F, 0x50, 0x01, 0x01])
    expect(DEVICE_COMMANDS.RELAY.CHANNEL1_OFF).toEqual([0x57, 0x0F, 0x50, 0x01, 0x02])
    expect(DEVICE_COMMANDS.RELAY.CHANNEL2_ON).toEqual([0x57, 0x0F, 0x50, 0x02, 0x01])
    expect(DEVICE_COMMANDS.RELAY.CHANNEL2_OFF).toEqual([0x57, 0x0F, 0x50, 0x02, 0x02])
  })

  it('should handle both channels independently', async () => {
    await relay.setChannel1(true)
    await relay.setChannel2(false)

    const calls = sendCommand.mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][0]).toEqual(Buffer.from(DEVICE_COMMANDS.RELAY.CHANNEL1_ON))
    expect(calls[1][0]).toEqual(Buffer.from(DEVICE_COMMANDS.RELAY.CHANNEL2_OFF))
  })
})
