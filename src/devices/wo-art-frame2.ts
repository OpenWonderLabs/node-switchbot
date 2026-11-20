/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * devices/wo-art-frame2.ts: SwitchBot Art Frame 2 and E Ink Photo Magnet
 */

import type { ImageFrameStatus } from '../types/device.js'

import { Buffer } from 'node:buffer'
import { randomInt } from 'node:crypto'

import { SwitchbotOperationError } from '../errors.js'
import { SequenceDevice } from './sequence-device.js'

/** Read the device settings (pySwitchbot `DEVICE_GET_BASIC_SETTINGS_KEY`) */
const COMMAND_GET_BASIC_INFO = [0x57, 0x02] as const
/** Show the previous (`00`) or next (`01`) stored image */
const COMMAND_PREV_IMAGE = [0x57, 0x0F, 0x7A, 0x07, 0x00] as const
const COMMAND_NEXT_IMAGE = [0x57, 0x0F, 0x7A, 0x07, 0x01] as const
/** Show an image by id, followed by the 16-bit id, little endian */
const COMMAND_SET_IMAGE_PREFIX = [0x57, 0x0F, 0x7A, 0x02] as const
/** Read one packet of the stored image bitmap, followed by the packet number */
const COMMAND_GET_IMAGE_BITMAP_PREFIX = [0x57, 0x0F, 0x7B, 0x07] as const
/** Largest bitmap the frame may send: 2560 bytes, one bit per image id */
const MAX_IMAGE_BITMAP_BYTES = 2560

/** Frame settings read over BLE (pySwitchbot `SwitchbotArtFrame2.get_basic_info`) */
export interface ImageFrameInfo {
  batteryCharging: boolean
  battery: number
  firmware: number
  hardware: number
  displaySize: number
  displayMode: number
  lastNetworkStatus: number
  /** Id of the image on screen */
  currentImageIndex: number
  totalNumOfImages: number
  orientation: number
}

/**
 * Decode the frame's basic info reply (pySwitchbot `SwitchbotArtFrame2.get_basic_info`).
 * Returns undefined for a missing, failed or short reply.
 */
export function parseImageFrameInfo(data: Buffer | undefined): ImageFrameInfo | undefined {
  if (!data || data.length < 10 || data[0] !== 1) {
    return undefined
  }
  return {
    batteryCharging: (data[1] & 0x80) !== 0,
    battery: data[1] & 0x7F,
    firmware: data[2] / 10,
    hardware: data[3],
    displaySize: data[4] >> 4,
    displayMode: (data[4] >> 3) & 1,
    lastNetworkStatus: (data[4] >> 2) & 1,
    currentImageIndex: data.readUInt16LE(5),
    totalNumOfImages: data.readUInt16LE(7),
    orientation: data[9],
  }
}

/** The image ids set in a stored-image bitmap: bit b of byte i is image id i * 8 + b + 1 */
export function imageIdsFromBitmap(bitmap: Buffer): number[] {
  const ids: number[] = []
  for (let byteIndex = 0; byteIndex < bitmap.length; byteIndex++) {
    for (let bit = 0; bit < 8; bit++) {
      if (bitmap[byteIndex] & (1 << bit)) {
        ids.push(byteIndex * 8 + bit + 1)
      }
    }
  }
  return ids
}

/**
 * Art Frame 2 (pySwitchbot `SwitchbotArtFrame2`, pySwitchbot 3.10.0): an encrypted image frame
 * with 16-bit image ids. Set the account's key with `device.setKey({ keyId, encryptionKey })`.
 *
 * Status comes from the advertisement. The commands are BLE only.
 */
export class WoArtFrame2 extends SequenceDevice {
  /** Frame state comes from the manufacturer data in advertisements, as in pySwitchbot */
  protected override get readsFromAdvertisement(): boolean {
    return true
  }

  /** Send a BLE command and return its reply; throws when BLE fails or the reply is empty */
  private async exchange(command: readonly number[] | Buffer, operation: string): Promise<Buffer> {
    const result = await this.sendBLECommand(command, false, { validateResponse: false })
    if (!result.success) {
      throw new SwitchbotOperationError(`${this.info.name}: ${operation} failed: ${result.error}`)
    }
    const reply: Buffer | undefined = result.data
    if (!reply || reply.length === 0) {
      throw new SwitchbotOperationError(`${this.info.name}: Sending command failed (result=None operation=${operation})`)
    }
    return reply
  }

