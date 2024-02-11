import { SwitchbotDevice } from '../device.js';

export class WoPresence extends SwitchbotDevice {
  static parseServiceData(buf: Buffer, onlog: ((message: string) => void) | undefined) {
    if (buf.length !== 6) {
      if (onlog && typeof onlog === 'function') {
        onlog(
          `[parseServiceDataForWoPresence] Buffer length ${buf.length} !== 6!`,
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
      model: 's',
      modelName: 'WoMotion',
      tested: tested,
      movement: movement,
      battery: battery,
      led: led,
      iot: iot,
      sense_distance: sense_distance,
      lightLevel:
                lightLevel === 1 ? 'dark' : lightLevel === 2 ? 'bright' : 'unknown',
      is_light: is_light,
    };

    return data;
  }
}
