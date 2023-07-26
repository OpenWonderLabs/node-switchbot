"use strict";

const { Buffer } = require('buffer');

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
    const ad = peripheral.advertisement;
    if (!ad || !ad.serviceData) {
      return null;
    }
    const serviceData = ad.serviceData[0] || ad.serviceData;
    const manufacturerData = ad.manufacturerData;
    const buf = serviceData.data;

    const bufIsInvalid = !buf || !Buffer.isBuffer(buf) || buf.length < 3;
    const manufacturerDataIsInvalid =
      !manufacturerData ||
      !Buffer.isBuffer(manufacturerData) ||
      manufacturerData.length < 3;

    if (bufIsInvalid || manufacturerDataIsInvalid) {
      return null;
    }

    const model = buf.slice(0, 1).toString("utf8");
    let sd = null;

    if (model === "H") {
      sd = this._parseServiceDataForWoHand(buf, onlog);//WoHand
    } else if (model === "T") {
      sd = this._parseServiceDataForWoSensorTH(buf, onlog);//WoSensorTH
    } else if (model === "e") {
      sd = this._parseServiceDataForWoHumi(buf, onlog);//WoHumi
    } else if (model === "s") {
      sd = this._parseServiceDataForWoPresence(buf, onlog);//WoPresence
    } else if (model === "d") {
      sd = this._parseServiceDataForWoContact(buf, onlog);//WoContact
    } else if (model === "c") {
      sd = this._parseServiceDataForWoCurtain(buf, onlog);// WoCurtain
    } else if (model === "x") {
      sd = this._parseServiceDataForWoBlindTilt(buf, onlog);// WoBlindTilt
    } else if (model === "u") {
      sd = this._parseServiceDataForWoBulb(manufacturerData, onlog);// WoBulb
    } else if (model === "g") {
      sd = this._parseServiceDataForWoPlugMiniUS(manufacturerData, onlog);      // WoPlugMini (US)
    } else if (model === "j") {
      sd = this._parseServiceDataForWoPlugMiniJP(manufacturerData, onlog);// WoPlugMini (JP)
    } else if (model === "o") {
      sd = this._parseServiceDataForWoSmartLock(manufacturerData, onlog);// WoSmartLock
    } else if (model === "i") {
      sd = this._parseServiceDataForWoSensorTHPlus(buf, onlog);// WoMeterPlus
    } else if (model === "r") {
      sd = this._parseServiceDataForWoStrip(buf, onlog);// WoStrip
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
    const data = {
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
    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);

    const mode = byte1 & 0b10000000 ? true : false; // Whether the light switch Add-on is used or not
    const state = byte1 & 0b01000000 ? true : false; // Whether the switch status is ON or OFF
    const battery = byte2 & 0b01111111; // %

    const data = {
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
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte4 = buf.readUInt8(4);
    const byte5 = buf.readUInt8(5);

    const temp_sign = byte4 & 0b10000000 ? 1 : -1;
    const temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10);
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10;

    const data = {
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
    const byte1 = buf.readUInt8(1);
    const byte4 = buf.readUInt8(4);
    

    const onState = byte1 & 0b10000000 ? true : false; // 1 - on
    const autoMode = byte4 & 0b10000000 ? true : false; // 1 - auto
    const percentage = byte4 & 0b01111111; // 0-100%, 101/102/103 - Quick gear 1/2/3

    const data = {
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

    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);
    const byte5 = buf.readUInt8(5);

    const tested = byte1 & 0b10000000 ? true : false;
    const movement = byte1 & 0b01000000 ? true : false;
    const battery = byte2 & 0b01111111;
    const led = (byte5 & 0b00100000) >> 5;
    const iot = (byte5 & 0b00010000) >> 4;
    const sense_distance = (byte5 & 0b00001100) >> 2;
    const lightLevel = byte5 & 0b00000011;
    const is_light = byte5 & 0b00000010 ? true : false;

    const data = {
      model: "s",
      modelName: "WoMotion",
      tested: tested,
      movement: movement,
      battery: battery,
      led: led,
      iot: iot,
      sense_distance: sense_distance,
      lightLevel:
        lightLevel == 1 ? "dark" : lightLevel == 2 ? "bright" : "unknown",
      is_light: is_light,
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

    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte8 = buf.readUInt8(8);

    const hallState = (byte3 >> 1) & 0b00000011;
    const tested = byte1 & 0b10000000;
    const movement = byte1 & 0b01000000 ? true : false; // 1 - Movement detected
    const battery = byte2 & 0b01111111; // %
    const contact_open = byte3 & 0b00000010 == 0b00000010;
    const contact_timeout = byte3 & 0b00000100 == 0b00000100;
    const lightLevel = byte3 & 0b00000001;
    const button_count = byte8 & 0b00001111;

    const data = {
      model: "d",
      modelName: "WoContact",
      movement: movement,
      tested: tested,
      battery: battery,
      contact_open: contact_open,
      contact_timeout: contact_timeout,
      lightLevel: lightLevel == 0 ? "dark" : "bright",
      button_count: button_count,
      doorState:
        hallState == 0
          ? "close"
          : hallState == 1
          ? "open"
          : "timeout no closed",
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
    const byte1 = buf.readUInt8(1);
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte4 = buf.readUInt8(4);

    const calibration = byte1 & 0b01000000 ? true : false; // Whether the calibration is compconsted
    const battery = byte2 & 0b01111111; // %
    const inMotion = byte3 & 0b10000000 ? true : false;
    const currPosition = byte3 & 0b01111111; // current positon %
    const lightLevel = (byte4 >> 4) & 0b00001111; // light sensor level (1-10)
    const deviceChain = byte4 & 0b00000111;

    const data = {
      model: "c",
      modelName: "WoCurtain",
      calibration: calibration,
      battery: battery,
      inMotion: inMotion,
      position: currPosition,
      lightLevel: lightLevel,
      deviceChain: deviceChain,
    };

    return data;
  }

  _parseServiceDataForWoBlindTilt(buf, onlog) {
    if (buf.length !== 5 && buf.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoBlindTilt] Buffer length ${buf.length} !== 5 or 6!`
        );
      }
      return null;
    }
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);

    let calibration = byte1 & 0b00000001 ? true : false; // Whether the calibration is completed
    let battery = byte2 & 0b01111111; // %
    let inMotion = byte2 & 0b10000000 ? true : false;
    let tilt = byte2 & 0b01111111; // current tilt % (100 - _tilt) if reverse else _tilt,
    let lightLevel = (byte1 >> 4) & 0b00001111; // light sensor level (1-10)

    let data = {
      model: "x",
      modelName: "WoBlindTilt",
      calibration: calibration,
      battery: battery,
      inMotion: inMotion,
      tilt: tilt,
      lightLevel: lightLevel,
    };

    return data;
  }

  _parseServiceDataForWoBulb(manufacturerData, onlog) {
    if (manufacturerData.length !== 13) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoBulb] Buffer length ${manufacturerData.length} !== 13!`
        );
      }
      return null;
    }
    const byte1 = manufacturerData.readUInt8(1);//power and light status
    //const byte2 = manufacturerData.readUInt8(2);//bulb brightness
    const byte3 = manufacturerData.readUInt8(3);//bulb R
    const byte4 = manufacturerData.readUInt8(4);//bulb G
    const byte5 = manufacturerData.readUInt8(5);//bulb B
    const byte6 = manufacturerData.readUInt8(6);//bulb temperature
    const byte7 = manufacturerData.readUInt8(7);
    const byte8 = manufacturerData.readUInt8(8);
    const byte9 = manufacturerData.readUInt8(9);
    const byte10 = manufacturerData.readUInt8(10);//bulb mode

    const power = byte1;
    const red = byte3;
    const green = byte4;
    const blue = byte5;
    const color_temperature = byte6;
    const state = byte7 & 0b01111111 ? true : false;
    const brightness = byte7 & 0b01111111;
    const delay = byte8 & 0b10000000;
    const preset = byte8 & 0b00001000;
    const color_mode = byte8 & 0b00000111;
    const speed = byte9 & 0b01111111;
    const loop_index = byte10 & 0b11111110;

    const data = {
      model: "u",
      modelName: "WoBulb",
      color_temperature: color_temperature,
      power: power,
      state: state,
      red: red,
      green: green,
      blue: blue,
      brightness: brightness,
      delay: delay,
      preset: preset,
      color_mode: color_mode,
      speed: speed,
      loop_index: loop_index,
    };

    return data;
  }

  _parseServiceDataForWoPlugMiniUS(manufacturerData, onlog) {
    if (manufacturerData.length !== 14) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoPlugMiniUS] Buffer length ${manufacturerData.length} should be 14`
        );
      }
      return null;
    }
    const byte9 = manufacturerData.readUInt8(9); // byte9:  plug mini state; 0x00=off, 0x80=on
    const byte10 = manufacturerData.readUInt8(10); // byte10: bit0: 0=no delay,1=delay, bit1:0=no timer, 1=timer; bit2:0=no sync time, 1=sync'ed time
    const byte11 = manufacturerData.readUInt8(11); // byte11: wifi rssi
    const byte12 = manufacturerData.readUInt8(12); // byte12: bit7: overload?
    const byte13 = manufacturerData.readUInt8(13); // byte12[bit0~6] + byte13: current power value

    const state = byte9 === 0x00 ? "off" : byte9 === 0x80 ? "on" : null;
    const delay = !!(byte10 & 0b00000001);
    const timer = !!(byte10 & 0b00000010);
    const syncUtcTime = !!(byte10 & 0b00000100);
    const wifiRssi = byte11;
    const overload = !!(byte12 & 0b10000000);
    const currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10; // in watt
    // TODO: voltage ???

    const data = {
      model: "g",
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

  _parseServiceDataForWoPlugMiniJP(manufacturerData, onlog) {
    if (manufacturerData.length !== 14) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoPlugMiniJP] Buffer length ${manufacturerData.length} should be 14`
        );
      }
      return null;
    }
    const byte9 = manufacturerData.readUInt8(9); // byte9:  plug mini state; 0x00=off, 0x80=on
    const byte10 = manufacturerData.readUInt8(10); // byte10: bit0: 0=no delay,1=delay, bit1:0=no timer, 1=timer; bit2:0=no sync time, 1=sync'ed time
    const byte11 = manufacturerData.readUInt8(11); // byte11: wifi rssi
    const byte12 = manufacturerData.readUInt8(12); // byte12: bit7: overload?
    const byte13 = manufacturerData.readUInt8(13); // byte12[bit0~6] + byte13: current power value

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

  _parseServiceDataForWoSmartLock(manufacturerData, onlog) {
    if (manufacturerData.length !== 6) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoSmartLock] Buffer length ${manufacturerData.length} !== 6!`
        );
      }
      return null;
    }
    const byte2 = manufacturerData.readUInt8(2);
    const byte7 = manufacturerData.readUInt8(7);
    const byte8 = manufacturerData.readUInt8(8);

    
    const LockStatus = {
      LOCKED: 0b0000000,
      UNLOCKED: 0b0010000,
      LOCKING: 0b0100000,
      UNLOCKING: 0b0110000,
      LOCKING_STOP: 0b1000000,
      UNLOCKING_STOP: 0b1010000,
      NOT_FULLY_LOCKED: 0b1100000,  //Only EU lock type
     }

    const battery = byte2 & 0b01111111; // %
    const calibration = byte7 & 0b10000000 ? true : false;
    const status = LockStatus(byte7 & 0b01110000);
    const update_from_secondary_lock = byte7 & 0b00001000 ? true : false;
    const door_open = byte7 & 0b00000100 ? true : false;
    const double_lock_mode = byte8 & 0b10000000 ? true : false;
    const unclosed_alarm = byte8 & 0b00100000 ? true : false;
    const unlocked_alarm = byte8 & 0b00010000 ? true : false;
    const auto_lock_paused = byte8 & 0b00000010 ? true : false;

    const data = {
      model: "o",
      modelName: "WoSmartLock",
      battery: battery,
      calibration: calibration,
      status: status,
      update_from_secondary_lock: update_from_secondary_lock,
      door_open: door_open,
      double_lock_mode: double_lock_mode,
      unclosed_alarm: unclosed_alarm,
      unlocked_alarm: unlocked_alarm,
      auto_lock_paused: auto_lock_paused,
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
    const byte2 = buf.readUInt8(2);
    const byte3 = buf.readUInt8(3);
    const byte4 = buf.readUInt8(4);
    const byte5 = buf.readUInt8(5);

    const temp_sign = byte4 & 0b10000000 ? 1 : -1;
    const temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10);
    const temp_f = Math.round(((temp_c * 9 / 5) + 32) * 10) / 10;

    const data = {
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

  _parseServiceDataForWoStrip(buf, onlog) {
    if (buf.length !== 18) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoStrip] Buffer length ${buf.length} !== 18!`
        );
      }
      return null;
    }

    //const byte1 = buf.readUInt8(1);//power and light status
    //const byte2 = buf.readUInt8(2);//bulb brightness
    const byte3 = buf.readUInt8(3);//bulb R
    const byte4 = buf.readUInt8(4);//bulb G
    const byte5 = buf.readUInt8(5);//bulb B
    const byte7 = buf.readUInt8(7);
    const byte8 = buf.readUInt8(8);
    const byte9 = buf.readUInt8(9);
    const byte10 = buf.readUInt8(10);

    const state = byte7 & 0b10000000 ? true : false;
    const brightness = byte7 & 0b01111111;
    const red = byte3;
    const green = byte4;
    const blue = byte5;
    const delay = byte8 & 0b10000000;
    const preset = byte8 & 0b00001000;
    const color_mode = byte8 & 0b00000111;
    const speed = byte9 & 0b01111111;
    const loop_index = byte10 & 0b11111110;

    const data = {
      model: "r",
      modelName: "WoStrip",
      state: state,
      brightness: brightness,
      red: red,
      green: green,
      blue: blue,
      delay: delay,
      preset: preset,
      color_mode: color_mode,
      speed: speed,
      loop_index: loop_index,
    };

    return data;
  }
}

module.exports = new SwitchbotAdvertising();
