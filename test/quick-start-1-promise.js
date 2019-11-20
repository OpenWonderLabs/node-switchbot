'use strict';

// Load the node-switchbot and get a `Switchbot` constructor object
const Switchbot = require('../lib/switchbot.js');
// Create an `Switchbot` object
let switchbot = new Switchbot();

// Start to monitor advertisement packets
switchbot.startScan().then(() => {
  // Set an event hander
  switchbot.onadvertisement = (ad) => {
    console.log(JSON.stringify(ad, null, '  '));
  };
  // Wait 10 seconds
  return switchbot.wait(10000);
}).then(() => {
  // Stop to monitor
  switchbot.stopScan();
  process.exit();
});