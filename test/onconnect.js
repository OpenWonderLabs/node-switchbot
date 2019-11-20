'use strict';
const Switchbot = require('../lib/switchbot.js');
const switchbot = new Switchbot();

switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  let device = device_list[0];
  if (!device) {
    console.log('No device was found.');
    process.exit();
  }
  console.log(device.modelName + ' (' + device.address + ') was found.');

  // Set event handers
  device.onconnect = () => {
    console.log('Connected.');
  };
  device.ondisconnect = () => {
    console.log('Disconnected.');
  };

  console.log('Pressing the switch...');
  return device.press();
}).then(() => {
  console.log('Done.');
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exit();
});