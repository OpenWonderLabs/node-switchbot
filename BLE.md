# SwitchBot BLE Documentation

The `SwitchBot` class allows you to interact with SwitchBot devices using the SwitchBot BLE. This documentation provides an overview of how to install, set up, and use the various methods available in the `SwitchBotBLE` class.

## Table of Contents

- [BLE (Bluetooth Low Energy)](#ble-bluetooth-low-energy)
  - [Supported OS](#supported-os)
  - [Dependencies](#dependencies)
  - [Importing and Setting Up](#importing-and-setting-up)
  - [`SwitchBotBLE` Object](#switchbot-object)
    - [`discover()` method](#discover-method)
    - [`ondiscover` event handler](#ondiscover-event-handler)
    - [`startScan()` method](#startscan-method)
    - [`onadvertisement` event handler](#onadvertisement-event-handler)
    - [`stopScan()` method](#stopscan-method)
    - [`wait()` method](#wait-method)
  - [`SwitchBotDevice` Object](#switchbotdevice-object)
    - [Properties](#properties)
    - [`getDeviceName()` method](#getdevicename-method)
    - [`setDeviceName()` method](#setdevicename-method)
    - [`connect()` method](#connect-method)
    - [`disconnect()` method](#disconnect-method)
    - [`onconnect` event handler](#onconnect-event-handler)
    - [`ondisconnect` event handler](#ondisconnect-event-handler)
  - [`WoHand` Object](#wohand-object)
    - [`press()` method](#press-method)
    - [`turnOn()` method](#turnon-method)
    - [`turnOff()` method](#turnoff-method)
    - [`down()` method](#down-method)
    - [`up()` method](#up-method)
  - [`WoCurtain` object](#wocurtain-object)
    - [`open()` method](#open-method)
    - [`close()` method](#close-method)
    - [`pause()` method](#pause-method)
    - [`runToPos()` method](#runtopos-method)
  - [`WoPlugMini` object](#woplugmini-object)
    - [`turnOn()` method](#turnon-method)
    - [`turnOff()` method](#turnoff-method)
    - [`toggle()` method](#toggle-method)
  - [`WoSmartLock` object](#wosmartlock-object)
    - [`lock()` method](#lock-method)
    - [`unlock()` method](#unlock-method)
    - [`unlock_no_unlatch()` method](#unlock_no_unlatch-method)
    - [`info()` method](#info-method)
  - [Advertisement data](#advertisement-data)
    - [Bot (WoHand)](#bot-wohand)
    - [Meter (WoSensorTH)](#meter-wosensorth)
    - [Curtain (WoCurtain)](#curtain-wocurtain)
    - [Contact (WoContact)](#contact-wocontact)
    - [Motion (WoMotion)](#motion-womotion)
    - [PlugMini (WoPlugMini)](#plugmini-woplugmini)
  - [Supported Devices](#supported-devices)
  - [Advertisement Data](#advertisement-data)
  - [Control Device](#control-device)
  - [Summary](#summary)

## BLE (Bluetooth Low Energy)

### Supported OS

The node-switchbot supports only Linux-based OSes, such as Raspbian, Ubuntu, and so on. This module does not support Windows and macOS for now. (If [@stoprocent/noble](https://github.com/stoprocent/noble#readme) is installed properly, this module might work well on such OSes.)

### Dependencies

- [Node.js](https://nodejs.org/en/): ^20
- [@stoprocent/noble](https://github.com/stoprocent/noble)
  - Included as a dependency so no need to install manually however if for some reason your OS requires addtional libaries, see `@stoprocent/noble` [prerequisites](https://github.com/stoprocent/noble?tab=readme-ov-file#prerequisites), you will then need to reinstall `node-switchbot` or the package that you have `node-swtichbot` as a dependency.

### Importing and Setting Up

To use the `SwitchBotBLE` class in `node-switchbot`, you need to import it and create an instance.

```typescript
import { SwitchBotBLE } from 'node-switchbot'

// Example usage
const switchBotBLE = new SwitchBotBLE()

try {
  await switchBotBLE.startScan()
} catch (e: any) {
  console.error(`Failed to start BLE scanning, Error: ${e.message ?? e}`)
}
```

### `SwitchBotBLE` Object

The `SwitchBotBLE` constructor takes an argument optionally. It must be a hash object containing the properties as follows:

| Property | Type  | Required | Description                                                                             |
| :------- | :---- | :------- | :-------------------------------------------------------------------------------------- |
| `noble`  | Noble | option   | a Noble object of the [`@stoprocent/noble`](https://github.com/stoprocent/noble) module |

The node-switchbot module uses the [`@stoprocent/noble`](https://github.com/stoprocent/noble) module in order to interact with BLE devices. If you want to interact other BLE devices using the `@stoprocent/noble` module, you can create an `Noble` object by yourself, then pass it to this module. If you don't specify a `Noble` object to the `noble` property, this module automatically create a `Noble` object internally.

The sample code below shows how to pass a `Noble` object to the `Switchbot` constructor.

```Typescript
// Create a Noble object
const noble = require('@stoprocent/noble');

const switchBotBLE = new SwitchBotBLE({ 'noble': Noble })
```

In the code snippet above, the variable `switchbot` is an `SwitchBotBLE` object. The `SwitchBotBLE` object has a lot of methods as described in sections below.

#### `discover()` method

The `discover` method finds devices. This method returns a `Promise` object. This method takes an argument which is a hash object containing parameters as follows:

| Property   | Type    | Required | Description                                                                                                                                                                                                      |
| :--------- | :------ | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration` | Integer | Optional | Duration for discovery process (msec). The default value is 5000 (msec).                                                                                                                                         |
| `model`    | String  | Optional | `"H"`, `"T"` or `"c"`. If `"H"` is specified, this method will discover only Bots. If `"T"` is specified, this method will discover only Meters. If `"c"` is specified, this method will discover only Curtains. |
| `id`       | String  | Optional | If this value is set, this method will discover only a device whose ID is as same as this value. The ID is identical to the MAC address. This parameter is case-insensitive, and colons are ignored.             |
| `quick`    | Boolean | Optional | If this value is `true`, this method finishes the discovery process when the first device is found, then calls the `resolve()` function without waiting the specified `duration`. The default value is `false`.  |

In the code snippet below, no parameter is passed to the method:

```Typescript
switchBotBLE.discover().then((device_list) => {
  // Do something...
}).catch((error) => {
  console.error(error);
});
```

If no parameter is passed to the method as the code above, an `Array` object will be passed to the `resolve()` function in 5 seconds. The `Array` object contains [`SwitchbotDevice`](#SwitchbotDevice-object) objects representing the found devices. See the section "[`SwitchbotDevice`](#SwitchbotDevice-object) objects" for more details.

If you want a quick response, you can set the `quick` property to `true`.

```Typescript
switchBotBLE.discover({
  duration: 5000,
  quick: true
}).then((device_list) => {
  // Do something...
}).catch((error) => {
  console.error(error);
});
```

As the `quick` property is set to `true`, the `resolve()` function will be called immediately after a device is found regardless the value of the `duration` property.

#### `ondiscover` event handler

The `ondiscover` property on the [`Switchbot`](#Switchbot-object) object is an event handler called whenever a device is newly found in the discovery process. A [`SwitchbotDevice`](#SwitchbotDevice-object) object is passed to the callback function set to the `ondiscover` property.

```Typescript
switchBotBLE.ondiscover = (device) => {
  console.log(device.id + ' (' + device.modelName + ')');
};

switchBotBLE.discover().then(() => {
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

#### `startScan()` method

The `startScan()` method starts to scan advertising packets coming from devices. This method takes an argument which is a hash object containing the parameters as follows:

| Property | Type   | Required | Description                                                                                                                                                                                                                                                                                                       |
| :------- | :----- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`  | String | Optional | `"H"`, `"T"`, `"c"`, `"g"` or `"j"`. If `"H"` is specified, this method will discover only Bots. If `"T"` is specified, this method will discover only Meters. If `"c"` is specified, this method will discover only Curtains. If `"g"` or `"j"` is specified, this method will discover only (US/JP) Plug Minis. |
| `id`     | String | Optional | If this value is set, this method will discover only a device whose ID is as same as this value. The ID is identical to the MAC address. This value is case-insensitive, and colons are ignored.                                                                                                                  |

Whenever a packet is received, the callback function set to the [`onadvertisement`](#Switchbot-onadvertisement-event-handler) property of the [`Switchbot`](#Switchbot-object) object will be called. When a packet is received, a hash object representing the packet will be passed to the callback function.

```Typescript
// Set a callback function called when a packet is received
switchBotBLE.onadvertisement = (ad) => {
  console.log(ad);
};

// Start to scan advertising packets
switchBotBLE.startScan({
  id: 'cb:4e:b9:03:c9:6d',
}).then(() => {
  // Wait for 30 seconds
  return switchBotBLE.wait(30000);
}).then(() => {
  // Stop to scan
  switchBotBLE.stopScan();
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
    celsius: 25.8,
    fahrenheit: 78.4,
    fahrenheit_mode: false,
    humidity: 43,
    battery: 100
  }
}
...
```

The `serviceData` property depends on the model of the device. See the section "[Advertisement data](#Advertisement-data)" for the details of the data format.

#### `onadvertisement` event handler

If a callback function is set to the `onadvertisement` property, the callback function will be called whenever an advertising packet is received from a device during the scan is active (from the moment when the [`startScan()`](#startscan-method) method is called, to the moment when the [`stopScan()`](#Switchbot-stopScan-method) method is called).

```typescript
switchBotBLE.onadvertisement = async (ad: any) => {
  try {
    this.bleEventHandler[ad.address]?.(ad.serviceData)
  } catch (e: any) {
    await this.errorLog(`Failed to handle BLE event, Error: ${e.message ?? e}`)
  }
}
```

See the section "[`startScan()` method](#startscan-method)" for details.

#### `stopScan()` method

The `stopScan()` method stops to scan advertising packets coming from devices. This method returns nothing. Note that this method is _not_ asynchronous but synchronous unlike the other methods. See the section "[`startScan()` method](#startscan-method)" for details.

```typescript
try {
  switchBotBLE.stopScan()
  console.log('Stopped BLE scanning to close listening.')
} catch (e: any) {
  console.error(`Failed to stop BLE scanning, Error: ${e.message ?? e}`)
}
```

#### `wait()` method

The `wait()` method waits for the specified milliseconds. This method takes an integer representing the duration (millisecond). This method returns a `Promise` object.

This method has nothing to do with Switchbot devices. It's just a utility method. See the section "[Quick Start](#Quick-Start)" for details of the usage of this method.

```typescript
await switchBotBLE.wait(1000)
```

### `SwitchBotDevice` Object

The `SwitchbotDevice` object represents a Switchbot device (Bot, Meter, Curtain, Contact or Motion), which is created through the discovery process triggered by the [`switchBotBLE.discover()`](#discover-method) method.

Actually, the `SwitchbotDevice` object is a super class of the [`WoHand`](#SwitchbotDeviceWoHand-object) and `WoSensorTH` objects. The [`WoHand`](#SwitchbotDeviceWoHand-object) object represents a Bot, the `WoSensorTH` object represents a Meter.

You can use the properties and methods described in this section on Bot, Meter, Curtain, Contact and Motion. See the section "[`WoHand` object](#SwitchbotDeviceWoHand-object)" for the details of the functionalities available only on Bot. For now, `WoSensorTH` object has no additional functionality.

#### Properties

The `SwitchbotDevice` object supports the properties as follows:

| Property          | Type     | Description                                                                                                                                                  |
| :---------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | String   | ID of the device. (e.g., `"cb4eb903c96d"`)                                                                                                                   |
| `address`         | String   | MAC address of the device. Basically it is as same as the value of the `id` except that this value includes `:` in the string. (e.g., `"cb:4e:b9:03:c9:6d"`) |
| `model`           | String   | This value is `"H"` "Bot (WoHand)", `"T"` "Meter (WoSensorTH)", `"c"` "Curtain (WoCurtain)", `"d"` "Contact (WoContact)" or `"s"` "Motion (WoMotion)".       |
| `modelName`       | String   | This value is `"WoHand"`, `"WoSensorTH"`, `WoCurtain`, `WoContect` or `WoMotion`.                                                                            |
| `connectionState` | String   | This value indicates the BLE connection state. `"connecting"`, `"connected"`, `"disconnecting"`, or `"disconnected"`.                                        |
| `onconnect`       | Function | See the section "[`onconnect` event handler](#SwitchbotDevice-onconnect-event-handler)" for details.                                                         |
| `ondisconnect`    | Function | See the section "[`ondisconnect` event handler](#SwitchbotDevice-ondisconnect-event-handler)" for details.                                                   |

#### `getDeviceName()` method

The `getDeviceName()` method fetches the device name saved in the device. This method returns a `Promise` object.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

If the device name is fetched successfully, the device name will be passed to the `resolve()`.

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    return device_list[0].getDeviceName();
  })
  .then((name) => {
    console.log(name);
    process.exit();
  })
  .catch((error) => {
    console.error(error);
    process.exit();
  });
```

The code above will output the result as follows:

```Typescript
WoHand;
```

#### `setDeviceName()` method

The `setDeviceName()` method update the device name saved in the device with the name specified as the first argument. This method returns a `Promise` object. Nothing will be passed to the `resolve()` function.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

The character set of the device name saved in the device is UTF-8. The byte length of the name must be less than or equal to 20 bytes. If the name consists of only ASCII characters, up to 20 characters would be allowed. But if the name consists of multibyte characters, the upper limit of characters would be fewer than half. For example, Japanese characters could be saved at most 6 characters because most of Japanese characters consume 3 byte per each character.

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    return device_list[0].setDeviceName("Bot in kitchen");
  })
  .then(() => {
    console.log("Done.");
    process.exit();
  })
  .catch((error) => {
    console.error(error);
    process.exit();
  });
```

#### `connect()` method

The `connect()` method establishes a connection with the device (i.e., pairing). This method returns a `Promise` object. If the device has already been connected, this method does nothing and calls the `resolve()` function immediately.

Most of the methods implemented in the `SwitchbotDevice` object automatically connect and disconnect the device. But this mechanism would be absolutely inefficient if you want to manipulate the device repeatedly in the short time.

The connection established using the `connect()` method is not disconnected automatically unless the [`disconnect()`](#SwitchbotDevice-disconnect-method) method is explicitly called.

The code snippet below establishes a connection with the Bot using the `connect()` method, then puts the Bot's arm down, then waits for 5 seconds, then puts the arm down, finally disconnects the device using the [`disconnect()`](#SwitchbotDevice-disconnect-method) method:

```Typescript
let device = null;

switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    device = device_list[0];
    if (!device) {
      console.log("No device was found.");
      process.exit();
    }
    console.log(device.modelName + " (" + device.address + ") was found.");
    console.log("Connecting...");
    return device.connect();
  })
  .then(() => {
    console.log("Putting the arm down...");
    return device.down();
  })
  .then(() => {
    console.log("Waiting for 5 seconds...");
    return switchBotBLE.wait(5000);
  })
  .then(() => {
    console.log("Putting the arm up...");
    return device.up();
  })
  .then(() => {
    console.log("Disconnecting...");
    return device.disconnect();
  })
  .then(() => {
    console.log("Done.");
    process.exit();
  })
  .catch((error) => {
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

#### `disconnect()` method

The `disconnect()` method disconnects the device. This method returns a `Promise` object. If the device has already been disconnected, this method does nothing and calls the `resolve()` function immediately.

See the [previous section](#SwitchbotDevice-connect-method) for more details.

#### `onconnect` event handler

The `onconnect` event handler will be called when the connection with the device is established. Nothing will be passed to the handler.

The code below calls the [`press()`](#SwitchbotDeviceWoHand-press-method) method, while callback functions are attached to the `onconnect` and `ondisconnect`.

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    const device = device_list[0];
    if (!device) {
      console.log("No device was found.");
      process.exit();
    }
    console.log(device.modelName + " (" + device.address + ") was found.");

    // Set event handers
    device.onconnect = () => {
      console.log("Connected.");
    };
    device.ondisconnect = () => {
      console.log("Disconnected.");
    };

    console.log("Pressing the switch...");
    return device.press();
  })
  .then(() => {
    console.log("Done.");
    process.exit();
  })
  .catch((error) => {
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

#### `ondisconnect` event handler

The `ondisconnect` event handler will be called when the connection with the device is closed. Nothing will be passed to the handler. See the previous section "[`onconnect` event handler](#SwitchbotDevice-onconnect-event-handler)" for more details.

### `WoHand` Object

The `WoHand` object represents a Bot, which is created through the discovery process triggered by the [`switchBotBLE.discover()`](#discover-method) method.

Actually, the `WoHand` is an object inherited from the [`SwitchbotDevice`](#SwitchbotDevice-object). You can use not only the method described in this section but also the properties and methods implemented in the [`SwitchbotDevice`](#SwitchbotDevice-object) object.

#### `press()` method

The `press()` method sends a press command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    return device_list[0].press();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

When the Bot receives this command, the Bot's arm will be put down (stretched), then put up (retracted) in a few seconds.

#### `turnOn()` method

The `turnOn()` method sends a turn-on command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put down (stretched) or put up (retracted) depending on the mode setting.

| Mode        | Inverse the on/off direction | Physical position of the arm          |
| :---------- | :--------------------------- | :------------------------------------ |
| Press mode  | N/A                          | Down (stretched), then Up (retracted) |
| Switch mode | Disabled                     | Down (stretched)                      |
| &nbsp;      | Enabled                      | Up (retracted)                        |

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    return device_list[0].turnOn();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

#### `turnOff()` method

The `turnOff()` method sends a turn-off command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put down (stretched) or put up (retracted) depending on the mode setting.

| Mode        | Inverse the on/off direction | Physical position of the arm          |
| :---------- | :--------------------------- | :------------------------------------ |
| Press mode  | N/A                          | Down (stretched), then Up (retracted) |
| Switch mode | Disabled                     | Up (retracted)                        |
| &nbsp;      | Enabled                      | Down (stretched)                      |

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    return device_list[0].turnOff();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

#### `down()` method

The `down()` method sends a down command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put down (stretched) regardless of the mode setting.

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    return device_list[0].down();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

#### `up()` method

The `up()` method sends an up command to the Bot. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Bot receives this command, the Bot's arm will be put up (retracted) regardless of the mode setting.

```Typescript
switchbot
  .discover({ model: "H", quick: true })
  .then((device_list) => {
    return device_list[0].up();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### `WoCurtain` Object

The `WoCurtain` object represents a Curtain, which is created through the discovery process triggered by the [`switchBotBLE.discover()`](#discover-method) method.

Actually, the `WoCurtain` is an object inherited from the [`SwitchbotDevice`](#SwitchbotDevice-object). You can use not only the method described in this section but also the properties and methods implemented in the [`SwitchbotDevice`](#SwitchbotDevice-object) object.

#### `open()` method

The `open()` method sends an open command to the Curtain. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Curtain receives this command, the Curtain will open the curtain (0% position). If not calibrated, the Curtain does not move.

The `open()` method receives an optional `mode` parameter. (See [`runToPos()`](#runtopos-method))

```Typescript
switchbot
  .discover({ model: "c", quick: true })
  .then((device_list) => {
    return device_list[0].open();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

#### `close()` method

The `close()` method sends a close command to the Curtain. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Curtain receives this command, the Curtain will close the curtain (100% position). If not calibrated, the Curtain does not move.

The `close()` method receives an optional `mode` parameter. (See [`runToPos()`](#runtopos-method))

```Typescript
switchbot
  .discover({ model: "c", quick: true })
  .then((device_list) => {
    return device_list[0].close();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

#### `pause()` method

The `pause()` method sends a pause command to the Curtain. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Curtain receives this command, the Curtain will pause.

```Typescript
switchbot
  .discover({ model: "c", quick: true })
  .then((device_list) => {
    return device_list[0].pause();
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

#### `runToPos()` method

The `runToPos()` method sends a position command to the Curtain. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Curtain receives this command, the Curtain will run to the percentage position. If not calibrated, the Curtain does not move.

The `open()` method sends an open command to the Curtain. This method returns a `Promise` object. Nothing will be passed to the `resove()`.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

When the Curtain receives this command, the Curtain will open the curtain (0% position). If not calibrated, the Curtain does not move.

| Property  | Type    | Required | Description                                                                                                                                          |
| :-------- | :------ | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `percent` | Integer | Required | The percentage of target position (`0-100`). (e.g., `50`)                                                                                            |
| `mode`    | Integer | Optional | The running mode of Curtain. <br/>`0x00` - Performance mode.<br/> `0x01` - Silent mode. <br/>`0xff` - Default. Unspecified, from Curtain's settings. |

```Typescript
switchbot
  .discover({ model: "c", quick: true })
  .then((device_list) => {
    return device_list[0].runToPos(50);
  })
  .then(() => {
    console.log("Done.");
  })
  .catch((error) => {
    console.error(error);
  });
```

### `WoPlugMini` Object

The `WoPlugMini ` object represents a PlugMini, which is created through the discovery process triggered by the [`switchBotBLE.discover()`](#discover-method) method.

Actually, the `WoPlugMini ` is an object inherited from the [`SwitchbotDevice`](#SwitchbotDevice-object). You can use not only the method described in this section but also the properties and methods implemented in the [`SwitchbotDevice`](#SwitchbotDevice-object) object.

#### `turnOn()` method

The `turnOn()` method sends a turn-on command to the PlugMini. This method returns a `Promise` object. A `boolean` value indicating whether the PlugMini is on (`true`), is passed to the `resolve()` method of the Promise.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

#### `turnOff()` method

The `turnOff()` method sends a turn-off command to the PlugMini. This method returns a `Promise` object. A `boolean` value indicating whether the PlugMini is off (`false`), is passed to the `resolve()` method of the Promise.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

#### `toggle()` method

The `toggle()` method sends a toggle command to the PlugMini, toggling between the on and off state. This method returns a `Promise` object. A `boolean` value indicating whether the PlugMini is on (`true`) or off (`false`), is passed to the `resolve()` method of the Promise.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

### `WoSmartLock` Object

The `WoSmartLock ` object represents a SmartLock, which is created through the discovery process triggered by the [`switchBotBLE.discover()`](#discover-method) method.

Actually, the `WoSmartLock ` is an object inherited from the [`SwitchbotDevice`](#SwitchbotDevice-object). You can use not only the method described in this section but also the properties and methods implemented in the [`SwitchbotDevice`](#SwitchbotDevice-object) object.

#### `setKey()` method

The `setKey()` method initialises the key information required for encrypted communication with the SmartLock

This must be set before any control commands are sent to the device. To obtain the key information you will need to use an external tool - see [`pySwitchbot`](https://github.com/Danielhiversen/pySwitchbot/tree/master?tab=readme-ov-file#obtaining-locks-encryption-key) project for an example script.
Or, use [`switchbot-get-encryption-key`](https://www.npmjs.com/package/switchbot-get-encryption-key) npm script.

| Property        | Type   | Description                                                                                      |
| :-------------- | :----- | :----------------------------------------------------------------------------------------------- |
| `keyId`         | String | unique2 character ID for the key. (e.g., `"ff"`) returned from the SwitchBot api for your device |
| `encryptionKey` | String | the unique encryption key returned from the SwitchBot api for your device                        |

#### `lock()` method

The `lock()` method sends a lock command to the SmartLock. This method returns a `Promise` object. A `boolean` value indicating whether the SmartLock is locked (`true`), is passed to the `resolve()` method of the Promise.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

#### `unlock()` method

The `unlock()` method sends an unlock command to the SmartLock. This method returns a `Promise` object. A `boolean` value indicating whether the SmartLock is locked (`false`), is passed to the `resolve()` method of the Promise.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

#### `unlockNoUnlatch()` method

The `unlockNoUnlatch()` method sends a partial unlock command to the SmartLock, unlocking without the full unlatch.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

#### `info()` method

The `info()` method retreieves state information from the SmartLock, This method returns a `Promise` object. An `object` value indicating with the state infor, is passed to the `resolve()` method of the Promise.

If no connection is established with the device, this method automatically establishes a connection with the device, then finally closes the connection. You don't have to call the [`connect()`](#SwitchbotDevice-connect-method) method in advance.

### Advertisement Data

After the [`startScan()`](#startscan-method) method is invoked, the [`onadvertisement`](#Switchbot-onadvertisement-event-handler) event handler will be called whenever an advertising packet comes from the switchbot devices.

```Typescript
// Load the node-switchbot and get a `Switchbot` constructor object
import { SwitchBotBLE } from 'node-switchbot';
// Create a `Switchbot` object
const switchBotBLE = new SwitchBotBLE();

(async () => {
  // Start to monitor advertisement packets
  await switchBotBLE.startScan();
  // Set an event handler
  switchBotBLE.onadvertisement = (ad) => {
    console.log(JSON.stringify(ad, null, '  '));
  };
  // Wait 10 seconds
  await switchBotBLE.wait(10000);
  // Stop to monitor
  switchBotBLE.stopScan();
  process.exit();
})();
```

An object containing the properties as follows will be passed to the event handler:

| Property      | Type    | Description                                                                                                                                                  |
| :------------ | :------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | String  | ID of the device. (e.g., `"cb4eb903c96d"`)                                                                                                                   |
| `address`     | String  | MAC address of the device. Basically it is as same as the value of the `id` except that this value includes `:` in the string. (e.g., `"cb:4e:b9:03:c9:6d"`) |
| `rssi`        | Integer | RSSI. (e.g., `-62`)                                                                                                                                          |
| `serviceData` | Object  | An object including the device-specific data.                                                                                                                |

The structures of the `serviceData` are described in the following sections.

#### Bot (WoHand)

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

| Property    | Type    | Description                                                                                                                                  |
| :---------- | :------ | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`     | String  | This value is always `"H"`, which means "Bot (WoHand)".                                                                                      |
| `modelName` | String  | This value is always `"WoHand"`, which means "Bot".                                                                                          |
| `mode`      | Boolean | This indicates the mode setting. When the mode is "Switch mode", this value is `true`. When the mode is "Press mode", this value is `false`. |
| `state`     | Boolean | This value indicates whether the switch status is ON or OFF.                                                                                 |
| `battery`   | Integer | (**experimental**) This value indicates the battery level (`%`).                                                                             |

The `mode` can be changed only using the official smartphone app. The node-switchbot does not support changing the mode because the BLE protocol is non-public.

If the `mode` is `false`, which means the "Press mode" is selected, the `state` is always `false`. If the `mode` is `true`, which means the "Switch mode" is selected, the `state` represents the logical state (ON or OFF). Note that it does _not_ mean the physical arm position. The physical arm position depends on the setting "Inverse the on/off direction" on the official smartphone app.

| "Inverse the on/off direction" | Value of the `state` | Logical state | Physical arm position |
| :----------------------------- | :------------------- | :------------ | :-------------------- |
| disabled                       | `true`               | OFF           | Up (retracted)        |
| &nbsp;                         | `false`              | ON            | Down (stretched)      |
| enabled                        | `true`               | OFF           | Down (stretched)      |
| &nbsp;                         | `false`              | ON            | Up (retracted)        |

The `battery` is _experimental_ for now. I'm not sure whether the value is correct or not. Never trust this value for now.

#### Meter (WoSensorTH)

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

| Property         | Type    | Description                                                                                                  |
| :--------------- | :------ | :----------------------------------------------------------------------------------------------------------- |
| `model`          | String  | This value is always `"T"`, which means "Meter (WoSensorTH)".                                                |
| `modelName`      | String  | This value is always `"WoSensorTH"`, which means "Meter".                                                    |
| `temperature`    | Object  |
| &nbsp;&nbsp; `c` | Float   | Temperature (degree Celsius/°C)                                                                              |
| &nbsp;&nbsp; `f` | Float   | Temperature (degree Fahrenheit/℉)                                                                            |
| `fahrenheit`     | Boolean | The flag whether the Meter shows Fahrenheit (`true`) or Celsius (`false`) for the temperature on the display |
| `humidity`       | Integer | Humidity (`%`)                                                                                               |
| `battery`        | Integer | (**experimental**) This value indicates the battery level (`%`).                                             |

The `fahrenheit` indicates the setting on the device. Note that it does _not_ indicate the setting on the official smartphone app. The setting of the temperature unit on the device and the setting on the app are independent.

The `battery` is _experimental_ for now. I'm not sure whether the value is correct or not. Never trust this value for now.

#### Curtain (WoCurtain)

Example of the advertisement data:

```json
{
  "id": "ec58c5d00111",
  "address": "ec:58:c5:d0:01:11",
  "rssi": -39,
  "serviceData": {
    "model": "c",
    "modelName": "WoCurtain",
    "calibration": true,
    "battery": 91,
    "position": 1,
    "lightLevel": 1
  }
}
```

Structure of the `serviceData`:

| Property      | Type    | Description                                                                        |
| :------------ | :------ | :--------------------------------------------------------------------------------- |
| `model`       | String  | This value is `"c"`, which means "Curtain (WoCurtain)".                            |
|               |         | or `"{"`, which means "Curtain 3 (WoCurtain)".                                     |
| `modelName`   | String  | This value is always `"WoCurtain"`, which means "Curtain".                         |
| `calibration` | Boolean | This value indicates the calibration status (`true` or `false`).                   |
| `battery`     | Integer | This value indicates the battery level (`1-100`, `%`).                             |
| `position`    | Integer | This value indicates the percentage of current position (`0-100`, 0 is open, `%`). |
| `lightLevel`  | Integer | This value indicates the light level of the light source currently set (`1-10`).   |

#### Contact (WoContact)

Example of the advertisement data:

```json
{
  "id": "f0cda125e3ec",
  "address": "f0:cd:a1:25:e3:ec",
  "rssi": -56,
  "serviceData": {
    "model": "d",
    "modelName": "WoContact",
    "movement": false,
    "battery": 95,
    "doorState": "close",
    "lightLevel": "bright"
  }
}
```

Structure of the `serviceData`:

| Property     | Type    | Description                                                                  |
| :----------- | :------ | :--------------------------------------------------------------------------- |
| `model`      | String  | This value is always `"c"`, which means "Contact (WoContact)".               |
| `modelName`  | String  | This value is always `"WoContact"`, which means "Contact".                   |
| `movement`   | Boolean | This value indicates the motion status (`true` or `false`).                  |
| `battery`    | Integer | This value indicates the battery level (`1-100`, `%`).                       |
| `doorState`  | String  | This value indicates the door Status (`close`, `open`, `timeout no closed`). |
| `lightLevel` | String  | This value indicates the light level (`dark`, `bright`).                     |

#### Motion (WoMotion)

Example of the advertisement data:

```json
{
  "id": "e7216fa344a9",
  "address": "e7:21:6f:a3:44:a9",
  "rssi": -53,
  "serviceData": {
    "model": "s",
    "modelName": "WoMotion",
    "movement": false,
    "battery": 96,
    "lightLevel": "bright"
  }
}
```

Structure of the `serviceData`:

| Property     | Type    | Description                                                  |
| :----------- | :------ | :----------------------------------------------------------- |
| `model`      | String  | This value is always `"s"`, which means "Motion (WoMotion)". |
| `modelName`  | String  | This value is always `"WoMotion"`, which means "Motion".     |
| `movement`   | Boolean | This value indicates the motion status (`true` or `false`).  |
| `battery`    | Integer | This value indicates the battery level (`1-100`, `%`).       |
| `lightLevel` | String  | This value indicates the light level (`dark`, `bright`).     |

#### PlugMini (WoPlugMini)

Example of the advertisement data:

```json
{
  "id": "cd2409ea3e9441f87d4580e0380a62bf",
  "address": "60:55:f9:35:f6:a6",
  "rssi": -50,
  "serviceData": {
    "model": "j",
    "modelName": "WoPlugMini",
    "state": "off",
    "delay": false,
    "timer": false,
    "syncUtcTime": true,
    "wifiRssi": 48,
    "overload": false,
    "currentPower": 0
  }
}
```

Structure of the `serviceData`:

| Property       | Type    | Description                                                                        |
| :------------- | :------ | :--------------------------------------------------------------------------------- |
| `model`        | String  | This value is always `"j"` or `"g"`, which means "PlugMini" (JP or US).            |
| `modelName`    | String  | This value is always `"WoPlugMini"`, which means "PlugMini".                       |
| `state   `     | Boolean | This value indicates whether the plug mini is turned on (`true`) or not (`false`). |
| `delay`        | Boolean | Indicates whether a delay is present.                                              |
| `timer`        | Boolean | Indicates whether a timer is present.                                              |
| `syncUtcTime`  | boolean | Indicates whether the UTC time has been synchronized.                              |
| `overload`     | boolean | Indicates whether the Plug Mini is overloaded, more than 15A current overload.     |
| `currentPower` | Float   | Current power consumption in Watts.                                                |

---

#### SmartLock (WoSmartLock)

Example of the advertisement data:

```json
{
  "id": "d30864110b8c",
  "address": "d3:08:64:11:0b:8c",
  "rssi": -52,
  "serviceData": {
    "model": "o",
    "modelName": "WoSmartLock",
    "battery": 100,
    "calibration": true,
    "status": "LOCKED",
    "update_from_secondary_lock": false,
    "door_open": false,
    "double_lock_mode": false,
    "unclosed_alarm": false,
    "unlocked_alarm": false,
    "auto_lock_paused": false
  }
}
```

Structure of the `serviceData`:

| Property                     | Type    | Description                                                                         |
| :--------------------------- | :------ | :---------------------------------------------------------------------------------- |
| `model`                      | String  | This value is `"o"`, which means "Lock (WoSmartLock)".                              |
| `modelName`                  | String  | This value is always `"WoSmartLock"`, which means "Lock".                           |
| `battery`                    | Integer | This value indicates the battery level (`1-100`, `%`).                              |
| `calibration`                | Boolean | This value indicates the calibration status (`true` or `false`).                    |
| `status`                     | String  | This value indicates the current locked state. Possible values:                     |
|                              |         | `"LOCKED"`, `"UNLOCKED"`, `"LOCKING"`, `"UNLOCKING"`                                |
|                              |         | `"LOCKING_STOP"`, `"UNLOCKING_STOP"` (stuck when locking or unlocking respectively) |
|                              |         | `"NOT_FULLY_LOCKED"` (eu model only), `"UNKNOWN"` (fallback: must be some error)    |
| `update_from_secondary_lock` | Boolean | ??                                                                                  |
| `door_open`                  | Boolean | door open status - whether the door is not detecting the sensor magnet              |
| `double_lock_mode`           | Boolean | dual lock mode enabled status - two locks working simultaneously                    |
| `unclosed_alarm`             | Boolean | enabled status for door ajar alarm function                                         |
| `unlocked_alarm`             | Boolean | whether the alarm function is enabled for door left unlocked                        |
| `auto_lock_paused`           | Boolean | auto lock mode paused                                                               |
| `night_latch`                | Boolean | night latch mode enabled (eu firmware only)                                         |

### Control Device

This sample discovers a Bot (WoHand), then put the Bot's arm down, finally put it up in 5 seconds.

```Typescript
// Load the node-switchbot and get a `Switchbot` constructor object
import { SwitchBotBLE } from 'node-switchbot';
// Create a `Switchbot` object
const switchBotBLE = new SwitchBotBLE();

(async () => {
  // Find a Bot (WoHand)
  const bot_list = await switchBotBLE.discover({ model: "H", quick: true });
  if (bot_list.length === 0) {
    throw new Error("No device was found.");
  }
  // The `WoHand` object representing the found Bot.
  const device = bot_list[0];
  // Put the Bot's arm down (stretch the arm)
  await device.down();
  // Wait for 5 seconds
  await switchBotBLE.wait(5000);
  // Put the Bot's arm up (retract the arm)
  await device.up();
  process.exit();
})();
```

In order to manipulate the arm of your Bot, you have to discover your Bot using the [`discover()`](#discover-method) method. The object `{ model: 'H' }` passed to the method means that only Bots will be discovered. That is, Meters will be ignored.

In this code, you can get a [`WoHand`](#SwitchbotDeviceWoHand-object) object representing the found Bot. Using the [`down()`](#SwitchbotDeviceWoHand-down-method) and [`up()`](#SwitchbotDeviceWoHand-up-method) methods of the object, you can move the arm. In addition to these methods, you can use the [`press()`](#SwitchbotDeviceWoHand-press-method), [`turnOn()`](#SwitchbotDeviceWoHand-turnOn-method), and [`turnOff()`](#SwitchbotDeviceWoHand-turnOff-method) methods as well.

### Logging

To be able to receive logging that this module is pushing out you will need to subscribe to the events.

```typescript
this.switchBotBLE.on('log', (log) => {
  switch (log.level) {
    case LogLevel.SUCCESS:
      this.successLog(log.message)
      break
    case LogLevel.DEBUGSUCCESS:
      this.debugSuccessLog(log.message)
      break
    case LogLevel.WARN:
      this.warnLog(log.message)
      break
    case LogLevel.DEBUGWARN:
      this.debugWarnLog(log.message)
      break
    case LogLevel.ERROR:
      this.errorLog(log.message)
      break
    case LogLevel.DEBUGERROR:
      this.debugErrorLog(log.message)
      break
    case LogLevel.DEBUG:
      this.debugLog(log.message)
      break
    case LogLevel.INFO:
    default:
      this.infoLog(log.message)
  }
})
```

### Supported Devices

The following devices are supported.

| Device                    | BLE Support |
| ------------------------- | ----------- |
| SwitchBot Bot             | Yes         |
| SwitchBot Curtain         | Yes         |
| SwitchBot Meter           | Yes         |
| SwitchBot Motion Sensor   | Yes         |
| SwitchBot Contact Sensor  | Yes         |
| SwitchBot Plug Mini       | Yes         |
| SwitchBot Smart Lock      | Yes         |
| SwitchBot Smart Lock Pro  | Yes         |
| SwitchBot Humidifier      | Yes         |
| SwitchBot Color Bulb      | Yes         |
| SwitchBot LED Strip Light | Yes         |

### Summary

The `SwitchBotBLE` class provides a powerful way to interact with your SwitchBot devices through BLE. By following the examples provided, you can easily integrate SwitchBot device control and monitoring into your applications.
