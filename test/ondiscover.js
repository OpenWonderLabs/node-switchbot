'use strict';
const Switchbot = require('../lib/switchbot.js');
let switchbot = new Switchbot();

switchbot.ondiscover = (device) => {
  console.log(device.id + ' (' + device.modelName + ')');
};

switchbot.discover().then(() => {
  console.log('The discovery process was finished.');
}).catch((error) => {
  console.error(error);
});
