'use strict';
const Switchbot = require('../lib/switchbot.js');
const switchbot = new Switchbot();

// Set a callback function called when a packet is received
switchbot.onadvertisement = (ad) => {
  console.log(ad);
};

// Start to scan advertising packets
switchbot.startScan({
  model: 'H',
  //model: 'T',
  //id: 'cb:4e:b9:03:c9:6d',
}).then(() => {
  // Wait for 30 seconds
  return switchbot.wait(30000);
}).then(() => {
  // Stop to scan
  switchbot.stopScan();
  process.exit();
}).catch((error) => {
  console.error(error);
});