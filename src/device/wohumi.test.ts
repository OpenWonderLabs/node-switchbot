// wohumi.test.ts
import { WoHumi } from './wohumi.js';
import { Buffer } from 'buffer';
import noble, { Peripheral } from '@stoprocent/noble';

jest.mock('../device.js', () => {
  return {
    SwitchbotDevice: jest.fn().mockImplementation(() => {
      return {
        command: jest.fn(),
      };
    }),
  };
});

describe('WoHumi', () => {
  let wohumi: WoHumi;

  beforeEach(() => {
    const peripheral = {}; // Replace with the actual peripheral object (e.g. from Noble)
    wohumi = new WoHumi(peripheral as Peripheral, noble);
  });

  test('press should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi');
    await wohumi.press();
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x00]);
  });

  test('turnOn should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi');
    await wohumi.turnOn();
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x01]);
  });

  test('turnOff should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi');
    await wohumi.turnOff();
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x02]);
  });

  test('down should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi');
    await wohumi.down();
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x03]);
  });

  test('up should call operateHumi with correct bytes', async () => {
    const operateHumiSpy = jest.spyOn(wohumi, 'operateHumi');
    await wohumi.up();
    expect(operateHumiSpy).toHaveBeenCalledWith([0x57, 0x01, 0x04]);
  });

  test('operateHumi should handle successful response', async () => {
    const mockCommand = wohumi.command as jest.Mock;
    mockCommand.mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]));

    await expect(wohumi.operateHumi([0x57, 0x01, 0x00])).resolves.toBeUndefined();
  });

  test('operateHumi should handle error response', async () => {
    const mockCommand = wohumi.command as jest.Mock;
    mockCommand.mockResolvedValue(Buffer.from([0x02, 0x00, 0x00]));

    await expect(wohumi.operateHumi([0x57, 0x01, 0x00])).rejects.toThrow('The device returned an error: 0x020000');
  });

  test('operateHumi should handle command rejection', async () => {
    const mockCommand = wohumi.command as jest.Mock;
    mockCommand.mockRejectedValue(new Error('Command failed'));

    await expect(wohumi.operateHumi([0x57, 0x01, 0x00])).rejects.toThrow('Command failed');
  });
});