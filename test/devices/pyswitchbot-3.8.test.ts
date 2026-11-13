import type { DeviceInfo } from '../../src/types/index.js'

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { BLEScanner } from '../../src/ble.js'
import { WoHand } from '../../src/devices/wo-hand.js'
import { WoSmartLockLite } from '../../src/devices/wo-lock-lite.js'
import { WoSmartLockNano } from '../../src/devices/wo-lock-nano.js'
import { WoSmartLockProWiFi } from '../../src/devices/wo-lock-pro-wifi.js'
import { WoSmartLockPro } from '../../src/devices/wo-lock-pro.js'
import { buildQuickKeyCommand, parseQuickKeyConfig, QuickKeyFunction, WoSmartLockUltra } from '../../src/devices/wo-lock-ultra.js'
import { WoSmartLockVisionPro } from '../../src/devices/wo-lock-vision-pro.js'
import { WoSmartLock } from '../../src/devices/wo-lock.js'
import { LOCK_COMMANDS } from '../../src/settings.js'
import { SwitchBot } from '../../src/switchbot.js'

// Ports of pySwitchbot 3.2.0-3.8.1. Byte strings and expected values come from pySwitchbot's
// switchbot/devices/lock.py tables and its tests (test_lock.py, test_bot.py, test_adv_parser.py).
const hex = (value: string) => Buffer.from(value, 'hex')
const bytes = (value: readonly number[]) => Buffer.from(value).toString('hex')

function info(deviceType: string): DeviceInfo {
  return { id: 'lock-1', name: 'Lock', deviceType, connectionTypes: ['ble'], mac: 'AA:BB:CC:DD:EE:FF' }
}

function withSentCommands<T extends object>(device: T) {
  const sent: string[] = []
  ;(device as any).sendCommand = vi.fn(async (command: readonly number[]) => {
    sent.push(bytes(command))
    return { success: true }
  })
  ;(device as any).getStatus = vi.fn().mockRejectedValue(new Error('no status'))
  return sent
}

describe('lock commands match pySwitchbot', () => {
  it('has pySwitchbot\'s command bytes for every model', () => {
    const table = Object.fromEntries(Object.entries(LOCK_COMMANDS).map(([model, set]) => [model, {
      lock: bytes(set.lock),
      unlock: bytes(set.unlock),
      unlockWithoutUnlatch: bytes(set.unlockWithoutUnlatch),
      info: bytes(set.info),
      enableNotifications: bytes(set.enableNotifications),
      ...(set.halfLock ? { halfLock: bytes(set.halfLock) } : {}),
    }]))
    const lock2 = (byte: string) => ({ lock: '570f4e0101000000', unlock: '570f4e0101000080', unlockWithoutUnlatch: '570f4e01010000a0', info: `570f4f81${byte}`, enableNotifications: `570e01001e000081${byte}` })
    const lock1 = { lock: '570f4e01011000', unlock: '570f4e01011080', unlockWithoutUnlatch: '570f4e010110a0', info: '570f4f8101', enableNotifications: '570e01001e00008101' }
    expect(table).toEqual({
      'Lock': lock1,
      'Lock Lite': lock1,
      'Lock Pro': lock2('04'),
      'Lock Ultra': { ...lock2('07'), halfLock: '570f4e0101000008' },
      'Lock Ultra Max': lock2('07'),
      'UWB Lock': lock2('07'),
      'Lock Nano': lock2('0c'),
      'Lock Vision Pro': lock2('02'),
      'Lock Vision': lock2('02'),
      'Lock Pro WiFi': lock2('0a'),
    })
  })

  it('sends each class\'s own model commands', async () => {
    const cases: Array<[object, string, string]> = [
      [new WoSmartLock(info('Lock')), '570f4e01011000', '570f4e01011080'],
      [new WoSmartLockLite(info('Lock Lite')), '570f4e01011000', '570f4e01011080'],
      [new WoSmartLockPro(info('Lock Pro')), '570f4e0101000000', '570f4e0101000080'],
      [new WoSmartLockProWiFi(info('Lock Pro WiFi')), '570f4e0101000000', '570f4e0101000080'],
      [new WoSmartLockVisionPro(info('Lock Vision Pro')), '570f4e0101000000', '570f4e0101000080'],
    ]
    for (const [device, lockBytes, unlockBytes] of cases) {
      const sent = withSentCommands(device)
      await (device as WoSmartLock).lock()
      await (device as WoSmartLock).unlock()
      expect(sent).toEqual([lockBytes, unlockBytes])
    }
  })

  it('selects the lock model from the device type, including OpenAPI names', () => {
    expect(new WoSmartLockUltra(info('Smart Lock Ultra')).lockModel).toBe('Lock Ultra')
    expect(new WoSmartLockUltra(info('Lock Ultra Max')).lockModel).toBe('Lock Ultra Max')
    expect(new WoSmartLockUltra(info('UWB Lock')).lockModel).toBe('UWB Lock')
    expect(new WoSmartLockNano(info('Lock Nano')).lockModel).toBe('Lock Nano')
    expect(new WoSmartLockPro(info('Smart Lock Pro')).lockModel).toBe('Lock Pro')
    // An unknown device type falls back to the class's model
    expect(new WoSmartLockNano(info('WoSmartLockNano')).lockModel).toBe('Lock Nano')
  })

  it('unlocks the Lock Pro without unlatching', async () => {
    const lock = new WoSmartLockPro(info('Lock Pro'))
    const sent = withSentCommands(lock)
    await lock.unlockWithoutUnlatch()
    expect(sent).toEqual(['570f4e01010000a0'])
  })

  it('half locks only the Lock Ultra', async () => {
    const ultra = new WoSmartLockUltra(info('Lock Ultra'))
    const sent = withSentCommands(ultra)
    await expect(ultra.halfLock()).resolves.toBe(true)
    expect(sent).toEqual(['570f4e0101000008'])
    await expect(new WoSmartLockUltra(info('UWB Lock')).halfLock()).rejects.toThrow(/not supported/)
  })
})

