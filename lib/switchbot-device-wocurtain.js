"use strict";
const SwitchbotDevice = require("./switchbot-device.js");

class SwitchbotDeviceWoCurtain extends SwitchbotDevice {
  /* ------------------------------------------------------------------
   * open()
   * - Open the curtain
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  open() {
    return this._operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0x00]);
  }

  /* ------------------------------------------------------------------
   * close()
   * - close the curtain
   *
   * [Arguments]
   * - none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  close() {
    return this._operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0x64]);
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
   * - run to the targe position
   *
   * [Arguments]
   * - percent | number | Required | the percentage of target position
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  runToPos(percent, mode) {
    if (typeof percent != "number") {
      return new Promise((resolve, reject) => {
        reject(
          new Error(
            "The type of target position percentage is incorrent: " +
              typeof percent
          )
        );
      });
    }
    if (mode == null) {
      mode = 0xff;
    } else {
      if (typeof mode != "number") {
        return new Promise((resolve, reject) => {
          reject(
            new Error("The type of running mode is incorrent: " + typeof mode)
          );
        });
      }
      if (mode > 1) {
        mode = 0xff;
      }
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
      let req_buf = Buffer.from(bytes);
      this._command(req_buf)
        .then((res_buf) => {
          let code = res_buf.readUInt8(0);
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
