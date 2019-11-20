node-switchbot
===============

The node-switchbot is a Node.js module which allows you to move your [Switchbot (Bot)](https://www.switch-bot.com/bot)'s arm and to monitor the temperature/humidity from [SwitchBot Thermometer & Hygrometer (Meter)](https://www.switch-bot.com/meter).

This module is unofficial. It was developed by reference to [the official python code](https://github.com/OpenWonderLabs/python-host). But some functionalities of this module were developed through trial and error. So some information obtained from this module might be wrong.

## Supported OS

The node-switchbot supports only Linux-based OSes, such as Raspbian, Ubuntu, and so on. This module does not support Windows and Mac OS for now. (If [@abandonware/noble](https://github.com/abandonware/noble) is installed properly, this module might work well on such OSes.)

## Dependencies

* [Node.js](https://nodejs.org/en/) 10 +
* [@abandonware/noble](https://github.com/abandonware/noble)


See the document of the [@abandonware/noble](https://github.com/abandonware/noble) for details on installing the [@abandonware/noble](https://github.com/abandonware/noble).

Note that the noble must be run as root on most of Linux environments. See the document of the [@abandonware/noble](https://github.com/abandonware/noble) for details.

## Installation

Before installing the [@abandonware/noble](https://github.com/abandonware/noble), some linux libraries related Bluetooth as follows if the OS is Ubuntu/Debian/Raspbian.

```
$ sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

If you use other OS, follow the instructions described in the document of the [@abandonware/noble](https://github.com/abandonware/noble).

After installing the libraries above, install the [@abandonware/noble](https://github.com/abandonware/noble) and the node-switchbot (this module) as follows:

```
$ cd ~
$ npm install @abandonware/noble
$ npm install node-switchbot
```

---------------------------------------
## Table of Contents

* [Quick Start](#Quick-Start)
  * [Monitoring Advertising packets](#Quick-Start-1)
  * [Moving the arm of the Bot](#Quick-Start-2)
* [`Switchbot` object](#Switchbot-object)
  * [`discover()` method](#Switchbot-discover-method)
  * [`ondiscover` event handler](#Switchbot-ondiscover-event-handler)
  * [`scartScan()` method](#Switchbot-startScan-method)
  * [`stopScan()` method](#Switchbot-stopScan-method)
  * [`onadvertisement` event handler](#Switchbot-onadvertisement-event-handler)
  * [`wait()` method](#Switchbot-wait-method)
* [`SwitchbotDevice` object](#SwitchbotDevice-object)
  * [Properties](#SwitchbotDevice-properties)
  * [`getDeviceName()` method](#SwitchbotDevice-getDeviceName-method)
  * [`setDeviceName()` method](#SwitchbotDevice-setDeviceName-method)
  * [`connect()` method](#SwitchbotDevice-connect-method)
  * [`disconnect()` method](#SwitchbotDevice-disconnect-method)
  * [`onconnect` event handler](#SwitchbotDevice-onconnect-event-handler)
  * [`ondisconnect` event handler](#SwitchbotDevice-ondisconnect-event-handler)
* [`SwitchbotDeviceWoHand` object](#SwitchbotDeviceWoHand-object)
  * [`press()` method](#SwitchbotDeviceWoHand-press-method)
  * [`turnOn()` method](#SwitchbotDeviceWoHand-turnOn-method)
  * [`turnOff()` method](#SwitchbotDeviceWoHand-turnOff-method)
  * [`down()` method](#SwitchbotDeviceWoHand-down-method)
  * [`up()` method](#SwitchbotDeviceWoHand-up-method)
* [Advertisement data](#Advertisement-data)
  * [Bot (WoHand)](#Advertisement-data-WoHand)
  * [Meter (WoSensorTH)](#Advertisement-data-WoSensorTH)
* [Release Note](#Release-Note)
* [References](#References)
* [License](#License)

---------------------------------------
## <a id="Quick-Start">Quick Start</a>

### <a id="Quick-Start-1">Monitoring Advertising packets</a>

Monitoring the advertising packets, you can find your devices and know the latest state of each device. The packet contains the settings of the device, the arm position of the Bot, the temperature and humidity of the Meter, and so on.

```JavaScript
// Load the node-switchbot and get a `Switchbot` constructor object
const Switchbot = require('node-switchbot');
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
```

The [`startScan()`](#Switchbot-startScan-method) methods starts to monitor advertisement packets. In order to receive the packets, you have to assign a callback function to the [`onadvertisement`](#Switchbot-onadvertisement-event-handler).

The [`wait()`](#Switchbot-wait-method) method is just an utility method, which wait for the specified milliseconds.

The [`startScan()`](#Switchbot-startScan-method) and [`wait()`](#Switchbot-wait-method) methods are asynchronous, they return a `Promise` object. You can write code in promise style as well. What the code below does is as same as what the code above does:

```javascript
// Load the node-switchbot and get a `Switchbot` constructor object
const Switchbot = require('node-switchbot');
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
```

The sample codes above will output the result as follows:

```json
{
  "id": "c12e453e2008",
  "address": "c1:2e:45:3e:20:08",
  "rssi": -61,
  "serviceData": {
    "model": "H",
    "modelName": "WoHand",
    "mode": true,
    "state": false,
    "battery": 100
  }
}
{
  "id": "cb4eb903c96d",
  "address": "cb:4e:b9:03:c9:6d",
  "rssi": -70,
  "serviceData": {
    "model": "T",
    "modelName": "WoSensorTH",
    "temperature": {
      "c": 25.2,
      "f": 77.4
    },
    "fahrenheit": false,
    "humidity": 43,
    "battery": 100
  }
}
```

See the section "[Advertisement data](#Advertisement-data)" for the details of the advertising packets.

### <a id="Quick-Start-2">Moving the arm of the Bot</a>

This sample discovers a Bot (WoHand), then put the Bot's arm down, finally put it up in 5 seconds.

```javascript
// Load the node-switchbot and get a `Switchbot` constructor object
const Switchbot = require('../lib/switchbot.js');
// Create an `Switchbot` object
const switchbot = new Switchbot();

(async () => {
  // Find a Bot (WoHand)
  const bot_list = await switchbot.discover({ model: 'H', quick: true });
  if (bot_list.length === 0) {
    throw new Error('No device was found.');
  }
  // The `SwitchbotDeviceWoHand` object representing the found Bot.
  let device = bot_list[0];
  // Put the Bot's arm down (stretch the arm)
  await device.down();
  // Wait for 5 seconds
  await switchbot.wait(5000);
  // Put the Bot's arm up (retract the arm)
  await device.up();
  process.exit();
})();
```

In order to manipulate the arm of your Bot, you have to discover your Bot using the [`discover()`](#Switchbot-discover-method) method. The object `{ model: 'H' }` passed to the method means that only Bots will be discovered. That is, Meters will be ignored.

In this code, you can get a [`SwitchbotDeviceWoHand`](#SwitchbotDeviceWoHand-object) object representing the found Bot. Using the [`down()`](#SwitchbotDeviceWoHand-down-method) and [`up()`](#SwitchbotDeviceWoHand-up-method) methods of the object, you can move the arm. In addition to these methods, you can use the [`press()`](#SwitchbotDeviceWoHand-press-method), [`turnOn()`](#SwitchbotDeviceWoHand-turnOn-method), and [`turnOff()`](#SwitchbotDeviceWoHand-turnOff-method) methods as well.

---------------------------------------
## <a id="Switchbot-object">`Switchbot` object</a>

In order to use the node-switchbot, you have to load the node-switchbot module as follows:

```JavaScript
const Switchbot = require('node-switchbot');
```

You can get an `Switchbot` constructor from the code above. Then you have to create an `Switchbot` object from the `Switchbot` constructor as follows:

```javascript
const switchbot = new Switchbot();
```

The `Switchbot` constructor takes an argument optionally. It must be a hash object containing the properties as follows:

Property | Type   | Required | Description
:--------|:-------|:---------|:-----------
`noble`  | Noble  | option   | a Noble object of the [`@abandonware/noble`](https://github.com/abandonware/noble) module

The node-switchbot module uses the [`@abandonware/noble`](https://github.com/abandonware/noble) module in order to interact with BLE devices. If you want to interact other BLE devices using the `@abandonware/noble` module, you can create an `Noble` object by yourself, then pass it to this module. If you don't specify a `Noble` object to the `noble` property, this module automatically create a `Noble` object internally.

The sample code below shows how to pass a `Nobel` object to the `Switchbot` constructor.

```JavaScript
// Create a Noble object
const noble = require('@abandonware/noble');

// Create a Switchbot object
const Switchbot = require('node-switchbot');
const switchbot = new Switchbot({'noble': noble});
```

In the code snippet above, the variable `switchbot` is an `Switchbot` object. The `Switchbot` object has a lot of methods as described in sections below.

### <a id="Switchbot-discover-method">`discover()` method</a>

The `discover` method finds devices. This method returns a `Promise` object. This method takes an argument which is a hash object containing parameters as follows:

Property     | Type    | Required | Description
:------------|:--------|:---------|:------------
`duration`   | Integer | Optional | Duration for discovery process (msec). The default value is 5000 (msec).
`model`      | String  | Optional | `"H"` or `"T"`. If `"H"` is specified, this method will discover only Bots. If `"T"` is specified, this method will discover only Meters.
`id`         | String  | Optional | If this value is set, this method will discover only a device whose ID is as same as this value. The ID is identical to the MAC address. This parameter is case-insensitive, and colons are ignored.
`quick`      | Boolean | Optional | If this value is `true`, this method finishes the discovery process when the first device is found, then calls the `resolve()` function without waiting the specified `duration`. The default value is `false`.

In the code snippet below, no parameter is passed to the method:

```JavaScript
switchbot.discover().then((device_list) => {
  // Do something...
}).catch((error) => {
  console.error(error);
});
```

If no parameter is passed to the method as the code above,  an `Array` object will be passed to the `resolve()` function in 5 seconds. The `Array` object contains [`SwitchbotDevice`](#SwitchbotDevice-object) objects representing the found devices. See the section "[`SwitchbotDevice`](#SwitchbotDevice-object) objects" for more details.

If you want a quick response, you can set the `quick` property to `true`.

```JavaScript
switchbot.discover({
    duration: 5000,
    quick: true
  });
}).then((device_list) => {
  // Do something...
}).catch((error) => {
  console.error(error);
});
```

As the `quick` property is set to `true`, the `resolve()` function will be called immediately after a device is found regardless the value of the `duration` property.

### <a id="Switchbot-ondiscover-event-handler">`ondiscover` event hander</a>

The `ondiscover` property on the [`Switchbot`](#Switchbot-object) object is an event handler called whenever a device is newly found in the discovery process. A [`SwitchbotDevice`](#SwitchbotDevice-object) object is passed to the callback function set to the `ondiscover` property.

```JavaScript
switchbot.ondiscover = (device) => {
  console.log(device.id + ' (' + device.modelName + ')');
};

switchbot.discover().then(() => {
  console.log('The discovery process was finished.');
}).catch((error) => {
  console.error(error);
});
```

The code snippet above will output the result as follows:

```
cb4eb903c96d (WoSensorTH)
c12e453e2008 (WoHand)
The discovery process was finished.
```

### <a id="Switchbot-startScan-method">`scartScan()` method</a>

The `startScan()` method starts to scan advertising packets coming from devices. This method takes an argument which is a hash object containing the parameters as follows:

Property     | Type   | Required | Description
:------------|:-------|:---------|:------------
`model`      | String  | Optional | `"H"` or `"T"`. If `"H"` is specified, this method will discover only Bots. If `"T"` is specified, this method will discover only Meters.
`id`         | String  | Optional | If this value is set, this method will discover only a device whose ID is as same as this value. The ID is identical to the MAC address. This value is case-insensitive, and colons are ignored.

Whenever a packet is received, the callback function set to the [`onadvertisement`](#Switchbot-onadvertisement-event-handler) property of the [`Switchbot`](#Switchbot-object) object will be called. When a packet is received, a hash object representing the packet will be passed to the callback function.

```JavaScript
// Set a callback function called when a packet is received
switchbot.onadvertisement = (ad) => {
  console.log(ad);
};

// Start to scan advertising packets
switchbot.startScan({
  id: 'cb:4e:b9:03:c9:6d',
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
```

The code snippet above will output the result as follows:

```
{
  id: 'cb4eb903c96d',
  address: 'cb:4e:b9:03:c9:6d',
  rssi: -65,
  serviceData: {
    model: 'T',
    modelName: 'WoSensorTH',
    temperature: { c: 25.8, f: 78.4 },
    fahrenheit: false,
    humidity: 43,
    battery: 100
  }
}
...
```

The `serviceData` property depends on the model of the device. See the section "[Advertisement data](#Advertisement-data)" for the details of the data format.

### <a id="Switchbot-stopScan-method">`stopScan()` method</a>

The `stopScan()` method stops to scan advertising packets coming from devices. This mothod returns nothing. Note that this method is *not* asynchronous but synchronous unlike the other methods. See the section "[`startScan()` method](#Switchbot-startScan-method)" for details.

### <a id="Switchbot-onadvertisement-event-handler">`onadvertisement` event handler</a>

If a callback function is set to the `onadvertisement` property, the callback function will be called whenever an advertising packet is received from a device during the scan is active (from the moment when the [`startScan()`](#Switchbot-startScan-method) method is called, to the moment when the [`stopScan()`](#Switchbot-stopScan-method) method is called).

See the section "[`startScan()` method](#Switchbot-startScan-method)" for details.

### <a id="Switchbot-wait-method">`wait()` method</a>

The `wait()` method waits for the specified milliseconds. This method takes an integer representing the duration (millisecond). This method returns a `Promise` object.

This method has nothing to do with Switchbot devices. It's just an utility method. See the section "[Quick Start](#Quick-Start)" for details of the usage of this method.

---------------------------------------
## <a id="SwitchbotDevice-object">`SwitchbotDevice` object</a>

The `SwitchbotDevice` object represents a Switchbot device (Bot or Meter), which is created through the discovery process triggered by the [`Switchbot.discover()`](#Switchbot-discover-method) method.

Actually, the `SwitchbotDevice` object is an super class of the [`SwitchbotDeviceWoHand`](#SwitchbotDeviceWoHand-object) and `SwitchbotDeviceWoSensorTH` objects. The [`SwitchbotDeviceWoHand`](#SwitchbotDeviceWoHand-object) object represents a Bot, the `SwitchbotDeviceWoSensorTH` object represents a Meter.

You can use the properties and methods described in this section on both Bot and Meter. See the section "[`SwitchbotDeviceWoHand` object](#SwitchbotDeviceWoHand-object)" for the details of the functionalities available only on Bot. For now, `SwitchbotDeviceWoSensorTH` object has no additional functionality.

### <a id="SwitchbotDevice-properties">Properties</a>

The `SwitchbotDevice` object supports the properties as follows:

Property         | Type     | Description
:----------------|:---------|:-----------
`id`             | String   | ID of the device. (e.g., `"cb4eb903c96d"`)
`address`        | String   | Mac address of the device. Basically it is as same as the value of the `id` except that this value includes `:` in the string. (e.g., `"cb:4e:b9:03:c9:6d"`)
`model`           | String   | This value is `"H"` which means "Bot (WoHand)" or `"T"` which means "Meter (WoSensorTH)".
`modelName`       | String   | This value is `"WoHand"` or `"WoSensorTH"`.
`connectionState` | String   | This value indicates the BLE connection state. `"connecting"`, `"connected"`, `"disconnecting"`, or `"disconnected"`.
`onconnect`       | Function | See the section "[`onconnect` event handler](#SwitchbotDevice-onconnect-event-handler)" for details.
`ondisconnect`    | Function | See the section "[`ondisconnect` event handler](#SwitchbotDevice-ondisconnect-event-handler)" for details.

### <a id="SwitchbotDevice-getDeviceName-method">`getDeviceName()` method</a>

The `getDeviceName()` method fetches the device name saved in the device. This method returns a `Promise` object.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

If the device name is fetched successfully, the device name will be passed to the `resolve()`.

```javascript
switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].getDeviceName();
}).then((name) => {
  console.log(name);
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exit();
});
```

The code above will output the result as follows:

```javascript
WoHand
```

### <a id="SwitchbotDevice-setDeviceName-method">`setDeviceName()` method</a>

The `setDeviceName()` method update the device name saved in the device with the name specified as the first argument. This method returns a `Promise` object. Nothing will be passed to the `resolve()` function.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

The character set of the device name saved in the device is UTF-8. The byte length of the name must be less than or equal to 20 bytes. If the name consists of only ASCII characters, up to 20 characters would be allowed. But if the name consists of multi-byte characters, the upper limit of characters would be fewer than half. For example, Japanese characters could be saved at most 6 characters because most of Japanese characters consume 3 byte per each character.

```javascript
switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].setDeviceName('Bot in kitchen');
}).then(() => {
  console.log('Done.');
  process.exit();
}).catch((error) => {
  console.error(error);
  process.exit();
});
```

### <a id="SwitchbotDevice-connect-method">`connect()` method</a>

The `connect()` method establishes a connection with the device (i.e., pairing). This method returns a `Promise` object. If the device has already been connected, this method does nothing and calls the `resolve()` function immediately.

Most of the methods implemented in the `SwitchbotDevice` object automatically connect and disconnect the device. But this mechanism would be absolutely inefficient if you want to manipulate the device repeatedly in the short time.

The connection established using the `connect()` method is not disconnected automatically unless the [`disconnect()`](#SwitchbotDevice-disconnect-method) method is explicitly called.

The code snippet below establishes a connection with the Bot using the `connect()` method, then puts the Bot's arm down, then waits for 5 seconds, then puts the arm down, finally disconnects the device using the [`disconnect()`](#SwitchbotDevice-disconnect-method) method:

```javascript
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
```

The result will be as follows:

```
WoHand (c1:2e:45:3e:20:08) was found.
Connecting...
Putting the arm down...
Waiting for 5 seconds...
Putting the arm up...
Disconnecting...
Done.
```

### <a id="SwitchbotDevice-disconnect-method">`disconnect()` method</a>

The `disconnect()` method disconnects the device. This method returns a `Promise` object. If the device has already been disconnected, this method does nothing and calls the `resolve()` function immediately.

See the [previous section](#SwitchbotDevice-connect-method) for more details.

### <a id="SwitchbotDevice-onconnect-event-handler">`onconnect` event handler</a>

The `onconnect` event hander will be called when the connection with the device is established. Nothing will be passed to the hander.

The code below calls the [`press()`](#SwitchbotDeviceWoHand-press-method) method, while callback functions are attached to the `onconnect` and `ondisconnect`.

```javascript
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
```

The code above will output the result as follows:

```
WoHand (c1:2e:45:3e:20:08) was found.
Pressing the switch...
Connected.
Disconnected.
Done.
```

Seeing the result, you would find the [`press()`](#SwitchbotDeviceWoHand-press-method) method automatically connects and disconnects the device.

### <a id="SwitchbotDevice-ondisconnect-event-handler">`ondisconnect` event handler</a>

The `ondisconnect` event hander will be called when the connection with the device is closed. Nothing will be passed to the hander. See the previous section "[`onconnect` event handler](#SwitchbotDevice-onconnect-event-handler)" for more details.

---------------------------------------
## <a id="SwitchbotDeviceWoHand-object">`SwitchbotDeviceWoHand` object</a>

The `SwitchbotDeviceWoHand` object represents an Bot, which is created through the discovery process triggered by the [`Switchbot.discover()`](#Switchbot-discover-method) method.

Actually, the `SwitchbotDeviceWoHand` is an object inherited from the [`SwitchbotDevice`](#SwitchbotDevice-object). You can use not only the method described in this section but also the properties and methods implemented in the [`SwitchbotDevice`](#SwitchbotDevice-object) object.

### <a id="SwitchbotDeviceWoHand-press-method">`press()` method</a>

The `press()` method sends a press command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

```javascript
switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].press();
}).then(() => {
  console.log('Done.');
}).catch((error) => {
  console.error(error);
});
```

When the Bot receives this command, the Bot's arm will be put down (stretched), then put up (retracted) in a few seconds.

### <a id="SwitchbotDeviceWoHand-turnOn-method">`turnOn()` method</a>

The `turnOn()` method sends a turn-on command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put down (stretched) or put up (retracted) depending on the settings.

Light switch Add-on | Inverse the on/off direction | Physical position of the arm
:-------------------|:-----------------------------|:----------------------------
Disabled            | N/A                          | Down (stretched), then Up (retracted)
Enabled             | Disabled                     | Down (stretched)
Enabled             | Enabled                      | Up (retracted)

```javascript
switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].turnOn();
}).then(() => {
  console.log('Done.');
}).catch((error) => {
  console.error(error);
});
```

### <a id="SwitchbotDeviceWoHand-turnOff-method">`turnOff()` method</a>

The `turnOff()` method sends a turn-off command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put down (stretched) or put up (retracted) depending on the settings.

Light switch Add-on | Inverse the on/off direction | Physical position of the arm
:-------------------|:-----------------------------|:----------------------------
Disabled            | N/A                          | Down (stretched), then Up (retracted)
Enabled             | Disabled                     | Up (retracted)
Enabled             | Enabled                      | Down (stretched)

```javascript
switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].turnOff();
}).then(() => {
  console.log('Done.');
}).catch((error) => {
  console.error(error);
});
```

### <a id="SwitchbotDeviceWoHand-down-method">`down()` method</a>

The `down()` method sends a down command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put down (stretched) regardless of the settings.

```javascript
switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].down();
}).then(() => {
  console.log('Done.');
}).catch((error) => {
  console.error(error);
});
```

### <a id="SwitchbotDeviceWoHand-up-method">`up()` method</a>

The `up()` method sends an up command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put up (retracted) regardless of the settings.

```javascript
switchbot.discover({ model: 'H', quick: true }).then((device_list) => {
  return device_list[0].up();
}).then(() => {
  console.log('Done.');
}).catch((error) => {
  console.error(error);
});
```

---------------------------------------
## <a id="Advertisement-data">Advertisement data</a>

After the [`startScan()`](#Switchbot-startScan-method) method is invoked, the [`onadvertisement`](#Switchbot-onadvertisement-event-handler) event handler will be called whenever an advertising packet comes from the switchbot devices. An object containing the properties as follows will be passed to the event handler:

Property      | Type    | Description
:-------------|:--------|:-----------
`id`          | String  | ID of the device. (e.g., `"cb4eb903c96d"`)
`address`     | String  | Mac address of the device. Basically it is as same as the value of the `id` except that this value includes `:` in the string. (e.g., `"cb:4e:b9:03:c9:6d"`)
`rssi`        | Integer | RSSI. (e.g., `-62`)
`serviceData` | Object  | An object including the device-specific data.

The structures of the `serviceData` are described in the following sections.

### <a id="Advertisement-data-WoHand">Bot (WoHand)</a>

Example of the advertisement data:

```json
{
  "id": "c12e453e2008",
  "address": "c1:2e:45:3e:20:08",
  "rssi": -61,
  "serviceData": {
    "model": "H",
    "modelName": "WoHand",
    "mode": true,
    "state": false,
    "battery": 100
  }
}
```

Structure of the `serviceData`:

Property    | Type    | Description
:-----------|:--------|:-----------
`model`     | String  | This value is always `"H"`, which means "Bot (WoHand)".
`modelName` | String  | This value is always `"WoHand"`, which means "Bot".
`mode`      | Boolean | This indicates whether the light switch Add-on is used (`true`) or not (`false`)
`state`     | Boolean | This value indicates whether the switch status is ON or OFF.
`battery`   | Integer | (**experimental**) This value indicates the battery level (`%`).

The `mode` can be changed only using the official smartphone app. The node-switchbot does not support changing the mode because the BLE protocol is non-public.

If the `mode` is `false`, which means the light switch Add-on is not used, the `state` is always `false`. If the `mode` is `true`, which means the light switch Add-on is used, the `state` represents the logical state (ON or OFF). Note that it does *not* mean the physical arm position. The physical arm position depends on the setting "Inverse the on/off direction" on the official smartphone app.

"Inverse the on/off direction" | Value of the `state` | Logical state | Physical arm position
:------------------------------|:---------------------|:--------------|:------------
disabled                       | `true`               | OFF           | Up (retracted)
+                              | `false`              | ON            | Down (stretched)
enabled                        | `true`               | OFF           | Down (stretched)
+                              | `false`              | ON            | Up (retracted)

The `battery` is *experimental* for now. I'm not sure whether the value is correct or not. Never trust this value for now.


### <a id="Advertisement-data-WoSensorTH">Meter (WoSensorTH)</a>

Example of the advertisement data:

```json
{
  "id": "cb4eb903c96d",
  "address": "cb:4e:b9:03:c9:6d",
  "rssi": -70,
  "serviceData": {
    "model": "T",
    "modelName": "WoSensorTH",
    "temperature": {
      "c": 25.2,
      "f": 77.4
    },
    "fahrenheit": false,
    "humidity": 43,
    "battery": 100
  }
}
```

Structure of the `data`:

Property      | Type    | Description
:-------------|:--------|:-----------
`model`       | String  | This value is always `"T"`, which means "Meter (WoSensorTH)".
`modelName`   | String  | This value is always `"WoSensorTH"`, which means "Meter".
`temperature` | Object  |
+ `c`         | Float   | Temperature (degree Celsius/°C)
+ `f`         | Float   | Temperature (degree Fahrenheit/℉)
`fahrenheit`  | Boolean | The flag whether the Meter shows Fahrenheit (`true`) or Celsius (`false`) for the temperature on the display
`humidity`    | Integer | Humidity (`%`)
`battery`     | Integer | (**experimental**) This value indicates the battery level (`%`).

The `fahrenheit` indicates the setting on the device. Note that it does *not* indicate the setting on the official smartphone app. The setting of the temperature unit on the device and the setting on the app are independent. 

The `battery` is *experimental* for now. I'm not sure whether the value is correct or not. Never trust this value for now.

---------------------------------------
## <a id="Release-Note">Release Note</a>

* v0.0.1 (2019-11-20)
  * First public release

---------------------------------------
## <a id="References">References</a>

* [Switchbot official global site](https://www.switch-bot.com/)
* [Github - OpenWonderLabs/python-host](https://github.com/OpenWonderLabs/python-host)

---------------------------------------
## <a id="License">License</a>

The MIT License (MIT)

Copyright (c) 2019 Futomi Hatano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
