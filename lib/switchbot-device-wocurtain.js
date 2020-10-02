/* ------------------------------------------------------------------
* node-linking - switchbot-device-wocurtain.js
*
* Copyright (c) 2019-2020, Futomi Hatano, All rights reserved.
* Copyright (c) 2020, @cocoabox, All rights reserved.
* Released under the MIT license
* Date: 2020-10-02
* ---------------------------------------------------------------- */
'use strict';
const SwitchbotDevice = require('./switchbot-device.js');

class SwitchbotDeviceWoCurtain extends SwitchbotDevice {
    /**
     * 両側の開閉状態を設定する。予めAppからペアリング・グルーピング・キャリブレーションを
     * やっておく必要がある
     * @param {number} leftPercent     must be [0..100]
     * @param {number} rightPercent    must be [0..100]
     */
    setPercentBothSides(leftPercent, rightPercent) {
        const cmd = 15;
        const vals = [leftPercent, rightPercent,
            leftPercent + rightPercent]; // ３番目は和？Checksum的な？？

        let p = this._operateBot([].concat([0x57, cmd,
            69, // set motion
            1,  // 1=move, 0=stop
            1,  // 1=set percent
            vals.length,
        ], vals));
        console.log("P=", p);
        return p;
    }

    /**
     * 片方または未グルーピングのWoCurtainの開閉状態をSETする。
     * @param {number} percent      must be [0..100]
     */
    setPercent(percent) {
        const cmd = 15;
        const vals = [percent];

        let p = this._operateBot([].concat([0x57, cmd,
            69, // set motion
            1,  // 1=move, 0=stop
            1,  // 1=set percent
            vals.length,
        ], vals));
        console.log("P=", p);
        return p;
    }

    _operateBot(bytes) {
        return new Promise((resolve, reject) => {
            let req_buf = Buffer.from(bytes);
            this._command(req_buf).then((res_buf) => {
                let code = res_buf.readUInt8(0);
                if (res_buf.length === 3 && (code === 0x01 || code === 0x05)) {
                    // res_buf[1] = initial position LEFT  (100=close, 0=open)
                    // res_buf[2] = initial position RIGHT (100=close, 0=open)
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

module.exports = SwitchbotDeviceWoCurtain;
