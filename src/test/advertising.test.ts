import type * as Noble from '@stoprocent/noble'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { Advertising } from '../advertising.js'

describe('advertising', () => {
  describe('parse', () => {
    it('should return null if advertisement or serviceData is missing', async () => {
      const peripheral = {
        advertisement: null,
      } as unknown as Noble.Peripheral

      const mockLog = vi.fn()
      const result = await Advertising.parse(peripheral, mockLog)
      expect(result).toBeNull()
    })

    it('should return null if serviceData or manufacturerData is invalid', async () => {
      const peripheral = {
        advertisement: {
          serviceData: [{ data: null }],
          manufacturerData: null,
        },
      } as unknown as Noble.Peripheral

      const mockLog = vi.fn()
      const result = await Advertising.parse(peripheral, mockLog)
      expect(result).toBeNull()
    })

    it('should return parsed data for a recognized device model', async () => {
      const serviceData = Buffer.from('010203', 'hex')
      const manufacturerData = Buffer.from('040506', 'hex')
      const peripheral = {
        id: 'test-id',
        advertisement: {
          serviceData: [{ data: serviceData }],
          manufacturerData,
        },
        rssi: -60,
        address: '00:11:22:33:44:55',
      } as unknown as Noble.Peripheral

      const mockLog = vi.fn()
      const mockParseServiceData = vi.fn().mockResolvedValue({ key: 'value' })
      vi.spyOn(Advertising as any, 'parseServiceData').mockImplementation(mockParseServiceData)

      const result = await Advertising.parse(peripheral, mockLog)
      expect(result).toEqual({
        id: 'test-id',
        address: '00:11:22:33:44:55',
        rssi: -60,
        serviceData: { model: '\x01', key: 'value' },
      })
    })

    it('should log and return null if parsed serviceData is empty', async () => {
      const serviceData = Buffer.from('010203', 'hex')
      const manufacturerData = Buffer.from('040506', 'hex')
      const peripheral = {
        id: 'test-id',
        advertisement: {
          serviceData: [{ data: serviceData }],
          manufacturerData,
        },
        rssi: -60,
        address: '00:11:22:33:44:55',
      } as unknown as Noble.Peripheral

      const mockLog = vi.fn()
      vi.spyOn(Advertising as any, 'parseServiceData').mockResolvedValue(null)

      const result = await Advertising.parse(peripheral, mockLog)
      expect(result).toBeNull()
      expect(mockLog).toHaveBeenCalledWith('debugerror', '[parseAdvertising.test-id.\x01] return null, parsed serviceData empty!')
    })
  })

  describe('validateBuffer', () => {
    it('should return true for valid buffer', () => {
      const buffer = Buffer.from('010203', 'hex')
      const result = (Advertising as any).validateBuffer(buffer)
      expect(result).toBe(true)
    })

    it('should return null for invalid buffer', () => {
      const buffer = null
      const result = (Advertising as any).validateBuffer(buffer)
      expect(result).toBe(null)
    })
  })

  describe('formatAddress', () => {
    it('should format address correctly', () => {
      const peripheral = {
        address: '00-11-22-33-44-55',
      } as unknown as Noble.Peripheral

      const result = (Advertising as any).formatAddress(peripheral)
      expect(result).toBe('00:11:22:33:44:55')
    })

    it('should format address from manufacturerData if address is empty', () => {
      const peripheral = {
        address: '',
        advertisement: {
          manufacturerData: Buffer.from('0000112233445566', 'hex'),
        },
      } as unknown as Noble.Peripheral

      const result = (Advertising as any).formatAddress(peripheral)
      expect(result).toBe('11:22:33:44:55:66')
    })
  })
})
