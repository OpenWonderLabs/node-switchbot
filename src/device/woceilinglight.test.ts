/* eslint-disable no-console */
import { WoCeilingLight } from './woceilinglight.js';
import { Buffer } from 'buffer';
import noble, { Peripheral } from '@stoprocent/noble';

describe('WoCeilingLight', () => {
  let ceilingLight: WoCeilingLight;

  beforeEach(() => {
    const peripheral = {}; // Replace with the actual peripheral object (e.g. from Noble)
    ceilingLight = new WoCeilingLight(peripheral as Peripheral, noble);
  });

  test('parseServiceData should return null for incorrect buffer length', async () => {
    const manufacturerData = Buffer.alloc(10);
    const result = await WoCeilingLight.parseServiceData(manufacturerData, console.log);
    expect(result).toBeNull();
  });

  test('parseServiceData should return correct data for valid buffer', async () => {
    const manufacturerData = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const result = await WoCeilingLight.parseServiceData(manufacturerData, console.log);
    expect(result).toEqual({
      model: 'CeilingLight',
      modelName: 'CeilingLight',
      modelFriendlyName: 'CeilingLight',
      color_temperature: 6,
      power: 1,
      state: false,
      red: 3,
      green: 4,
      blue: 5,
      brightness: 7,
      delay: 128,
      preset: 8,
      color_mode: 0,
      speed: 9,
      loop_index: 10,
    });
  });

  test('turnOn should call setState with correct parameters', async () => {
    const setStateSpy = jest.spyOn(ceilingLight, 'setState').mockResolvedValue(true);
    await ceilingLight.turnOn();
    expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x01]);
  });

  test('turnOff should call setState with correct parameters', async () => {
    const setStateSpy = jest.spyOn(ceilingLight, 'setState').mockResolvedValue(true);
    await ceilingLight.turnOff();
    expect(setStateSpy).toHaveBeenCalledWith([0x01, 0x02]);
  });

  test('setBrightness should call setState with correct parameters', async () => {
    const setStateSpy = jest.spyOn(ceilingLight, 'setState').mockResolvedValue(true);
    await ceilingLight.setBrightness(50);
    expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x14]);
  });

  test('setColorTemperature should call setState with correct parameters', async () => {
    const setStateSpy = jest.spyOn(ceilingLight, 'setState').mockResolvedValue(true);
    await ceilingLight.setColorTemperature(50);
    expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x17, 50]);
  });

  test('setRGB should call setState with correct parameters', async () => {
    const setStateSpy = jest.spyOn(ceilingLight, 'setState').mockResolvedValue(true);
    await ceilingLight.setRGB(50, 100, 150, 200);
    expect(setStateSpy).toHaveBeenCalledWith([0x02, 0x12, 50, 100, 150, 200]);
  });
});