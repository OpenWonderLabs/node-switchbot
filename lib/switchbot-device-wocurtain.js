"use strict";

const { Buffer } = require('buffer');

const SwitchbotDevice = require("./switchbot-device.js");

class SwitchbotDeviceWoCurtain extends SwitchbotDevice {
  /* ------------------------------------------------------------------
   * open()
   * - Open the curtain
   *
   * [Arguments]
   * - mode | number | Opetional | runing mode (0x01 = QuietDrift, 0xff = Default)
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  open(mode) {
    return this.runToPos(0, mode);
  }

  /* ------------------------------------------------------------------
   * close()
   * - close the curtain
   *
   * [Arguments]
   * - mode | number | Opetional | runing mode (0x01 = QuietDrift, 0xff = Default)
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  close(mode) {
    return this.runToPos(100, mode);
  }

  /* ------------------------------------------------------------------
   * pause()
   * - pause the curtain
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  pause() {
    return this._operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x00, 0xff]);
  }

  /* ------------------------------------------------------------------
   * runToPos()
   * - run to the target position
   *
   * [Arguments]
   * - percent | number | Required  | the percentage of target position
   * - mode    | number | Opetional | runing mode (0x01 = QuietDrift, 0xff = Default)
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  runToPos(percent, mode = 0xff) {
    if (typeof percent != "number") {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            "The type of target position percentage is incorrect: " +
              typeof percent
          )
        );
      });
    }
    if (typeof mode != "number") {
      return new Promise((resolve, reject) => {
        reject(
          new Error("The type of running mode is incorrect: " + typeof mode)
        );
      });
    }
    if (mode > 1) {
      mode = 0xff;
    }
    if (percent > 100) {
      percent = 100;
    } else if (percent < 0) {
      percent = 0;
    }
    return this._operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x05, mode, percent]);
  }

  _operateCurtain(bytes) {
    return new Promise((resolve, reject) => {
      const req_buf = Buffer.from(bytes);
      this._command(req_buf)
        .then((res_buf) => {
          const code = res_buf.readUInt8(0);
          if (res_buf.length === 3 && code === 0x01) {
            resolve();
          } else {
            reject(
              new Error(
                "The device returned an error: 0x" + res_buf.toString("hex")
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

module.exports = SwitchbotDeviceWoCurtain;
