/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * curtain3-features.test.ts: SwitchBot v4.0.0 - Curtain 3 Feature Tests
 */

import { describe, expect, it } from 'vitest'

import { WoCurtain } from '../src/devices/wo-curtain.js'
import { SwitchBot } from '../src/switchbot.js'

describe('curtain 3 Features', () => {
  it('should recognize Curtain3 device type', () => {
    const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })

    ;(switchbot as any).handleAPIDiscovery({
      deviceId: 'curtain3-test-01',
      deviceName: 'Curtain 3',
      deviceType: 'Curtain3',
      enableCloudService: true,
      hubDeviceId: '',
      version: 'V1.0',
    })

    const [device] = switchbot.devices.list()
    expect(device?.constructor.name).toBe('WoCurtain')
    // Device type remains as API device type 'Curtain3'
  })

  it('should have multi-command sequence method', () => {
    const curtain = new WoCurtain({
      id: 'curtain3-01',
      name: 'Test Curtain 3',
      deviceType: 'WoCurtain',
      connectionTypes: ['api'],
    })

    expect(curtain).toHaveProperty('sendCommandSequence')
    expect(typeof curtain.sendCommandSequence).toBe('function')
  })

  it('should have multiple commands method', () => {
    const curtain = new WoCurtain({
      id: 'curtain3-01',
      name: 'Test Curtain 3',
      deviceType: 'WoCurtain',
      connectionTypes: ['api'],
    })

    expect(curtain).toHaveProperty('sendMultipleCommands')
    expect(typeof curtain.sendMultipleCommands).toBe('function')
  })

  it('should have getExtendedInfo method', () => {
    const curtain = new WoCurtain({
      id: 'curtain3-01',
      name: 'Test Curtain 3',
      deviceType: 'WoCurtain',
      connectionTypes: ['ble'],
    })

    expect(curtain).toHaveProperty('getExtendedInfo')
    expect(typeof curtain.getExtendedInfo).toBe('function')
  })

  it('should execute command sequence with all commands succeeding', async () => {
    const curtain = new WoCurtain({
      id: 'curtain3-01',
      name: 'Test Curtain 3',
      deviceType: 'WoCurtain',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => true, // Simulated successful command
      async () => true, // Simulated successful command
    ]

    const result = await curtain.sendCommandSequence(commands)
    expect(result).toBe(true)
  })

  it('should stop command sequence when a command fails', async () => {
    const curtain = new WoCurtain({
      id: 'curtain3-01',
      name: 'Test Curtain 3',
      deviceType: 'WoCurtain',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => true, // Simulated successful command
      async () => false, // Simulated failed command
      async () => true, // Should not be executed
    ]

    const result = await curtain.sendCommandSequence(commands)
    expect(result).toBe(false)
  })

  it('should return true from sendMultipleCommands if any succeed', async () => {
    const curtain = new WoCurtain({
      id: 'curtain3-01',
      name: 'Test Curtain 3',
      deviceType: 'WoCurtain',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => false, // Simulated failed command
      async () => true, // Simulated successful command
      async () => false, // Simulated failed command
    ]

    const result = await curtain.sendMultipleCommands(commands)
    expect(result).toBe(true)
  })

  it('should return false from sendMultipleCommands if all fail', async () => {
    const curtain = new WoCurtain({
      id: 'curtain3-01',
      name: 'Test Curtain 3',
      deviceType: 'WoCurtain',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => false, // Simulated failed command
      async () => false, // Simulated failed command
    ]

    const result = await curtain.sendMultipleCommands(commands)
    expect(result).toBe(false)
  })
})
