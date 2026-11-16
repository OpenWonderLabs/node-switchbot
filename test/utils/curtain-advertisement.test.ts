import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'

import { describe, expect, it } from 'vitest'

import { BLEScanner } from '../../src/ble.js'
import { parseCurtainAdvertisement } from '../../src/utils/curtain-advertisement.js'

// Fixtures are pySwitchbot's (tests/test_adv_parser.py and tests/test_curtain.py). pySwitchbot
// reverses the position by default; node-switchbot reports it as the curtain does, so the
// positions here are 100 minus pySwitchbot's.
const hex = (value: string) => Buffer.from(value, 'hex')
const bytes = (value: string) => Buffer.from(value, 'latin1')

describe('parseCurtainAdvertisement (pySwitchbot fixtures)', () => {
  it('curtain, state from the manufacturer data', () => {
    expect(parseCurtainAdvertisement(bytes('c\xC0X\x00\x11\x04'), bytes('\xE7\xABF\xAC\x8F\x92|\x0F\x00\x11\x04'))).toEqual({
      calibration: true,
      battery: 88,
      inMotion: false,
      position: 0,
      lightLevel: 1,
      deviceChain: 1,
    })
  })

  it('curtain, state from the service data only', () => {
    expect(parseCurtainAdvertisement(bytes('c\xD0\xCEd\x11\x04'), undefined)).toEqual({
      calibration: true,
      battery: 78,
      inMotion: false,
      position: 100,
      lightLevel: 1,
      deviceChain: 1,
    })
  })

  it('curtain on firmware 6', () => {
    expect(parseCurtainAdvertisement(bytes('c\xC0G\x00"\x04'), bytes('\xF5\x98\x94\x08\xA0\xE7\x9B\x0F\x00"\x04'))).toMatchObject({
      calibration: true,
      battery: 71,
      position: 0,
      lightLevel: 2,
      deviceChain: 2,
    })
  })

  it('curtain 3, battery from the manufacturer data', () => {
    expect(parseCurtainAdvertisement(hex('7bc049001104'), hex('aabbccddeefff70700110400' + '49'))).toEqual({
      calibration: true,
      battery: 73,
      inMotion: false,
      position: 0,
      lightLevel: 1,
      deviceChain: 1,
    })
  })

  it('reads motion from the position byte, not the calibration bit', () => {
    const moving = parseCurtainAdvertisement(hex('63405a' + 'b2' + '1104'), undefined)
    expect(moving).toMatchObject({ inMotion: true, position: 50, calibration: true })
  })

  it('returns undefined when there is nothing to read', () => {
    expect(parseCurtainAdvertisement(hex('63c0'), hex('aabb'))).toBeUndefined()
  })
})

describe('curtain advertisements in the scanner', () => {
  function scan(...adverts: Array<{ mfr?: Buffer, serviceData?: Array<{ uuid: string, data: Buffer }> }>) {
    const scanner = new BLEScanner({ noble: new EventEmitter() }) as any
    const seen: any[] = []
    scanner.on('discover', (advertisement: any) => seen.push(advertisement.serviceData))
    for (const { mfr, serviceData = [] } of adverts) {
      scanner.handleDiscovery({
        id: 'aabbccddeeff',
        address: 'aa:bb:cc:dd:ee:ff',
        rssi: -80,
        connectable: true,
        advertisement: { manufacturerData: mfr && Buffer.concat([hex('6909'), mfr]), serviceData },
      })
    }
    return seen
  }

  // pySwitchbot 3.8.2 (#614): a Curtain 3 first heard without service data must be identified
  // from a later advertisement that has it. node-switchbot never assigns a model without service
  // data, so the first advertisement is ignored and the second one identifies it.
  it('identifies a Curtain 3 from the first advertisement with service data', () => {
    const seen = scan(
      { mfr: bytes('\xAA\xBB\xCC\xDD\xEE\xFF\x07\x03S\x11\x04\x01d') },
      { mfr: bytes('\xCF;Zwu\x0C\x19\x0B\x00\x11D\x006'), serviceData: [{ uuid: 'fd3d', data: bytes('{\xC06\x00\x11D') }] },
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ model: '{', modelName: 'Curtain3', position: 0, calibration: true, battery: 54 })
  })

  it('accepts the legacy 0x0D00 service UUID', () => {
    const seen = scan({ serviceData: [{ uuid: '00000d00-0000-1000-8000-00805f9b34fb', data: bytes('c\xD0\xCEd\x11\x04') }] })
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ modelName: 'Curtain', position: 100, battery: 78 })
  })
})
