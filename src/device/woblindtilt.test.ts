import { beforeEach, describe, it } from 'node:test';
import { WoBlindTilt } from './woblindtilt.js';
import noble, { type Peripheral } from '@stoprocent/noble';

describe('WoBlindTilt', () => {
  let woBlindTilt: WoBlindTilt;

  beforeEach(() => {
    const peripheral = {}; // Replace with the actual peripheral object
    woBlindTilt = new WoBlindTilt(peripheral as Peripheral, noble); // Replace 'noble' with the actual Noble object
  });

  describe('pause', () => {
    it('should pause the blind tilt operation', async () => {
      // Mock the _operateBlindTilt method
      const operateBlindTiltMock = jest.spyOn(woBlindTilt, '_operateBlindTilt')
        .mockResolvedValueOnce(undefined);

      await woBlindTilt.pause();

      expect(operateBlindTiltMock).toHaveBeenCalledWith([0x57, 0x0f, 0x45, 0x01, 0x00, 0xff]);
    });

    it('should handle errors correctly', async () => {
      // Mock the _operateBlindTilt method to throw an error
      jest.spyOn(woBlindTilt, '_operateBlindTilt')
        .mockRejectedValueOnce(new Error('Operation failed'));

      await expect(woBlindTilt.pause()).rejects.toThrow('Operation failed');
    });
  });
});
