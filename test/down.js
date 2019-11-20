'use strict';
const Switchbot = require('../lib/switchbot.js');
const switchbot = new Switchbot();

switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].down();
}).then(() => {
  console.log('Done.');
}).catch((error) => {
  console.error(error);
});