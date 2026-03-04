import type { ConnectionType, DeviceInfo } from '../src/types/index.js'

import { describe, expect, it } from 'vitest'

import { WoCurtain } from '../src/devices/wo-curtain.js'
import { WoHand } from '../src/devices/wo-hand.js'

describe('device Base Functionality', () => {
  describe('woHand (Bot)', () => {
    it('should create device with required info', () => {
      const info: DeviceInfo = {
        id: 'test-bot-1',
        name: 'Test Bot',
        deviceType: 'WoHand',
        connectionTypes: ['ble', 'api'] as ConnectionType[],
      }

      const bot = new WoHand(info)

      expect(bot.getId()).toBe('test-bot-1')
      expect(bot.getName()).toBe('Test Bot')
      expect(bot.getDeviceType()).toBe('WoHand')
    })

    it('should report BLE availability correctly', () => {
      const info: DeviceInfo = {
        id: 'test-bot',
        name: 'Test',
        deviceType: 'WoHand',
        connectionTypes: ['ble', 'api'] as ConnectionType[],
        mac: 'AA:BB:CC:DD:EE:FF',
      }

      const botWithoutBLE = new WoHand(info)
      expect(botWithoutBLE.hasBLE()).toBe(false) // No BLE connection provided

      const botWithBLE = new WoHand(info, {
        bleConnection: {} as any, // Mock BLE connection
      })
      expect(botWithBLE.hasBLE()).toBe(true)
    })

    it('should report API availability correctly', () => {
      const info: DeviceInfo = {
        id: 'test-bot',
        name: 'Test',
        deviceType: 'WoHand',
        connectionTypes: ['ble', 'api'] as ConnectionType[],
        cloudServiceEnabled: true,
      }

      const botWithoutAPI = new WoHand(info)
      expect(botWithoutAPI.hasAPI()).toBe(false) // No API client provided

      const botWithAPI = new WoHand(info, {
        apiClient: {} as any, // Mock API client
      })
      expect(botWithAPI.hasAPI()).toBe(true)
    })

    it('should retrieve device info', () => {
      const info: DeviceInfo = {
        id: 'test-bot',
        name: 'Test Bot',
        deviceType: 'WoHand',
        connectionTypes: ['ble'] as ConnectionType[],
        mac: 'AA:BB:CC:DD:EE:FF',
        battery: 95,
      }

      const bot = new WoHand(info)
      const retrievedInfo = bot.getInfo()

      expect(retrievedInfo.id).toBe('test-bot')
      expect(retrievedInfo.name).toBe('Test Bot')
      expect(retrievedInfo.mac).toBe('AA:BB:CC:DD:EE:FF')
      expect(retrievedInfo.battery).toBe(95)
    })

    it('should expose enumerable compatibility properties', () => {
      const info: DeviceInfo = {
        id: 'compat-bot-1',
        name: 'Compat Bot',
        deviceType: 'WoHand',
        connectionTypes: ['ble'] as ConnectionType[],
        mac: 'AA:11:22:33:44:55',
      }

      const bot = new WoHand(info)

      expect(bot.id).toBe('compat-bot-1')
      expect(bot.name).toBe('Compat Bot')
      expect(bot.deviceType).toBe('WoHand')
      expect(bot.mac).toBe('AA:11:22:33:44:55')
      expect(Object.keys(bot)).toContain('id')
    })

    it('should normalize empty compatibility id/mac getters to undefined', () => {
      const info: DeviceInfo = {
        id: '',
        name: 'Compat Empty Bot',
        deviceType: 'WoHand',
        connectionTypes: ['ble'] as ConnectionType[],
        mac: '',
      }

      const bot = new WoHand(info)

      expect(bot.id).toBeUndefined()
      expect(bot.getMAC()).toBeUndefined()
      expect(bot.mac).toBeUndefined()
    })
  })

  describe('woCurtain', () => {
    it('should create curtain device', () => {
      const info: DeviceInfo = {
        id: 'test-curtain-1',
        name: 'Living Room Curtain',
        deviceType: 'WoCurtain',
        connectionTypes: ['ble', 'api'] as ConnectionType[],
      }

      const curtain = new WoCurtain(info)

      expect(curtain.getId()).toBe('test-curtain-1')
      expect(curtain.getName()).toBe('Living Room Curtain')
      expect(curtain.getDeviceType()).toBe('WoCurtain')
    })

    it('should get MAC address when available', () => {
      const info: DeviceInfo = {
        id: 'test-curtain',
        name: 'Curtain',
        deviceType: 'WoCurtain',
        connectionTypes: ['ble'] as ConnectionType[],
        mac: '11:22:33:44:55:66',
      }

      const curtain = new WoCurtain(info)
      expect(curtain.getMAC()).toBe('11:22:33:44:55:66')
    })

    it('should return undefined for missing MAC', () => {
      const info: DeviceInfo = {
        id: 'test-curtain',
        name: 'Curtain',
        deviceType: 'WoCurtain',
        connectionTypes: ['api'] as ConnectionType[],
      }

      const curtain = new WoCurtain(info)
      expect(curtain.getMAC()).toBeUndefined()
    })
  })
})
