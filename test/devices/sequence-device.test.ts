import type { DeviceInfo, DeviceStatus } from '../../src/types/index.js'

import { describe, expect, it, vi } from 'vitest'

import { SequenceDevice } from '../../src/devices/sequence-device.js'

function baseInfo(sequenceNumber?: number): DeviceInfo {
  return {
    id: 'test-sequence-device',
    name: 'Test Sequence Device',
    deviceType: 'WoSmartLock',
    connectionTypes: ['ble'],
    mac: 'AA:BB:CC:DD:EE:FF',
    bleServiceData: sequenceNumber === undefined
      ? undefined
      : {
          model: 'o',
          modelName: 'Smart Lock',
          sequenceNumber,
        },
  }
}

class TestSequenceDevice extends SequenceDevice {
  async getStatus(): Promise<DeviceStatus> {
    return {
      deviceId: this.getId(),
      connectionType: 'ble',
      updatedAt: new Date(),
    }
  }
}

describe('sequence device', () => {
  it('does not trigger update when sequence number is unchanged', async () => {
    const device = new TestSequenceDevice(baseInfo(12))
    const updateSpy = vi.spyOn(device, 'update').mockResolvedValue({
      deviceId: 'test-sequence-device',
      connectionType: 'ble',
      updatedAt: new Date(),
    })

    device.updateInfo({
      bleServiceData: {
        model: 'o',
        modelName: 'Smart Lock',
        sequenceNumber: 12,
      },
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('triggers update and emits sequence-changed on sequence increment', async () => {
    const device = new TestSequenceDevice(baseInfo(1))
    const updateSpy = vi.spyOn(device, 'update').mockResolvedValue({
      deviceId: 'test-sequence-device',
      connectionType: 'ble',
      updatedAt: new Date(),
    })
    const sequenceChanged = vi.fn()

    device.on('sequence-changed', sequenceChanged)

    device.updateInfo({
      bleServiceData: {
        model: 'o',
        modelName: 'Smart Lock',
        sequenceNumber: 2,
      },
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(sequenceChanged).toHaveBeenCalledTimes(1)
    expect(sequenceChanged.mock.calls[0]?.[0]).toMatchObject({
      deviceId: 'test-sequence-device',
      previousSequenceNumber: 1,
      sequenceNumber: 2,
    })
  })

  it('suppresses additional sequence updates while one is in flight', async () => {
    const device = new TestSequenceDevice(baseInfo(10))
    let resolveUpdate: (() => void) | undefined
    const pendingUpdate = new Promise<DeviceStatus>((resolve) => {
      resolveUpdate = () => {
        resolve({
          deviceId: 'test-sequence-device',
          connectionType: 'ble',
          updatedAt: new Date(),
        })
      }
    })

    const updateSpy = vi.spyOn(device, 'update').mockReturnValue(pendingUpdate)

    device.updateInfo({
      bleServiceData: {
        model: 'o',
        modelName: 'Smart Lock',
        sequenceNumber: 11,
      },
    })

    device.updateInfo({
      bleServiceData: {
        model: 'o',
        modelName: 'Smart Lock',
        sequenceNumber: 12,
      },
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(updateSpy).toHaveBeenCalledTimes(1)
    resolveUpdate?.()
    await pendingUpdate
  })
})
