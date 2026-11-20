/* Copyright(C) 2024-2026, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * utils/image-frame-advertisement.ts: Art Frame 2 and E Ink Photo Magnet state from advertisements
 *
 * Ported from pySwitchbot (switchbot/adv_parsers/image_frame.py). `mfr` is the SwitchBot
 * manufacturer data payload after the 2-byte company ID (0x0969), as pySwitchbot's `mfr_data`:
 * bytes 0-5 are the MAC address.
 */

import type { Buffer } from 'node:buffer'

/** Frame state parsed from an advertisement */
export interface ImageFrameAdvertisement {
  sequenceNumber: number
  batteryCharging: boolean
  battery: number
  /** Id of the image on screen (16-bit, little endian) */
  imageIndex: number
  /** Display size code, the high nibble of the flags byte */
  displaySize: number
  /** Bit 3 of the flags byte */
  displayMode: number
  /** Bit 2 of the flags byte */
  lastNetworkStatus: number
  /** Bit 1 of the flags byte */
  orientation: number
}

/**
 * Parse an Art Frame 2 or E Ink Photo Magnet advertisement (pySwitchbot `process_image_frame`).
 * Returns undefined when the manufacturer data is missing or shorter than 11 bytes.
 */
export function parseImageFrameAdvertisement(mfr: Buffer | undefined): ImageFrameAdvertisement | undefined {
  if (!mfr || mfr.length < 11) {
    return undefined
  }
  const flags = mfr[10]
  return {
    sequenceNumber: mfr[6],
    batteryCharging: (mfr[7] & 0x80) !== 0,
    battery: mfr[7] & 0x7F,
    imageIndex: mfr.readUInt16LE(8),
    displaySize: flags >> 4,
    displayMode: (flags >> 3) & 1,
    lastNetworkStatus: (flags >> 2) & 1,
    orientation: (flags >> 1) & 1,
  }
}

/** Device types (PRODUCT_ID_MODEL_MAP names) that advertise in the image frame layout */
export const IMAGE_FRAME_DEVICE_TYPES: ReadonlySet<string> = new Set(['Art Frame 2', 'E Ink Photo Magnet'])
