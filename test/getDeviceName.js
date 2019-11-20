'use strict';
const Switchbot = require('../lib/switchbot.js');
const switchbot = new Switchbot();

switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].getDeviceName();
}).then((name) => {
  console.log(name);
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exit();
});