  /** Send a command and report whether the frame answered with status 0x01 */
  private async run(command: readonly number[] | Buffer, operation: string): Promise<boolean> {
    const reply = await this.exchange(command, operation)
    return reply[0] === 1
  }

  /**
   * Read the frame settings without downloading the image bitmap (pySwitchbot `get_basic_info`).
   * Returns undefined when the frame refuses the request or the reply is short.
   */
  async getFrameInfo(): Promise<ImageFrameInfo | undefined> {
    const result = await this.sendBLECommand(COMMAND_GET_BASIC_INFO, false, { validateResponse: false })
    if (!result.success) {
      throw new SwitchbotOperationError(`${this.info.name}: getFrameInfo failed: ${result.error}`)
    }
    return parseImageFrameInfo(result.data)
  }

  /**
   * Read the ids of the stored user images, from the frame's packet-ordered bitmap
   * (pySwitchbot `_get_image_indexes`).
   */
  async getImageIds(): Promise<number[]> {
    const bitmap: Buffer[] = []
    let bitmapLength = 0
    let totalPackets = 1
    for (let packet = 0; packet < totalPackets; packet++) {
      const result = await this.sendBLECommand([...COMMAND_GET_IMAGE_BITMAP_PREFIX, packet], false, { validateResponse: false })
      if (!result.success) {
        throw new SwitchbotOperationError(`${this.info.name}: Reading the image bitmap failed: ${result.error}`)
      }
      const data: Buffer | undefined = result.data
      if (
        !data
        || data.length < 4
        || data[0] !== 1
        || data[1] === 0
        || data[2] !== packet
        || (packet > 0 && data[1] !== totalPackets)
        || bitmapLength + data.length - 3 > MAX_IMAGE_BITMAP_BYTES
      ) {
        throw new SwitchbotOperationError(`${this.info.name}: Invalid image bitmap response`)
      }
      totalPackets = data[1]
      bitmap.push(data.subarray(3))
      bitmapLength += data.length - 3
    }
    return imageIdsFromBitmap(Buffer.concat(bitmap))
  }

  private async setImageId(imageId: number): Promise<boolean> {
    const id = Buffer.alloc(2)
    id.writeUInt16LE(imageId)
    return this.run(Buffer.from([...COMMAND_SET_IMAGE_PREFIX, ...id]), 'setImage')
  }

  /** Show the next stored image */
  async nextImage(): Promise<boolean> {
    return this.run(COMMAND_NEXT_IMAGE, 'nextImage')
  }

  /** Show the previous stored image */
  async prevImage(): Promise<boolean> {
    return this.run(COMMAND_PREV_IMAGE, 'prevImage')
  }

  /** Show a random stored user image other than the current one */
  async randomImage(): Promise<boolean> {
    const info = await this.getFrameInfo()
    if (!info) {
      throw new SwitchbotOperationError(`${this.info.name}: Failed to retrieve frame settings`)
    }
    const choices = (await this.getImageIds()).filter(id => id !== info.currentImageIndex)
    if (choices.length === 0) {
      throw new Error('No images available to select from.')
    }
    return this.setImageId(choices[randomInt(choices.length)])
  }

  /** Show a user image by its zero-based position in the stored list */
  async setImage(index: number): Promise<boolean> {
    const ids = await this.getImageIds()
    if (!Number.isInteger(index) || index < 0 || index >= ids.length) {
      throw new RangeError(`Image index ${index} is out of range.`)
    }
    return this.setImageId(ids[index])
  }

  /**
   * Get device status (BLE advertisement first, API fallback)
   */
  async getStatus(): Promise<ImageFrameStatus> {
    return this.getStatusWithFallback<ImageFrameStatus>(
      bleData => ({
        deviceId: this.info.id,
        connectionType: 'ble',
        battery: bleData.battery,
        batteryCharging: bleData.batteryCharging,
        imageIndex: bleData.imageIndex,
        displaySize: bleData.displaySize,
        displayMode: bleData.displayMode,
        lastNetworkStatus: bleData.lastNetworkStatus,
        orientation: bleData.orientation,
        updatedAt: new Date(),
      }),
      apiStatus => ({
        deviceId: this.info.id,
        connectionType: 'api',
        battery: apiStatus.battery,
        version: apiStatus.version,
        updatedAt: new Date(),
      }),
    )
  }
}