describe('lock Ultra Quick Key (pySwitchbot test_lock.py)', () => {
  function ultraReplying(reply: Buffer, deviceType = 'Lock Ultra') {
    const lock = new WoSmartLockUltra(info(deviceType))
    const sendBLECommand = vi.fn().mockResolvedValue({ success: true, data: reply })
    ;(lock as any).sendBLECommand = sendBLECommand
    return { lock, sendBLECommand }
  }

  it('reads the settings', async () => {
    const { lock, sendBLECommand } = ultraReplying(hex('01ca00000080'))
    await expect(lock.getQuickKey()).resolves.toEqual({
      raw: 0xCA,
      light: true,
      sound: true,
      manualUnlockLinkage: false,
      enabled: true,
      doublePress: false,
      function: QuickKeyFunction.LockAndUnlock,
      motorSpeed: 0,
    })
    expect(bytes(sendBLECommand.mock.calls[0][0])).toBe('570f4f0401')
  })

  it('reads all-zero settings, and no motor speed from a short reply', async () => {
    await expect(ultraReplying(hex('0100')).lock.getQuickKey()).resolves.toEqual({
      raw: 0,
      light: false,
      sound: false,
      manualUnlockLinkage: false,
      enabled: false,
      doublePress: false,
      function: QuickKeyFunction.LockOnly,
      motorSpeed: undefined,
    })
  })

  it('returns undefined for a failed or short reply, and an unknown function as undefined', async () => {
    await expect(ultraReplying(hex('00')).lock.getQuickKey()).resolves.toBeUndefined()
    await expect(ultraReplying(hex('01')).lock.getQuickKey()).resolves.toBeUndefined()
    expect(parseQuickKeyConfig(0xCB).function).toBeUndefined()
  })

  it('writes one setting', async () => {
    const { lock, sendBLECommand } = ultraReplying(hex('01c9'))
    await expect(lock.setQuickKey({ function: QuickKeyFunction.UnlockOnly })).resolves.toBe(true)
    expect(bytes(sendBLECommand.mock.calls[0][0])).toBe('570f4e0401000201ff')
  })

  it('writes several settings', async () => {
    const { lock, sendBLECommand } = ultraReplying(hex('01ce'))
    await expect(lock.setQuickKey({ enabled: true, doublePress: true, function: QuickKeyFunction.LockAndUnlock })).resolves.toBe(true)
    expect(bytes(sendBLECommand.mock.calls[0][0])).toBe('570f4e0401000e0eff')
  })

  it('writes false and zero values', () => {
    expect(buildQuickKeyCommand({ enabled: false }).toString('hex')).toBe('570f4e04010008' + '00ff')
    expect(buildQuickKeyCommand({ doublePress: false }).toString('hex')).toBe('570f4e04010004' + '00ff')
    expect(buildQuickKeyCommand({ function: QuickKeyFunction.LockOnly }).toString('hex')).toBe('570f4e04010002' + '00ff')
    expect(buildQuickKeyCommand({ enabled: false, doublePress: false, function: QuickKeyFunction.LockOnly }).toString('hex')).toBe('570f4e0401000e00ff')
  })

  it('reports a setting the lock did not apply', async () => {
    const { lock } = ultraReplying(hex('01c0'))
    await expect(lock.setQuickKey({ enabled: true })).resolves.toBe(false)
  })

  it('needs a setting, a valid speed and a Lock Ultra', async () => {
    expect(() => buildQuickKeyCommand({})).toThrow(/at least one/)
    expect(() => buildQuickKeyCommand({ motorSpeed: 3 as any })).toThrow(/motorSpeed/)
    await expect(ultraReplying(hex('01c0'), 'UWB Lock').lock.getQuickKey()).rejects.toThrow(/not supported/)
  })
})

