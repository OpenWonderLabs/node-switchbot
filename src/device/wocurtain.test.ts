import { WoCurtain } from './wocurtain';
import { Buffer } from 'buffer';
import noble, { Peripheral } from '@stoprocent/noble';

describe('WoCurtain', () => {
  let curtain: WoCurtain;

  beforeEach(() => {
    const peripheral = {}; // Replace with the actual peripheral object (e.g. from Noble)
    curtain = new WoCurtain(peripheral as Peripheral, noble);
    curtain.command = jest.fn().mockResolvedValue(Buffer.from([0x01, 0x00, 0x00]));
  });

  test('runToPos should throw error for incorrect percent type', async () => {
    await expect(curtain.runToPos('50' as any)).rejects.toThrow('The type of target position percentage is incorrect: string');
  });

  test('runToPos should throw error for incorrect mode type', async () => {
    await expect(curtain.runToPos(50, '0xff' as any)).rejects.toThrow('The type of running mode is incorrect: string');
  });

  test('runToPos should set percent to 100 if greater than 100', async () => {
    await curtain.runToPos(150);
    expect(curtain.command).toHaveBeenCalledWith(Buffer.from([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 100]));
  });

  test('runToPos should set percent to 0 if less than 0', async () => {
    await curtain.runToPos(-10);
    expect(curtain.command).toHaveBeenCalledWith(Buffer.from([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 0]));
  });

  test('operateCurtain should throw error for incorrect response', async () => {
    curtain.command = jest.fn().mockResolvedValue(Buffer.from([0x02, 0x00, 0x00]));
    await expect(curtain.operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 50])).rejects.toThrow('The device returned an error: 0x020000');
  });

  test('operateCurtain should not throw error for correct response', async () => {
    await expect(curtain.operateCurtain([0x57, 0x0f, 0x45, 0x01, 0x05, 0xff, 50])).resolves.not.toThrow();
  });
});