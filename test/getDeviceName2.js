'use strict';
const Switchbot = require('../lib/switchbot.js');

let switchbot = new Switchbot();
let device = null;

switchbot.discover({
  model: 'T',
  quick: true
}).then((list) => {
  device = list[0];
  if (!device) {
    console.log('No device was found.');
    process.exit();
  }
  console.log('A device was found.');
  console.log('- id     : ' + device.id);
  console.log('- address: ' + device.address);
  console.log('- model  : ' + device.model + ' (' + device.modelName + ')');

  device.onconnect = () => {
    console.log('Connected.');
  };
  device.ondisconnect = () => {
    console.log('Disconnected.');
  };

  //	console.log('Connecting...');
  //	return device.connect();
  //}).then(() => {
  console.log('Retrieving the device name...');
  return device.getDeviceName();
}).then((device_name) => {
  console.log('- Device name: ' + device_name);
  //	console.log('Disconnecting...');
  //	return device.disconnect();
  //}).then(() => {
  console.log('Done.');
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exit();
});