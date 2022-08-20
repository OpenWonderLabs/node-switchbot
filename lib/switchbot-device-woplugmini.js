"use strict";
const SwitchbotDevice = require("./switchbot-device.js");

/**
 * @see https://github.com/OpenWonderLabs/SwitchBotAPI-BLE/blob/latest/devicetypes/plugmini.md
 */
class SwitchbotDeviceWoPlugMini extends SwitchbotDevice {
  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  readState() {
    return this._operateBot([0x57, 0x0f, 0x51, 0x01]);
  }

  /**
   * @private
   */
  _setState(reqByteArray) {
    const base = [0x57, 0x0f, 0x50, 0x01];
    return this._operateBot([].concat(base, reqByteArray));
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  turnOn() {
    return this._setState([0x01, 0x80]);
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  turnOff() {
    return this._setState([0x01, 0x00]);
  }

  /**
   * @returns {Promise<boolean>} resolves with a boolean that tells whether the plug in ON(true) or OFF(false)
   */
  toggle() {
    return this._setState([0x02, 0x80]);
  }

  /**
   * @private
   */
  _operateBot(bytes) {
    const req_buf = Buffer.from(bytes);
    return new Promise((resolve, reject) => {
      this._command(req_buf)
        .then((res_bytes) => {
          const res_buf = Buffer.from(res_bytes);
          if (res_buf.length === 2) {
            let code = res_buf.readUInt8(1);
            if (code === 0x00 || code === 0x80) {
              const is_on = code === 0x80;
              resolve(is_on);
            } else {
              reject(
                new Error(
                  "The device returned an error: 0x" + res_buf.toString("hex")
                )
              );
            }
          } else {
            reject(
              new Error(
                "Expecting a 2-byte response, got instead: 0x" +
                  res_buf.toString("hex")
              )
            );
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

module.exports = SwitchbotDeviceWoPlugMini;
