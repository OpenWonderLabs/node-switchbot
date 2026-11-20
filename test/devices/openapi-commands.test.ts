/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * openapi-commands.test.ts: API-only devices send the commands the SwitchBot OpenAPI documents
 */

import { describe, expect, it, vi } from 'vitest'

import { resolveDeviceClassName } from '../../src/settings.js'
import { SwitchBot } from '../../src/switchbot.js'

// Create an API-only device through SwitchBot, the way discovery does, and record API commands.
async function apiDevice(deviceType: string) {
  const switchbot = new SwitchBot({ enableBLE: false, token: 'token', secret: 'secret', enableRetry: false })
  const apiClient = switchbot.getAPIClient()!
  vi.spyOn(apiClient, 'getDevices').mockResolvedValue({
    deviceList: [{ deviceId: 'DEVICE', deviceName: 'Test', deviceType, enableCloudService: true, hubDeviceId: 'HUB' }],
    infraredRemoteList: [],
  } as any)
  const sendCommand = vi.spyOn(apiClient, 'sendCommand').mockResolvedValue({ statusCode: 100, message: 'success', body: {} } as any)
  const [device] = await switchbot.discover({ scanBLE: false, fetchAPI: true })
  expect(device, deviceType).toBeDefined()
  return { device: device as any, calls: () => sendCommand.mock.calls.map(([, command, parameter]) => [command, parameter]) }
}