describe('product IDs and lock advertisements in the scanner', () => {
  function parse(data: string, mfr?: string) {
    const scanner = new BLEScanner({ noble: new EventEmitter() })
    return (scanner as any).parseServiceData(hex(data), mfr ? hex(mfr) : undefined)
  }

  it('recognises the lock family by the product ID at the end of the service data', () => {
    expect(parse('0080340010a5b8')).toMatchObject({ model: '0010a5b8', modelName: 'Lock Ultra' })
    expect(parse('00806400119fb8')).toMatchObject({ modelName: 'Lock Ultra Max' })
    expect(parse('00806400121100')).toMatchObject({ modelName: 'UWB Lock' })
    expect(parse('00806400122488')).toMatchObject({ modelName: 'Lock Nano' })
    expect(parse('00802e00116908')).toMatchObject({ modelName: 'Lock Vision' })
    expect(parse('00803300116909')).toMatchObject({ modelName: 'Lock Vision Pro' })
    expect(parse('00803d0010ff90')).toMatchObject({ modelName: 'Lock Pro WiFi' })
  })

  it('still ignores unknown product IDs', () => {
    expect(parse('00806400999999')).toBeNull()
  })

  it('drops a lock advertisement with an unknown status, so the last state stands', () => {
    // Lock Ultra fixture with status 15 in byte 7 (SwitchBotAPI-BLE #54)
    expect(parse('0080340010a5b8', 'b0e9feb66a3d25f830340004')).toBeNull()
  })

  it('parses the lock state from the manufacturer data', () => {
    expect(parse('00806400122488', 'b0e9fe1122332a88086470')).toMatchObject({
      modelName: 'Lock Nano',
      lockState: 'unlocked',
      battery: 100,
      sequenceNumber: 42,
      unlockedAlarm: true,
    })
    expect(parse('248064', 'f7610748e6e83a8a00640000')).toMatchObject({
      modelName: 'Lock Pro',
      lockState: 'unlocked',
      doorOpen: false,
      sequenceNumber: 58,
    })
  })
})

describe('new device types', () => {
  const apiDevice = { deviceId: 'api-1', deviceName: 'Device', enableCloudService: true, hubDeviceId: 'hub-1' }

  for (const [deviceType, className] of [
    ['Lock Ultra', 'WoSmartLockUltra'],
    ['Smart Lock Ultra', 'WoSmartLockUltra'],
    ['Lock Ultra Max', 'WoSmartLockUltra'],
    ['UWB Lock', 'WoSmartLockUltra'],
    ['Lock Nano', 'WoSmartLockNano'],
    ['Hub 4', 'WoHub4'],
    ['Plug Mini (IT)', 'WoPlugMiniUS'],
    ['Outdoor Plug (EU)', 'WoPlugMiniUS'],
  ] as const) {
    it(`maps ${deviceType} to ${className}`, async () => {
      const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
      await (switchbot as any).handleAPIDiscovery({ ...apiDevice, deviceType })
      expect(switchbot.devices.list()[0]?.constructor.name).toBe(className)
    })
  }
})

describe('bot inverse direction (pySwitchbot test_bot.py)', () => {
  function botReplying(...replies: string[]) {
    const bot = new WoHand({ id: 'bot-1', name: 'Bot', deviceType: 'Bot', connectionTypes: ['ble'], mac: 'AA:BB:CC:DD:EE:FF' })
    const sendBLECommand = vi.fn()
    for (const reply of replies) {
      sendBLECommand.mockResolvedValueOnce({ success: true, data: hex(reply) })
    }
    ;(bot as any).sendBLECommand = sendBLECommand
    return { bot, sendBLECommand }
  }

  // Basic info: strength 75 (0x4b), switch mode on, inverse off (byte 9 = 0x10)
  const basicInfo = Buffer.from([1, 89, 31, 75, 0, 0, 0, 0, 2, 0x10, 0]).toString('hex')

  it('reads the mode settings', async () => {
    const { bot } = botReplying(Buffer.from([1, 89, 31, 75, 0, 0, 0, 0, 2, 17, 0]).toString('hex'))
    await expect(bot.getModeSettings()).resolves.toEqual({ strength: 75, switchMode: true, inverseDirection: true })
  })

  for (const [inverse, expected] of [[false, '57034b10'], [true, '57034b11']] as const) {
    it(`sets inverse direction ${inverse}, keeping mode and strength`, async () => {
      const { bot, sendBLECommand } = botReplying(basicInfo, '01')
      await expect(bot.setInverseDirection(inverse)).resolves.toBe(true)
      expect(bytes(sendBLECommand.mock.calls[0][0])).toBe('5702')
      expect(bytes(sendBLECommand.mock.calls[1][0])).toBe(expected)
    })
  }

  it('fails when the mode settings cannot be read', async () => {
    const { bot } = botReplying('00')
    await expect(bot.setInverseDirection(true)).rejects.toThrow(/mode settings/)
  })
})
