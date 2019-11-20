'use strict';

// Load the node-switchbot and get a `Switchbot` constructor object
const Switchbot = require('../lib/switchbot.js');
// Create an `Switchbot` object
const switchbot = new Switchbot();

(async () => {
  // Start to monitor advertisement packets
  await switchbot.startScan();
  // Set an event hander
  switchbot.onadvertisement = (ad) => {
    console.log(JSON.stringify(ad, null, '  '));
  };
  // Wait 10 seconds
  await switchbot.wait(10000);
  // Stop to monitor
  switchbot.stopScan();
  process.exit();
})();