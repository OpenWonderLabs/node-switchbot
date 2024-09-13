/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * wohumi.ts: Switchbot BLE API registration.
 */
import { Buffer } from 'node:buffer'

import { SwitchbotDevice } from '../device.js'
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types.js'

export class WoHumi extends SwitchbotDevice {
  static parseServiceData(buf: Buffer, onlog: ((message: string) => void) | undefined) {
    if (buf.length !== 8) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoHumi] Buffer length ${buf.length} !== 8!`,
        )
      }
      return null
    }
    const byte1 = buf.readUInt8(1)
    const byte4 = buf.readUInt8(4)

    const onState = !!(byte1 & 0b10000000) // 1 - on
    const autoMode = !!(byte4 & 0b10000000) // 1 - auto
    const percentage = byte4 & 0b01111111 // 0-100%, 101/102/103 - Quick gear 1/2/3
    const humidity = autoMode ? 0 : percentage === 101 ? 33 : percentage === 102 ? 66 : percentage === 103 ? 100 : percentage

    const data = {
      model: SwitchBotBLEModel.Humidifier,
      modelName: SwitchBotBLEModelName.Humidifier,
      modelFriendlyName: SwitchBotBLEModelFriendlyName.Humidifier,
      onState,
      autoMode,
      percentage: autoMode ? 0 : percentage,
      humidity,
    }

    return data
  }

  /* ------------------------------------------------------------------
   * press()
   * - Press
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  press() {
    return this._operateBot([0x57, 0x01, 0x00])
  }

  /* ------------------------------------------------------------------
   * turnOn()
   * - Turn on
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  turnOn() {
    return this._operateBot([0x57, 0x01, 0x01])
  }

  /* ------------------------------------------------------------------
   * turnOff()
   * - Turn off
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  turnOff() {
    return this._operateBot([0x57, 0x01, 0x02])
  }

  /* ------------------------------------------------------------------
   * down()
   * - Down
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  down() {
    return this._operateBot([0x57, 0x01, 0x03])
  }

  /* ------------------------------------------------------------------
   * up()
   * - Up
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  up() {
    return this._operateBot([0x57, 0x01, 0x04])
  }

  _operateBot(bytes: number[]) {
    return new Promise<void>((resolve, reject) => {
      const req_buf = Buffer.from(bytes)
      this._command(req_buf)
        .then((res_buf) => {
          const code = res_buf.readUInt8(0)
          if (res_buf.length === 3 && (code === 0x01 || code === 0x05)) {
            resolve()
          } else {
            reject(
              new Error(
                `The device returned an error: 0x${res_buf.toString('hex')}`,
              ),
            )
          }
        })
        .catch((error) => {
          reject(error)
        })
    })
  }
}
