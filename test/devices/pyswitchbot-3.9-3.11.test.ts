import type { DeviceInfo } from '../../src/types/index.js'

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import { BLEScanner } from '../../src/ble.js'
import { imageIdsFromBitmap, parseImageFrameInfo, WoArtFrame2 } from '../../src/devices/wo-art-frame2.js'
import { WoEInkPhotoMagnet } from '../../src/devices/wo-e-ink-photo-magnet.js'
import { WoSmartLockProWiFi } from '../../src/devices/wo-lock-pro-wifi.js'
import { parseLockBatteryBays, WoSmartLockPro } from '../../src/devices/wo-lock-pro.js'
import { WoSmartLockUltra } from '../../src/devices/wo-lock-ultra.js'
import { SwitchbotOperationError } from '../../src/errors.js'
import { resolveDeviceClassName } from '../../src/settings.js'
import { SwitchBot } from '../../src/switchbot.js'
import { parseImageFrameAdvertisement } from '../../src/utils/image-frame-advertisement.js'
import { parseLockAdvertisement } from '../../src/utils/lock-advertisement.js'

// Ports of pySwitchbot 3.9.0-3.11.0. Byte strings and expected values come from pySwitchbot's
// tests (test_e_ink_photo_magnet.py, test_art_frame_2.py, test_adv_parser.py, test_lock.py).
const hex = (value: string) => Buffer.from(value, 'hex')
const bytes = (value: readonly number[] | Buffer) => Buffer.from(value).toString('hex')

function info(deviceType: string, id = 'device-1'): DeviceInfo {
  return { id, name: deviceType, deviceType, connectionTypes: ['ble'], mac: 'AA:BB:CC:DD:EE:FF' }
}

function parse(data: Buffer, mfr?: Buffer) {
  const scanner = new BLEScanner({ noble: new EventEmitter() })
  return (scanner as any).parseServiceData(data, mfr)
}

/** A device whose BLE commands answer with the given replies, in order */
function replying<T extends object>(device: T, ...replies: Array<Buffer | undefined>) {
  const sendBLECommand = vi.fn()
  for (const reply of replies) {
    sendBLECommand.mockResolvedValueOnce({ success: true, data: reply })
  }
  ;(device as any).sendBLECommand = sendBLECommand
  const sent = () => sendBLECommand.mock.calls.map(call => bytes(call[0]))
  return { device, sendBLECommand, sent }
}

describe('art Frame 2 and E Ink Photo Magnet discovery (pySwitchbot 3.9.0, 3.10.0)', () => {
  const mfr = hex('aabbccddeeff01b634125e')
  const expected = {
    sequenceNumber: 1,
    batteryCharging: true,
    battery: 54,
    imageIndex: 0x1234,
    displaySize: 5,
    displayMode: 1,
    lastNetworkStatus: 1,
    orientation: 1,
  }

  for (const [suffix, modelName] of [['11f1c0', 'Art Frame 2'], ['1295d0', 'E Ink Photo Magnet']] as const) {
    for (const pairing of [0, 1]) {
      it(`recognises the ${modelName} (pairing byte ${pairing}) and parses its advertisement`, () => {
        const data = Buffer.concat([Buffer.from([0, 0, 54, pairing]), hex(suffix)])
        expect(parse(data, mfr)).toMatchObject({ model: `0${pairing}${suffix}`, modelName, ...expected })
      })
    }
  }

  it('ignores short advertisements', () => {
    expect(parseImageFrameAdvertisement(undefined)).toBeUndefined()
    for (let length = 0; length < 11; length++) {
      expect(parseImageFrameAdvertisement(Buffer.alloc(length))).toBeUndefined()
    }
  })

  it('maps device types and cloud model codes to the frame classes', () => {
    expect(resolveDeviceClassName('Art Frame 2')).toBe('WoArtFrame2')
    expect(resolveDeviceClassName('W1176000')).toBe('WoArtFrame2')
    expect(resolveDeviceClassName('E Ink Photo Magnet')).toBe('WoEInkPhotoMagnet')
    expect(resolveDeviceClassName('W1218000')).toBe('WoEInkPhotoMagnet')
    // The original Art Frame keeps its class
    expect(resolveDeviceClassName('Art Frame')).toBe('WoArtFrame')
  })

  for (const [deviceType, className] of [['Art Frame 2', 'WoArtFrame2'], ['E Ink Photo Magnet', 'WoEInkPhotoMagnet']] as const) {
    it(`creates a ${className} for ${deviceType}`, async () => {
      const switchbot = new SwitchBot({ enableBLE: false, token: '', secret: '' })
      await (switchbot as any).handleAPIDiscovery({ deviceId: 'api-1', deviceName: 'Frame', enableCloudService: true, hubDeviceId: 'hub-1', deviceType })
      expect(switchbot.devices.list()[0]?.constructor.name).toBe(className)
    })
  }

  it('reports status from the advertisement', async () => {
    const frame = new WoEInkPhotoMagnet({ ...info('E Ink Photo Magnet'), bleServiceData: parse(Buffer.concat([hex('00003600'), hex('1295d0')]), mfr), bleServiceDataAt: Date.now() }, { bleConnection: {} as any })
    await expect(frame.getStatus()).resolves.toMatchObject({ connectionType: 'ble', battery: 54, batteryCharging: true, imageIndex: 0x1234, orientation: 1 })
  })
})

