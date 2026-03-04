/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * light-multi-command.test.ts: SwitchBot v4.0.0 - Light Multi-Command Sequence Tests
 */

import { describe, expect, it } from 'vitest'

import { WoBulb } from '../src/devices/wo-bulb.js'
import { WoStripLight3 } from '../src/devices/wo-strip-light-3.js'

describe('light Multi-Command Sequences', () => {
  it('should have sendCommandSequence method on WoBulb', () => {
    const bulb = new WoBulb({
      id: 'bulb-01',
      name: 'Test Bulb',
      deviceType: 'Color Bulb',
      connectionTypes: ['api'],
    })

    expect(bulb).toHaveProperty('sendCommandSequence')
    expect(typeof bulb.sendCommandSequence).toBe('function')
  })

  it('should have sendMultipleCommands method on WoBulb', () => {
    const bulb = new WoBulb({
      id: 'bulb-01',
      name: 'Test Bulb',
      deviceType: 'Color Bulb',
      connectionTypes: ['api'],
    })

    expect(bulb).toHaveProperty('sendMultipleCommands')
    expect(typeof bulb.sendMultipleCommands).toBe('function')
  })

  it('should have methods on Strip Light 3', () => {
    const strip = new WoStripLight3({
      id: 'strip-01',
      name: 'Test Strip',
      deviceType: 'WoBulb',
      connectionTypes: ['api'],
    })

    expect(strip).toHaveProperty('sendCommandSequence')
    expect(strip).toHaveProperty('sendMultipleCommands')
  })

  it('should execute command sequence with all commands succeeding', async () => {
    const bulb = new WoBulb({
      id: 'bulb-01',
      name: 'Test Bulb',
      deviceType: 'Color Bulb',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => true, // Simulated successful command
      async () => true, // Simulated successful command
      async () => true, // Simulated successful command
    ]

    const result = await bulb.sendCommandSequence(commands)
    expect(result).toBe(true)
  })

  it('should stop command sequence when a command fails', async () => {
    const bulb = new WoBulb({
      id: 'bulb-01',
      name: 'Test Bulb',
      deviceType: 'Color Bulb',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => true, // Simulated successful command
      async () => false, // Simulated failed command
      async () => true, // Should not be executed
    ]

    const result = await bulb.sendCommandSequence(commands)
    expect(result).toBe(false)
  })

  it('should return true from sendMultipleCommands if any succeed', async () => {
    const bulb = new WoBulb({
      id: 'bulb-01',
      name: 'Test Bulb',
      deviceType: 'Color Bulb',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => false, // Simulated failed command
      async () => true, // Simulated successful command
      async () => false, // Simulated failed command
    ]

    const result = await bulb.sendMultipleCommands(commands)
    expect(result).toBe(true)
  })

  it('should return false from sendMultipleCommands if all fail', async () => {
    const bulb = new WoBulb({
      id: 'bulb-01',
      name: 'Test Bulb',
      deviceType: 'Color Bulb',
      connectionTypes: ['api'],
    })

    const commands = [
      async () => false, // Simulated failed command
      async () => false, // Simulated failed command
    ]

    const result = await bulb.sendMultipleCommands(commands)
    expect(result).toBe(false)
  })

  it('should execute complex light pattern with sequence', async () => {
    const bulb = new WoBulb({
      id: 'bulb-01',
      name: 'Test Bulb',
      deviceType: 'Color Bulb',
      connectionTypes: ['api'],
    })

    // Simulate a complex pattern: turn on, set brightness, set color
    const commands = [
      async () => true, // turnOn
      async () => true, // setBrightness
      async () => true, // setColor
    ]

    const result = await bulb.sendCommandSequence(commands)
    expect(result).toBe(true)
  })
})
