/* eslint-disable no-console */
import { WoContact } from './wocontact';
import { Buffer } from 'buffer';

describe('WoContact', () => {
  test('parseServiceData should return null for incorrect buffer length', async () => {
    const serviceData = Buffer.alloc(8); // Incorrect length
    const result = await WoContact.parseServiceData(serviceData, console.log);
    expect(result).toBeNull();
  });

  test('parseServiceData should return correct data for valid buffer', async () => {
    const serviceData = Buffer.from([0, 0b11000000, 0b01111111, 0b00000111, 0, 0, 0, 0, 0b00001111]);
    const result = await WoContact.parseServiceData(serviceData, console.log);
    expect(result).toEqual({
      model: 'ContactSensor',
      modelName: 'ContactSensor',
      modelFriendlyName: 'ContactSensor',
      movement: true,
      tested: 128,
      battery: 127,
      contact_open: true,
      contact_timeout: true,
      lightLevel: 'bright',
      button_count: 15,
      doorState: 'timeout no closed',
    });
  });

  test('parseServiceData should log message for incorrect buffer length', async () => {
    const serviceData = Buffer.alloc(8); // Incorrect length
    const logSpy = jest.fn();
    await WoContact.parseServiceData(serviceData, logSpy);
    expect(logSpy).toHaveBeenCalledWith('[parseServiceDataForWoContact] Buffer length 8 !== 9!');
  });
});