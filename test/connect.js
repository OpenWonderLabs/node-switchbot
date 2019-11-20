'use strict';
const Switchbot = require('../lib/switchbot.js');
const switchbot = new Switchbot();

let device = null;

switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  device = device_list[0];
  if (!device) {
    console.log('No device was found.');
    process.exit();
  }
  console.log(device.modelName + ' (' + device.address + ') was found.');
  console.log('Connecting...');
  return device.connect();
}).then(() => {
  console.log('Putting the arm down...');
  return device.down();
}).then(() => {
  console.log('Waiting for 5 seconds...');
  return switchbot.wait(5000);
}).then(() => {
  console.log('Putting the arm up...');
  return device.up();
}).then(() => {
  console.log('Disconnecting...');
  return device.disconnect();
}).then(() => {
  console.log('Done.');
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exit();
});