describe('art Frame 2 commands (pySwitchbot test_e_ink_photo_magnet.py)', () => {
  for (const FrameClass of [WoArtFrame2, WoEInkPhotoMagnet]) {
    const frame = () => new FrameClass(info('Art Frame 2'))

    it(`${FrameClass.name}: reads the frame settings`, async () => {
      const { device, sent } = replying(frame(), hex('01b607015c34f1010101'))
      await expect(device.getFrameInfo()).resolves.toEqual({
        batteryCharging: true,
        battery: 54,
        firmware: 0.7,
        hardware: 1,
        displaySize: 5,
        displayMode: 1,
        lastNetworkStatus: 1,
        currentImageIndex: 0xF134,
        totalNumOfImages: 257,
        orientation: 1,
      })
      expect(sent()).toEqual(['5702'])
    })

    it(`${FrameClass.name}: navigates`, async () => {
      for (const [method, command] of [['nextImage', '570f7a0701'], ['prevImage', '570f7a0700']] as const) {
        for (const [status, expected] of [['01', true], ['09', false]] as const) {
          const { device, sent } = replying(frame(), hex(status))
          await expect(device[method]()).resolves.toBe(expected)
          expect(sent()).toEqual([command])
        }
      }
    })
  }

  it('returns undefined for invalid settings replies', () => {
    for (const data of [undefined, hex(''), Buffer.alloc(9), Buffer.alloc(10)]) {
      expect(parseImageFrameInfo(data)).toBeUndefined()
    }
  })

  it('reads a paginated image bitmap', async () => {
    const { device, sent } = replying(new WoArtFrame2(info('Art Frame 2')), hex('0102008101'), hex('01020102'))
    await expect(device.getImageIds()).resolves.toEqual([1, 8, 9, 18])
    expect(sent()).toEqual(['570f7b0700', '570f7b0701'])
  })

  it('rejects invalid bitmap replies', async () => {
    const cases: Array<Array<Buffer | undefined>> = [
      [undefined],
      [hex('01')],
      [hex('09010001')],
      [hex('01000001')],
      [hex('01010101')],
      [hex('01020001'), hex('01030101')],
      [hex('01020001'), hex('01020001')],
      [Buffer.concat([hex('010100'), Buffer.alloc(2561)])],
    ]
    for (const replies of cases) {
      const { device } = replying(new WoArtFrame2(info('Art Frame 2')), ...replies)
      await expect(device.getImageIds()).rejects.toThrow(/Invalid image bitmap/)
    }
  })

  it('decodes bitmap bits to image ids', () => {
    expect(imageIdsFromBitmap(hex('8101'))).toEqual([1, 8, 9])
  })

  it('shows a random sparse image other than the current one', async () => {
    const { device, sent } = replying(
      new WoArtFrame2(info('Art Frame 2')),
      hex('01b607015c01000100' + '01'), // current image id 1
      Buffer.concat([hex('01010001'), Buffer.alloc(31), hex('01')]), // ids 1 and 257
      hex('01'),
    )
    await expect(device.randomImage()).resolves.toBe(true)
    expect(sent()).toEqual(['5702', '570f7b0700', '570f7a020101'])
  })

  it('needs another image and the frame settings for a random image', async () => {
    for (const bitmap of ['00', '01']) {
      const { device } = replying(new WoArtFrame2(info('Art Frame 2')), hex('01b607015c01000100' + '01'), hex(`010100${bitmap}`))
      await expect(device.randomImage()).rejects.toThrow(/No images/)
    }
    const { device, sent } = replying(new WoArtFrame2(info('Art Frame 2')), hex('00'))
    await expect(device.randomImage()).rejects.toThrow(SwitchbotOperationError)
    expect(sent()).toEqual(['5702'])
  })

  it('shows an image by its position in the stored list', async () => {
    const { device, sent } = replying(new WoArtFrame2(info('Art Frame 2')), Buffer.concat([hex('010100'), Buffer.alloc(2559), hex('80')]), hex('01'))
    await expect(device.setImage(0)).resolves.toBe(true)
    expect(sent()[1]).toBe('570f7a020050')
  })

  it('rejects an image position out of range', async () => {
    for (const index of [-1, 1]) {
      const { device } = replying(new WoArtFrame2(info('Art Frame 2')), hex('01010001'))
      await expect(device.setImage(index)).rejects.toThrow(/out of range/)
    }
  })
})

