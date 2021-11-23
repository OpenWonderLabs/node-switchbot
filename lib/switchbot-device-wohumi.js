'use strict';
const SwitchbotDevice = require('./switchbot-device.js');

class SwitchbotDeviceWoHumi extends SwitchbotDevice {

  /* ------------------------------------------------------------------
  * Auto()
  * - Set Mode to Auto
  *
  * [Arguments]
  * - none
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  Auto() {
    return this._operateHumi([0x57, 0x01, 0x80]);
  }

  /* ------------------------------------------------------------------
  * First()
  * - Set Mode to First
  *
  * [Arguments]
  * - none
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  First() {
    return this._operateHumi([0x57, 0x01, 0x65]);
  }

  /* ------------------------------------------------------------------
  * Second()
  * - Set Mode to Second
  *
  * [Arguments]
  * - none
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  Second() {
    return this._operateHumi([0x57, 0x01, 0x66]);
  }

  /* ------------------------------------------------------------------
  * Third()
  * - Set Mode to Third
  *
  * [Arguments]
  * - none
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  Third() {
    return this._operateHumi([0x57, 0x01, 0x67]);
  }

  /* ------------------------------------------------------------------
  * up()
  * - Up
  *
  * [Arguments]
  * - none
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  percentage() {
    return this._operateHumi([0x57, 0x01, 0x01]);
  }

  /* ------------------------------------------------------------------
  * turnOff()
  * - Turn off
  *
  * [Arguments]
  * - none
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  turnOff() {
    return this._operateHumi([0x57, 0x01, 0x02]);
  }  

  _operateHumi(bytes) {
    return new Promise((resolve, reject) => {
      let req_buf = Buffer.from(bytes);
      this._command(req_buf).then((res_buf) => {
        let code = res_buf.readUInt8(0);
        if (res_buf.length === 3 && (code === 0x01 || code === 0x05)) {
          resolve();
        } else {
          reject(new Error('The device returned an error: 0x' + res_buf.toString('hex')));
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }

}

module.exports = SwitchbotDeviceWoHumi;