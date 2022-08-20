"use strict";

class SwitchbotAdvertising {
  constructor() {}

  /* ------------------------------------------------------------------
   * parse(peripheral)
   * - Parse advertising packets coming from switchbot devices
   *
   * [Arguments]
   * - peripheral | Object  | Required | A `Peripheral` object of noble
   *
   * [Return value]
   * - An object as follows:
   *
   * WoHand
   * {
   *   id: 'c12e453e2008',
   *   address: 'c1:2e:45:3e:20:08',
   *   rssi: -43,
   *   serviceData: {
   *     model: 'H',
   *     modelName: 'WoHand',
   *     mode: false,
   *     state: false,
   *     battery: 95
   *   }
   * }
   *
   * WoSensorTH
   * {
   *   id: 'cb4eb903c96d',
   *   address: 'cb:4e:b9:03:c9:6d',
   *   rssi: -54,
   *   serviceData: {
   *     model: 'T',
   *     modelName: 'WoSensorTH',
   *     temperature: { c: 26.2, f: 79.2 },
   *     fahrenheit: false,
   *     humidity: 45,
   *     battery: 100
   *   }
   * }
   *
   * WoCurtain
   * {
   *   id: 'ec58c5d00111',
   *   address: 'ec:58:c5:d0:01:11',
   *   rssi: -39,
   *   serviceData: {
   *     model: 'c',
   *     modelName: 'WoCurtain',
   *     calibration: true,
   *     battery: 91,
   *     position: 1,
   *     lightLevel: 1
   *   }
   * }
   *
   * If the specified `Peripheral` does not represent any switchbot
   * device, this method will return `null`.
   * ---------------------------------------------------------------- */
  parse(peripheral, onlog) {
    let ad = peripheral.advertisement;
    if (!ad || !ad.serviceData) {
      return null;
    }
    let serviceData = ad.serviceData[0] || ad.serviceData;
    let manufacturerData = ad.manufacturerData;
    let buf = serviceData.data;

    const bufIsInvalid = !buf || !Buffer.isBuffer(buf) || buf.length < 3;
    const manufacturerDataIsInvalid =
      !manufacturerData ||
      !Buffer.isBuffer(manufacturerData) ||
      manufacturerData.length < 3;

    if (bufIsInvalid && manufacturerDataIsInvalid) {
      return null;
    }

    let model = buf.slice(0, 1).toString("utf8");
    let sd = null;

    if (model === "H") {
      // WoHand
      sd = this._parseServiceDataForWoHand(buf, onlog);
    } else if (model === "T") {
      // WoSensorTH
      sd = this._parseServiceDataForWoSensorTH(buf, onlog);
    } else if (model === "e") {
      // WoHumi
      sd = this._parseServiceDataForWoHumi(buf, onlog);
    } else if (model === "s") {
      // WoMotion
      sd = this._parseServiceDataForWoPresence(buf, onlog);
    } else if (model === "d") {
      // WoContact
      sd = this._parseServiceDataForWoContact(buf, onlog);
    } else if (model === "c") {
      // WoCurtain
      sd = this._parseServiceDataForWoCurtain(buf, onlog);
    } else if (model === "u") {
      // WoColorBulb
      sd = this._parseServiceDataForWoColorBulb(buf, onlog);
    } else if (model === "g") {
      // WoPlugMini
      sd = this._parseServiceDataForWoPlugMini(buf, onlog);
    } else if (model === "j") {
      // WoPlugMini (JP) ??
      sd = this._parseServiceDataForWoPlugMini(manufacturerData, onlog);
    } else if (model === "o") {
      // WoSmartLock
      sd = this._parseServiceDataForWoSmartLock(buf, onlog);
    } else if (model === "i") {
      // WoMeterPlus
      sd = this._parseServiceDataForWoSensorTHPlus(buf, onlog);
    } else if (model === "r") {
      // WoLEDStripLight
      sd = this._parseServiceDataForWoLEDStripLight(buf, onlog);
    } else {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[parseAdvertising.${peripheral.id}] return null, model "${model}" not available!`
        );
      }
      return null;
    }

    if (!sd) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[parseAdvertising.${peripheral.id}.${model}] return null, parsed serviceData empty!`
        );
      }
      return null;
    }
    let address = peripheral.address || "";
    if (address === "") {
      address = peripheral.advertisement.manufacturerData || "";
      if (address !== "") {
        const str = peripheral.advertisement.manufacturerData
          .toString("hex")
          .slice(4, 16);
        address = str.substr(0, 2);
        for (var i = 2; i < str.length; i += 2) {
          address = address + ":" + str.substr(i, 2);
        }
        // console.log("address", typeof(address), address);
      }
    } else {
      address = address.replace(/-/g, ":");
    }
    let data = {
      id: peripheral.id,
      address: address,
      rssi: peripheral.rssi,
      serviceData: sd,
    };

    if (onlog && typeof onlog === "function") {
      onlog(
        `[parseAdvertising.${peripheral.id}.${model}] return ${JSON.stringify(
          data
        )}`
      );
    }
    return data;
  }

  _parseServiceDataForWoHand(buf, onlog) {
    if (buf.length !== 3) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoHand] Buffer length ${buf.length} !== 3!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);

    let mode = byte1 & 0b10000000 ? true : false; // Whether the light switch Add-on is used or not
    let state = byte1 & 0b01000000 ? true : false; // Whether the switch status is ON or OFF
    let battery = byte2 & 0b01111111; // %

    let data = {
      model: "H",
      modelName: "WoHand",
      mode: mode,
      state: state,
      battery: battery,
    };

    return data;
  }

  _parseServiceDataForWoSensorTH(buf, onlog) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoSensorTH] Buffer length ${buf.length} !== 6!`
        );
      }
      return null;
    }
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    let temp_sign = byte4 & 0b10000000 ? 1 : -1;
    let temp_c = temp_sign * ((byte4 & 0b01111111) + byte3 / 10);
    let temp_f = (temp_c * 9) / 5 + 32;
    temp_f = Math.round(temp_f * 10) / 10;

    let data = {
      model: "T",
      modelName: "WoSensorTH",
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      fahrenheit: byte5 & 0b10000000 ? true : false,
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    };

    return data;
  }

  _parseServiceDataForWoHumi(buf, onlog) {
    if (buf.length !== 8) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoHumi] Buffer length ${buf.length} !== 8!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    // let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    let onState = byte1 & 0b10000000 ? true : false; // 1 - on
    let autoMode = byte4 & 0b10000000 ? true : false; // 1 - auto
    let percentage = byte4 & 0b01111111; // 0-100%, 101/102/103 - Quick gear 1/2/3

    let data = {
      model: "e",
      modelName: "WoHumi",
      onState: onState,
      autoMode: autoMode,
      percentage: autoMode ? 0 : percentage,
    };

    return data;
  }

  _parseServiceDataForWoPresence(buf, onlog) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoPresence] Buffer length ${buf.length} !== 6!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    // let byte3 = buf.readUInt8(3);
    // let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    let pirState = byte1 & 0b01000000 ? true : false; // 1 - Movement detected
    let battery = byte2 & 0b01111111; // %
    let lightLevel = byte5 & 0b00000011;

    let data = {
      model: "s",
      modelName: "WoMotion",
      movement: pirState,
      battery: battery,
      lightLevel:
        lightLevel == 1 ? "dark" : lightLevel == 2 ? "bright" : "unknown",
    };

    return data;
  }

  _parseServiceDataForWoContact(buf, onlog) {
    if (buf.length !== 9) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoContact] Buffer length ${buf.length} !== 9!`
        );
      }
      return null;
    }

    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    // let byte4 = buf.readUInt8(4);
    // let byte5 = buf.readUInt8(5);
    // let byte6 = buf.readUInt8(6);
    // let byte7 = buf.readUInt8(7);
    // let byte8 = buf.readUInt8(8);

    let pirState = byte1 & 0b01000000 ? true : false; // 1 - Movement detected
    let battery = byte2 & 0b01111111; // %
    let hallState = (byte3 >> 1) & 0b00000011;
    let lightLevel = byte3 & 0b00000001;

    let data = {
      model: "d",
      modelName: "WoContact",
      movement: pirState,
      battery: battery,
      doorState:
        hallState == 0
          ? "close"
          : hallState == 1
          ? "open"
          : "timeout no closed",
      lightLevel: lightLevel == 0 ? "dark" : "bright",
    };

    return data;
  }

  _parseServiceDataForWoCurtain(buf, onlog) {
    if (buf.length !== 5 && buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoCurtain] Buffer length ${buf.length} !== 5 or 6!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte4 = buf.readUInt8(4);
    // let byte5 = buf.readUInt8(5);

    let calibration = byte1 & 0b01000000 ? true : false; // Whether the calibration is completed
    let battery = byte2 & 0b01111111; // %
    let currPosition = byte3 & 0b01111111; // current positon %
    let lightLevel = (byte4 >> 4) & 0b00001111; // light sensor level (1-10)

    let data = {
      model: "c",
      modelName: "WoCurtain",
      calibration: calibration,
      battery: battery,
      position: currPosition,
      lightLevel: lightLevel,
    };

    return data;
  }

  _parseServiceDataForWoColorBulb(buf, onlog) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoColorBulb] Buffer length ${buf.length} !== 6!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    // let byte3 = buf.readUInt8(3);
    // let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    let data = {
      model: "u",
      modelName: "WoColorBulb",
    };

    return data;
  }

  _parseServiceDataForWoPlugMini(buf, onlog) {
    if (buf.length !== 14) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoPlugMini] Buffer length ${buf.length} should be 14`
        );
      }
      return null;
    }
    const byte9 = buf.readUInt8(9); // byte9:  plug mini state; 0x00=off, 0x80=on
    const byte10 = buf.readUInt8(10); // byte10: bit0: 0=no delay,1=delay, bit1:0=no timer, 1=timer; bit2:0=no sync time, 1=sync'ed time
    const byte11 = buf.readUInt8(11); // byte11: wifi rssi
    const byte12 = buf.readUInt8(12); // byte12: bit7: overload?
    const byte13 = buf.readUInt8(13); // byte12[bit0~6] + byte13: current power value

    const state = byte9 === 0x00 ? "off" : byte9 === 0x80 ? "on" : null;
    const delay = !!(byte10 & 0b00000001);
    const timer = !!(byte10 & 0b00000010);
    const syncUtcTime = !!(byte10 & 0b00000100);
    const wifiRssi = byte11;
    const overload = !!(byte12 & 0b10000000);
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10; // in watt
    // TODO: voltage ???

    const data = {
      model: "j",
      modelName: "WoPlugMini",
      state: state,
      delay: delay,
      timer: timer,
      syncUtcTime: syncUtcTime,
      wifiRssi: wifiRssi,
      overload: overload,
      currentPower: currentPower,
    };

    return data;
  }

  _parseServiceDataForWoSmartLock(buf, onlog) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoSmartLock] Buffer length ${buf.length} !== 6!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    // let byte3 = buf.readUInt8(3);
    // let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    //let pirState = (byte1 & 0b01000000) ? true : false; // 1 - Movement detected
    let battery = byte2 & 0b01111111; // %
    //let lightLevel = byte5 & 0b00000011;

    let data = {
      model: "o",
      modelName: "WoSmartLock",
      //movement: pirState,
      battery: battery,
      //lightLevel: (lightLevel == 1) ? 'dark' : ((lightLevel == 2) ? 'bright' : 'unknown'),
    };

    return data;
  }

  _parseServiceDataForWoSensorTHPlus(buf, onlog) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoSensorTHPlus] Buffer length ${buf.length} !== 6!`
        );
      }
      return null;
    }
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    let temp_sign = byte4 & 0b10000000 ? 1 : -1;
    let temp_c = temp_sign * ((byte4 & 0b01111111) + byte3 / 10);
    let temp_f = (temp_c * 9) / 5 + 32;
    temp_f = Math.round(temp_f * 10) / 10;

    let data = {
      model: "i",
      modelName: "WoSensorTHPlus",
      temperature: {
        c: temp_c,
        f: temp_f,
      },
      fahrenheit: byte5 & 0b10000000 ? true : false,
      humidity: byte5 & 0b01111111,
      battery: byte2 & 0b01111111,
    };

    return data;
  }

  _parseServiceDataForWoLEDStripLight(buf, onlog) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoLEDStripLight] Buffer length ${buf.length} !== 6!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    // let byte3 = buf.readUInt8(3);
    // let byte4 = buf.readUInt8(4);
    let byte5 = buf.readUInt8(5);

    let data = {
      model: "r",
      modelName: "WoLEDStripLight",
    };

    return data;
  }
}

module.exports = new SwitchbotAdvertising();