describe('lock Pro battery bays and advertisement alarms (pySwitchbot 3.11.0)', () => {
  const mfr = hex('fb7d6962d3de2a8a00e4003e')

  it('decodes the Lock Pro charging and alarm bits', () => {
    expect(parseLockAdvertisement('pro', hex('248064'), mfr)).toMatchObject({
      battery: 100,
      batteryCharging: true,
      lowTemperatureAlarm: true,
      powerAlarm: true,
      doorMagnetAlarm: true,
      leftBatteryCompartmentAlarm: true,
      rightBatteryCompartmentAlarm: true,
      unclosedAlarm: false,
      unlockedAlarm: false,
    })
  })

  it('does not report the Lock Pro-only bits for the Lock Pro WiFi', () => {
    const result = parseLockAdvertisement('proWifi', undefined, mfr)!
    expect(result.leftBatteryCompartmentAlarm).toBe(true)
    expect(result).not.toHaveProperty('batteryCharging')
    expect(result).not.toHaveProperty('powerAlarm')
    expect(result).not.toHaveProperty('doorMagnetAlarm')
  })

  it('uses the Lock Pro WiFi layout for Lock Pro WiFi advertisements', () => {
    expect(parse(hex('00803d0010ff90'), mfr)).toMatchObject({ modelName: 'Lock Pro WiFi', leftBatteryCompartmentAlarm: true })
    expect(parse(hex('00803d0010ff90'), mfr)).not.toHaveProperty('powerAlarm')
  })

  it('ignores short manufacturer data', () => {
    for (const family of ['pro', 'proWifi'] as const) {
      expect(parseLockAdvertisement(family, undefined, hex('fb7d6962d3de2a8a00e400'))).toBeUndefined()
    }
  })

  for (const [data, expected] of [
    ['01e4cd0000', { leftBattery: 100, rightBattery: 77 }],
    ['01e4000000', { leftBattery: 100, rightBattery: undefined }],
    ['0100b20000', { leftBattery: undefined, rightBattery: 50 }],
  ] as const) {
    it(`parses battery bays ${data}`, () => {
      expect(parseLockBatteryBays(hex(data))).toEqual(expected)
    })
  }

  it('reads the battery bays of the Lock Pro', async () => {
    const { device, sent } = replying(new WoSmartLockPro(info('Lock Pro')), hex('01e4cd0000'))
    await expect(device.getBatteryBays()).resolves.toEqual({ leftBattery: 100, rightBattery: 77 })
    expect(sent()).toEqual(['570f4f0409'])
  })

  it('returns undefined for a failed or short battery bays reply', async () => {
    for (const reply of ['00', '01e4']) {
      const { device } = replying(new WoSmartLockPro(info('Lock Pro')), hex(reply))
      await expect(device.getBatteryBays()).resolves.toBeUndefined()
    }
  })

  it('reads battery bays only on the Lock Pro', async () => {
    await expect(new WoSmartLockProWiFi(info('Lock Pro WiFi')).getBatteryBays()).rejects.toThrow(/not supported/)
    await expect(new WoSmartLockUltra(info('Lock Ultra')).getBatteryBays()).rejects.toThrow(/not supported/)
  })
})