describe('openAPI commands', () => {
  // Blind Tilt previously sent turnOn/turnOff and setPosition with {position}, none of which exist.
  it('blind Tilt uses fullyOpen, closeUp, closeDown and direction;position', async () => {
    const { device, calls } = await apiDevice('Blind Tilt')
    await device.open()
    await device.closeUp()
    await device.closeDown()
    await device.close()
    await device.setPosition(0)
    await device.setPosition(25)
    await device.setPosition(50)
    await device.setPosition(76)
    await device.setPosition(100)
    expect(calls()).toEqual([
      ['fullyOpen', undefined],
      ['closeUp', undefined],
      ['closeDown', undefined],
      ['closeUp', undefined],
      ['setPosition', 'down;0'],
      ['setPosition', 'down;50'],
      ['setPosition', 'down;100'],
      ['setPosition', 'up;48'],
      ['setPosition', 'up;0'],
    ])
  })

  // OpenAPI air purifiers take setMode {"mode", "fanGear"}; there is no setFanSpeed or setPresetMode.
  it.each(['Air Purifier PM2.5', 'Air Purifier Table'])('%s uses setMode with mode and fanGear', async (type) => {
    const { device, calls } = await apiDevice(type)
    await device.setMode('auto')
    await device.setMode('manual')
    await device.setMode('sleep')
    await device.setFanSpeed(2)
    await device.setFanSpeed(4)
    await device.setPresetMode('pet')
    expect(calls()).toEqual([
      ['setMode', { mode: 2 }],
      ['setMode', { mode: 1 }],
      ['setMode', { mode: 3 }],
      ['setMode', { mode: 1, fanGear: 2 }],
      ['setMode', { mode: 1, fanGear: 3 }],
      ['setMode', { mode: 4 }],
    ])
  })

  it('rGBIC Neon Wire Rope Light sends setColor as "r:g:b"', async () => {
    const { device, calls } = await apiDevice('RGBIC Neon Wire Rope Light')
    await device.setColor(255, 128, 0)
    expect(calls()).toEqual([['setColor', '255:128:0']])
  })

  // devices/lighting/permanent-outdoor-lights.md
  it('permanent Outdoor Lights send the documented light commands', async () => {
    const { device, calls } = await apiDevice('Permanent Outdoor Lights')
    await device.turnOn()
    await device.turnOff()
    await device.setBrightness(40)
    await device.setColorTemperature(2700)
    await device.setColor(255, 128, 0)
    expect(calls()).toEqual([
      ['turnOn', undefined],
      ['turnOff', undefined],
      ['setBrightness', 40],
      ['setColorTemperature', 2700],
      ['setColor', '255:128:0'],
    ])
  })

  // devices/locks-security/lock-ultra.md: the status response reports deviceType "Lock Ultra"
  it('lock Ultra sends lock and unlock', async () => {
    const { device, calls } = await apiDevice('Lock Ultra')
    await device.lock()
    await device.unlock()
    expect(calls()).toEqual([['lock', undefined], ['unlock', undefined]])
  })

  it('color Bulb sends setColorTemperature in kelvin', async () => {
    const { device, calls } = await apiDevice('Color Bulb')
    await device.setColorTemp(2700, 6500, 4000)
    expect(calls()).toEqual([['setColorTemperature', 4000]])
  })

  it.each([
    ['Robot Vacuum Cleaner S1', 'start', undefined],
    ['Robot Vacuum Cleaner S1 Plus', 'start', undefined],
    ['K10+', 'start', undefined],
    ['Robot Vacuum Cleaner S10', 'startClean', { action: 'sweep', param: { fanLevel: 1, waterLevel: 1, times: 1 } }],
    ['Robot Vacuum Cleaner K10+ Pro Combo', 'startClean', { action: 'sweep', param: { fanLevel: 1, times: 1 } }],
    ['Robot Vacuum Cleaner K20 Plus Pro', 'startClean', { action: 'sweep', param: { fanLevel: 1, times: 1 } }],
  ])('%s starts cleaning with %s', async (type, command, parameter) => {
    const { device, calls } = await apiDevice(type)
    await device.cleanUp(1)
    await device.returnToDock(1)
    expect(calls()).toEqual([[command, parameter], ['dock', undefined]])
  })

  it('maps every OpenAPI vacuum type to a class', () => {
    expect(resolveDeviceClassName('Robot Vacuum Cleaner K20 Plus Pro')).toBe('WoVacuumK20')
    expect(resolveDeviceClassName('Robot Vacuum Cleaner S1')).toBe('WoVacuum')
  })
  // AI Art Frame: next and previous (devices/others/ai-art-frame.md)
  it('aI Art Frame uses next and previous', async () => {
    const { device, calls } = await apiDevice('AI Art Frame')
    await device.nextImage()
    await device.prevImage()
    expect(calls()).toEqual([
      ['next', undefined],
      ['previous', undefined],
    ])
  })

  // Curtain 4 (deviceType "Curtain4") takes the Curtain setPosition "index,mode,position"
  it.each(['Curtain4', 'Curtain 4'])('%s uses the Curtain commands', async (type) => {
    expect(resolveDeviceClassName(type)).toBe('WoCurtain')
    const { device, calls } = await apiDevice(type)
    await device.setPosition(80)
    await device.pause()
    expect(calls()).toEqual([
      ['setPosition', '0,ff,80'],
      ['pause', undefined],
    ])
  })

  // S30 startClean takes action, fanLevel, waterLevel and times, like the S20
  it('robot Vacuum Cleaner S30 starts cleaning like the S20', async () => {
    expect(resolveDeviceClassName('Robot Vacuum Cleaner S30')).toBe('WoVacuumS20')
    const { device, calls } = await apiDevice('Robot Vacuum Cleaner S30')
    await device.cleanUp(1)
    await device.returnToDock(1)
    expect(calls()).toEqual([
      ['startClean', { action: 'sweep', param: { fanLevel: 1, waterLevel: 1, times: 1 } }],
      ['dock', undefined],
    ])
  })

  // K11+ Pro startClean takes action, fanLevel and times, like the K11+
  it('robot Vacuum Cleaner K11 Plus Pro starts cleaning like the K11+', async () => {
    expect(resolveDeviceClassName('Robot Vacuum Cleaner K11 Plus Pro')).toBe('WoVacuumK11Plus')
    const { device, calls } = await apiDevice('Robot Vacuum Cleaner K11 Plus Pro')
    await device.cleanUp(1)
    expect(calls()).toEqual([
      ['startClean', { action: 'sweep', param: { fanLevel: 1, times: 1 } }],
    ])
  })
})
