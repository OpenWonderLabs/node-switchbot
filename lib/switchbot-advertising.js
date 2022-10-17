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

    if (bufIsInvalid || manufacturerDataIsInvalid) {
      return null;
    }

    let model = buf.slice(0, 1).toString("utf8");
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
    } else if (model === "u") {
      sd = this._parseServiceDataForWoBulb(manufacturerData, onlog);// WoBulb
    } else if (model === "g") {
      sd = this._parseServiceDataForWoPlugMiniUS(manufacturerData, onlog);      // WoPlugMini (US)
    } else if (model === "j") {
      sd = this._parseServiceDataForWoPlugMiniJP(manufacturerData, onlog);// WoPlugMini (JP)
    } else if (model === "o") {
      sd = this._parseServiceDataForWoSmartLock(buf, onlog);// WoSmartLock
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
    let temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10);
    let temp_f = (temp_c * 9 / 5) + 32;
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
    let byte4 = buf.readUInt8(4);
    

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
    let byte5 = buf.readUInt8(5);


    let tested = byte1 & 0b10000000 ? true : false;
    let movement = byte1 & 0b01000000 ? true : false;
    let battery = byte2 & 0b01111111;
    let led = (byte5 & 0b00100000) >> 5;
    let iot = (byte5 & 0b00010000) >> 4;
    let sense_distance = (byte5 & 0b00001100) >> 2;
    let lightLevel = byte5 & 0b00000011;
    let is_light = byte5 & 0b00000010 ? true : false;

    let data = {
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

    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte8 = buf.readUInt8(8);

    let hallState = (byte3 >> 1) & 0b00000011;
    let tested = byte1 & 0b10000000;
    let movement = byte1 & 0b01000000 ? true : false; // 1 - Movement detected
    let battery = byte2 & 0b01111111; // %
    let contact_open = byte3 & 0b00000010 == 0b00000010;
    let contact_timeout = byte3 & 0b00000100 == 0b00000100;
    let lightLevel = byte3 & 0b00000001;
    let button_count = byte8 & 0b00001111;

    let data = {
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
    let byte1 = buf.readUInt8(1);
    let byte2 = buf.readUInt8(2);
    let byte3 = buf.readUInt8(3);
    let byte4 = buf.readUInt8(4);

    let calibration = byte1 & 0b01000000 ? true : false; // Whether the calibration is completed
    let battery = byte2 & 0b01111111; // %
    let inMotion = byte3 & 0b10000000 ? true : false;
    let currPosition = byte3 & 0b01111111; // current positon %
    //let currPosition = max(min(byte3 & 0b01111111, 100), 0) //byte3 & 0b01111111; // current positon %
    let lightLevel = (byte4 >> 4) & 0b00001111; // light sensor level (1-10)
    let deviceChain = byte4 & 0b00000111;

    let data = {
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

  _parseServiceDataForWoBulb(buf, onlog) {
    if (buf.length !== 13) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoBulb] Buffer length ${buf.length} !== 13!`
        );
      }
      return null;
    }

    let byte6 = buf.readUInt8(6);
    let byte7 = buf.readUInt8(7);
    let byte8 = buf.readUInt8(8);
    let byte9 = buf.readUInt8(9);
    let byte10 = buf.readUInt8(10);


    let sequence_number = byte6;
    let state = byte7 & 0b01111111 ? true : false;
    let brightness = byte7 & 0b01111111;
    let delay = byte8 & 0b10000000;
    let preset = byte8 & 0b00001000;
    let color_mode = byte8 & 0b00000111;
    let speed = byte9 & 0b01111111;
    let loop_index = byte10 & 0b11111110;

    let data = {
      model: "u",
      modelName: "WoBulb",
      sequence_number: sequence_number,
      state: state,
      brightness: brightness,
      delay: delay,
      preset: preset,
      color_mode: color_mode,
      speed: speed,
      loop_index: loop_index,
    };

    return data;
  }

  _parseServiceDataForWoPlugMiniUS(buf, onlog) {
    if (buf.length !== 14) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoPlugMiniUS] Buffer length ${buf.length} should be 14`
        );
      }
      return null;
    }
    let byte9 = buf.readUInt8(9); // byte9:  plug mini state; 0x00=off, 0x80=on
    let byte10 = buf.readUInt8(10); // byte10: bit0: 0=no delay,1=delay, bit1:0=no timer, 1=timer; bit2:0=no sync time, 1=sync'ed time
    let byte11 = buf.readUInt8(11); // byte11: wifi rssi
    let byte12 = buf.readUInt8(12); // byte12: bit7: overload?
    let byte13 = buf.readUInt8(13); // byte12[bit0~6] + byte13: current power value

    let state = byte9 === 0x00 ? "off" : byte9 === 0x80 ? "on" : null;
    let delay = !!(byte10 & 0b00000001);
    let timer = !!(byte10 & 0b00000010);
    let syncUtcTime = !!(byte10 & 0b00000100);
    let wifiRssi = byte11;
    let overload = !!(byte12 & 0b10000000);
    let currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10; // in watt
    // TODO: voltage ???

    let data = {
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

  _parseServiceDataForWoPlugMiniJP(buf, onlog) {
    if (buf.length !== 14) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoPlugMiniJP] Buffer length ${buf.length} should be 14`
        );
      }
      return null;
    }
    let byte9 = buf.readUInt8(9); // byte9:  plug mini state; 0x00=off, 0x80=on
    let byte10 = buf.readUInt8(10); // byte10: bit0: 0=no delay,1=delay, bit1:0=no timer, 1=timer; bit2:0=no sync time, 1=sync'ed time
    let byte11 = buf.readUInt8(11); // byte11: wifi rssi
    let byte12 = buf.readUInt8(12); // byte12: bit7: overload?
    let byte13 = buf.readUInt8(13); // byte12[bit0~6] + byte13: current power value

    let state = byte9 === 0x00 ? "off" : byte9 === 0x80 ? "on" : null;
    let delay = !!(byte10 & 0b00000001);
    let timer = !!(byte10 & 0b00000010);
    let syncUtcTime = !!(byte10 & 0b00000100);
    let wifiRssi = byte11;
    let overload = !!(byte12 & 0b10000000);
    let currentPower = (((byte12 & 0b01111111) << 8) + byte13) / 10; // in watt
    // TODO: voltage ???

    let data = {
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

    let movement = (byte1 & 0b01000000) ? true : false; // 1 - Movement detected
    let battery = byte2 & 0b01111111; // %

    let data = {
      model: "o",
      modelName: "WoSmartLock",
      battery: battery,
      movement: movement,
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
    let temp_c = temp_sign * ((byte4 & 0b01111111) + (byte3 & 0b00001111) / 10);
    let temp_f = (temp_c * 9 / 5) + 32;
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

  _parseServiceDataForWoStrip(buf, onlog) {
    if (buf.length !== 18) {
      if (onlog && typeof onlog === "function") {
        onlog(
          `[_parseServiceDataForWoStrip] Buffer length ${buf.length} !== 18!`
        );
      }
      return null;
    }

    let byte7 = buf.readUInt8(7);
    let byte8 = buf.readUInt8(8);
    let byte9 = buf.readUInt8(9);
    let byte10 = buf.readUInt8(10);

    let state = byte7 & 0b10000000 ? true : false;
    let brightness = byte7 & 0b01111111;
    let delay = byte8 & 0b10000000;
    let preset = byte8 & 0b00001000;
    let color_mode = byte8 & 0b00000111;
    let speed = byte9 & 0b01111111;
    let loop_index = byte10 & 0b11111110;

    let data = {
      model: "r",
      modelName: "WoStrip",
      state: state,
      brightness: brightness,
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
