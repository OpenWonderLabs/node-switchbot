import { beforeEach, describe, expect, it } from 'vitest'

import { DeviceManager } from '../src/devices/base.js'
import { WoHand } from '../src/devices/wo-hand.js'

describe('deviceManager', () => {
  let manager
  beforeEach(() => {
    manager = new DeviceManager()
  })
  it('should add and retrieve devices', () => {
    const device = new WoHand({
      id: 'test-device-1',
      name: 'Test Bot',
      deviceType: 'WoHand',
      connectionTypes: ['ble', 'api'],
    })
    manager.add(device)
    const retrieved = manager.get('test-device-1')
    expect(retrieved).toBeDefined()
    expect(retrieved?.getId()).toBe('test-device-1')
    expect(retrieved?.getName()).toBe('Test Bot')
  })
  it('should list all devices', () => {
    const device1 = new WoHand({
      id: 'test-1',
      name: 'Bot 1',
      deviceType: 'WoHand',
      connectionTypes: ['ble'],
    })
    const device2 = new WoHand({
      id: 'test-2',
      name: 'Bot 2',
      deviceType: 'WoHand',
      connectionTypes: ['api'],
    })
    manager.add(device1)
    manager.add(device2)
    const devices = manager.list()
    expect(devices).toHaveLength(2)
    expect(devices.map(d => d.getId())).toContain('test-1')
    expect(devices.map(d => d.getId())).toContain('test-2')
  })
  it('should get count of devices', () => {
    expect(manager.count()).toBe(0)
    manager.add(new WoHand({
      id: 'test-1',
      name: 'Bot 1',
      deviceType: 'WoHand',
      connectionTypes: ['ble'],
    }))
    expect(manager.count()).toBe(1)
  })
  it('should clear all devices', () => {
    manager.add(new WoHand({
      id: 'test-1',
      name: 'Bot 1',
      deviceType: 'WoHand',
      connectionTypes: ['ble'],
    }))
    expect(manager.count()).toBe(1)
    manager.clear()
    expect(manager.count()).toBe(0)
  })
  it('should update existing device when adding duplicate id', () => {
    const device1 = new WoHand({
      id: 'test-1',
      name: 'Bot 1',
      deviceType: 'WoHand',
      connectionTypes: ['ble'],
    })
    const device2 = new WoHand({
      id: 'test-1',
      name: 'Bot 1 Updated',
      deviceType: 'WoHand',
      connectionTypes: ['api'],
    })
    manager.add(device1)
    expect(manager.count()).toBe(1)
    manager.add(device2)
    expect(manager.count()).toBe(1)
    const retrieved = manager.get('test-1')
    expect(retrieved?.getName()).toBe('Bot 1 Updated')
  })
  it('should return undefined for non-existent device', () => {
    const device = manager.get('non-existent')
    expect(device).toBeUndefined()
  })
})
// # sourceMappingURL=device-manager.test.js.map
