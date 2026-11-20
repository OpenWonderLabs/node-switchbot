/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * roller-shade.test.ts: SwitchBot v4.0.0 - Roller Shade Tests
 */

import { describe, expect, it, vi } from 'vitest'

import { WoRollerShade } from '../../src/devices/wo-roller-shade.js'
import { SwitchBot } from '../../src/switchbot.js'

const baseDevice = {
  deviceId: 'api-roller-shade-01',
  deviceName: 'Roller Shade',
  enableCloudService: true,
  hubDeviceId: 'hub-1',
  version: 'V1.0',
}

describe('roller Shade', () => {
  // Remove non-async tests; only use async/await versions
  it('maps Roller Shade device type to WoRollerShade', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Roller Shade',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRollerShade')
  })

  it('maps SwitchBot Roller Shade device type to WoRollerShade', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'SwitchBot Roller Shade',
    })
    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoRollerShade')
  })

  it('inherits curtain control methods from WoCurtain', async () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
    await (switchbot as any).handleAPIDiscovery({
      ...baseDevice,
      deviceType: 'Roller Shade',
    })
    const [device] = switchbot.devices.list()
    expect(device).toHaveProperty('open')
    expect(device).toHaveProperty('close')
    expect(device).toHaveProperty('pause')
    expect(device).toHaveProperty('setPosition')
  })
})

describe('roller Shade commands (pySwitchbot SwitchbotRollerShade)', () => {
  function shade(connectionTypes: Array<'ble' | 'api'> = ['ble']) {
    const device = new WoRollerShade({
      id: 'roller-shade-01',
      name: 'Roller Shade',
      deviceType: 'WoRollerShade',
      connectionTypes,
    })
    const sendCommand = vi.spyOn(device as any, 'sendCommand').mockResolvedValue({ success: true, connectionType: 'ble' })
    const sendBLECommand = vi.spyOn(device as any, 'sendBLECommand').mockResolvedValue({ success: true, connectionType: 'ble' })
    return { device, sendCommand, sendBLECommand }
  }

  it('sends the Roller Shade position command, not the Curtain one', async () => {
    const { device, sendCommand, sendBLECommand } = shade()
    await expect(device.setPosition(63)).resolves.toBe(true)
    // 570f470101 00 01 3f, as in pySwitchbot POSITION_KEYS[0]; OpenAPI setPosition takes the bare position
    expect(sendCommand).toHaveBeenCalledWith([0x57, 0x0F, 0x47, 0x01, 0x01, 0x00, 0x01, 63], 'setPosition', 63)
    expect(sendBLECommand).not.toHaveBeenCalled()
  })

  it('opens to 0 and closes to 100', async () => {
    const { device, sendCommand } = shade()
    await device.open()
    await device.close()
    expect(sendCommand).toHaveBeenNthCalledWith(1, [0x57, 0x0F, 0x47, 0x01, 0x01, 0x00, 0x01, 0x00], 'setPosition', 0)
    expect(sendCommand).toHaveBeenNthCalledWith(2, [0x57, 0x0F, 0x47, 0x01, 0x01, 0x00, 0x01, 0x64], 'setPosition', 100)
  })

  it('stops with the Roller Shade stop command', async () => {
    const { device, sendCommand } = shade()
    await device.pause()
    expect(sendCommand).toHaveBeenCalledWith([0x57, 0x0F, 0x47, 0x01, 0x00, 0x00, 0x01], 'pause')
  })

  it('tries the position-with-mode command over BLE when the plain command fails', async () => {
    const { device, sendCommand, sendBLECommand } = shade()
    sendCommand.mockResolvedValue({ success: false, connectionType: 'ble' })
    vi.spyOn(device, 'hasBLE').mockReturnValue(true)
    await expect(device.setPosition(20, 1)).resolves.toBe(true)
    // 570f470105 00 <mode> <position>, as in pySwitchbot POSITION_KEYS[1]
    expect(sendBLECommand).toHaveBeenCalledWith([0x57, 0x0F, 0x47, 0x01, 0x05, 0x00, 0x01, 20])
  })

  it('clamps the position and rejects an unknown mode', async () => {
    const { device, sendCommand } = shade()
    await device.setPosition(150)
    expect(sendCommand).toHaveBeenCalledWith([0x57, 0x0F, 0x47, 0x01, 0x01, 0x00, 0x01, 100], 'setPosition', 100)
    await expect(device.setPosition(50, 2)).rejects.toThrow(RangeError)
  })
})
