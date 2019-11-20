'use strict';
const Switchbot = require('../lib/switchbot.js');
const switchbot = new Switchbot();

switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  //return device_list[0].setDeviceName('あいうえお');
  return device_list[0].setDeviceName('WoHand');
  //return device_list[0].setDeviceName('Bot in kitchen');
}).then(() => {
  console.log('Done.');
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exit();
});
