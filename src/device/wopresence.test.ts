import { WoPresence } from './wopresence';
import { SwitchBotBLEModel, SwitchBotBLEModelFriendlyName, SwitchBotBLEModelName } from '../types/types';

describe('WoPresence', () => {
  describe('parseServiceData', () => {
    it('should return null if serviceData length is not 6', async () => {
      const serviceData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
      const onlog = jest.fn();

      const result = await WoPresence.parseServiceData(serviceData, onlog);

      expect(result).toBeNull();
      expect(onlog).toHaveBeenCalledWith('[parseServiceDataForWoPresence] Buffer length 5 !== 6!');
    });

    it('should parse serviceData correctly', async () => {
      const serviceData = Buffer.from([0x00, 0b11000000, 0b01111111, 0x00, 0x00, 0b00111111]);
      const onlog = jest.fn();

      const result = await WoPresence.parseServiceData(serviceData, onlog);

      expect(result).toEqual({
        model: SwitchBotBLEModel.MotionSensor,
        modelName: SwitchBotBLEModelName.MotionSensor,
        modelFriendlyName: SwitchBotBLEModelFriendlyName.MotionSensor,
        tested: true,
        movement: true,
        battery: 127,
        led: 1,
        iot: 1,
        sense_distance: 3,
        lightLevel: 'unknown',
        is_light: true,
      });
      expect(onlog).not.toHaveBeenCalled();
    });

    it('should handle different light levels correctly', async () => {
      const serviceDataDark = Buffer.from([0x00, 0b11000000, 0b01111111, 0x00, 0x00, 0b00111101]);
      const serviceDataBright = Buffer.from([0x00, 0b11000000, 0b01111111, 0x00, 0x00, 0b00111110]);

      const resultDark = await WoPresence.parseServiceData(serviceDataDark, undefined);
      const resultBright = await WoPresence.parseServiceData(serviceDataBright, undefined);

      expect(resultDark?.lightLevel).toBe('dark');
      expect(resultBright?.lightLevel).toBe('bright');
    });
  });
});