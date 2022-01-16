import * as parameterCheckerJs from "./parameter-checker.js";
import * as switchbotAdvertisingJs from "./switchbot-advertising.js";

import SwitchbotDevice from "./switchbot-device.js";
import SwitchbotDeviceWoHand from "./switchbot-device-wohand.js";
import SwitchbotDeviceWoCurtain from "./switchbot-device-wocurtain.js";
import SwitchbotDeviceWoPresence from "./switchbot-device-wopresence.js";
import SwitchbotDeviceWoContact from "./switchbot-device-wocontact.js";
import SwitchbotDeviceWoSensorTH from "./switchbot-device-wosensorth.js";
import SwitchbotDeviceWoHumi from "./switchbot-device-wohumi.js";

class Switchbot {
	/* ------------------------------------------------------------------
  * Constructor
  *	
  * [Arguments]
  * - params  | Object  | Optional |
  *   - noble | Noble   | Optional | The Nobel object created by the noble module.
  *           |         |          | This parameter is optional.
  *           |         |          | If you don't specify this parameter, this
  *           |         |          | module automatically creates it.
  * ---------------------------------------------------------------- */
	constructor(params) {
		// Check parameters
		let noble = null;
		if (params && params.noble) {
			noble = params.noble;
		} else {
			noble = require("@abandonware/noble");
		}

		// Plublic properties
		this.noble = noble;
		this.ondiscover = null;
		this.onadvertisement = null;

		// Private properties
		this._scanning = false;
		this._DEFAULT_DISCOVERY_DURATION = 5000;
		this._PRIMARY_SERVICE_UUID_LIST = ["cba20d00224d11e69fb80002a5d5c51b"];
	}

	/* ------------------------------------------------------------------
  * discover([params])
  * - Discover switchbot devices
  *
  * [Arguments]
  * - params     | Object  | Optional |
  *   - duration | Integer | Optional | Duration for discovery process (msec).
  *              |         |          | The value must be in the range of 1 to 60000.
  *              |         |          | The default value is 5000 (msec).
  *   - model    | String  | Optional | "H", "T", "e", "s", "d", or "c".
  *              |         |          | If "H" is specified, this method will discover only Bots.
  *              |         |          | If "T" is specified, this method will discover only Meters.
  *              |         |          | If "e" is specified, this method will discover only Humidifiers.
  *              |         |          | If "s" is specified, this method will discover only Motion Sensors.
  *              |         |          | If "d" is specified, this method will discover only Contact Sensors.
  *              |         |          | If "c" is specified, this method will discover only Curtains.
  *   - id       | String  | Optional | If this value is set, this method willl discover
  *              |         |          | only a device whose ID is as same as this value.
  *              |         |          | The ID is identical to the MAC address.
  *              |         |          | This parameter is case-insensitive, and
  *              |         |          | colons are ignored.
  *   - quick    | Boolean | Optional | If this value is true, this method finishes
  *              |         |          | the discovery process when the first device
  *              |         |          | is found, then calls the resolve() function
  *              |         |          | without waiting the specified duration.
  *              |         |          | The default value is false.
  *
  * [Returen value]
  * - Promise object
  *   An array will be passed to the `resolve()`, which includes
  *   `SwitchbotDevice` objects representing the found devices.
  * ---------------------------------------------------------------- */
	discover(params = {}) {
		let promise = new Promise((resolve, reject) => {
			// Check the parameters
			let valid = parameterCheckerJs.check(params, {
				duration: { required: false, type: "integer", min: 1, max: 60000 },
				model: { required: false, type: "string", enum: ["H", "T", "e", "s", "d", "c"] },
				id: { required: false, type: "string", min: 12, max: 17 },
				quick: { required: false, type: "boolean" }
			}, false);

			if (!valid) {
				reject(new Error(parameterCheckerJs.error.message));
				return;
			}

			if (!params) {
				params = {};
			}

			// Determine the values of the parameters
			let p = {
				duration: params.duration || this._DEFAULT_DISCOVERY_DURATION,
				model: params.model || "",
				id: params.id || "",
				quick: params.quick ? true : false
			};

			// Initialize the noble object
			this._init().then(() => {
				let peripherals = {};
				let timer = null;
				let finishDiscovery = () => {
					if (timer) {
						clearTimeout(timer);
					}
					this.noble.removeAllListeners("discover");
					this.noble.stopScanning();
					let device_list = [];
					for (let addr in peripherals) {
						device_list.push(peripherals[addr]);
					}
					resolve(device_list);
				};

				// Set an handler for the 'discover' event
				this.noble.on("discover", (peripheral) => {
					let device = this._getDeviceObject(peripheral, p.id, p.model);
					if (!device) {
						return;
					}
					let id = device.id;
					peripherals[id] = device;

					if (this.ondiscover && typeof (this.ondiscover) === "function") {
						this.ondiscover(device);
					}

					if (p.quick) {
						finishDiscovery();
						return;
					}
				});

				// Start scaning
				this.noble.startScanning(this._PRIMARY_SERVICE_UUID_LIST, false, (error) => {
					if (error) {
						reject(error);
						return;
					}
					timer = setTimeout(() => {
						finishDiscovery();
					}, p.duration);
				});
			}).catch((error) => {
				reject(error);
			});
		});
		return promise;
	}

	_init() {
		let promise = new Promise((resolve, reject) => {
			switch (this.noble.state) {
			case "poweredOn":
				resolve();
				return;
			case "unsupported", "unauthorized", "poweredOff":
				let err = new Error("Failed to initialize the Noble object: " + this.noble.state);
				reject(err);
				return;
			default: // 'resetting', 'unknown'
				this.noble.once("stateChange", (state) => {
					if (state === "poweredOn") {
						resolve();
					} else {
						let err = new Error("Failed to initialize the Noble object: " + state);
						reject(err);
					}
				});
			}
		});
		return promise;
	}

	_getDeviceObject(peripheral, id, model) {
		let ad = switchbotAdvertisingJs.parse(peripheral);
		if (this._filterAdvertising(ad, id, model)) {
			let device = null;
			switch (ad.serviceData.model) {
			case "H":
				device = new SwitchbotDeviceWoHand(peripheral, this.noble);
				break;
			case "e":
				device = new SwitchbotDeviceWoHumi(peripheral, this.noble);
				break;
			case "T":
				device = new SwitchbotDeviceWoSensorTH(peripheral, this.noble);
				break;
			case "s":
				device = new SwitchbotDeviceWoPresence(peripheral, this.noble);
				break;
			case "d":
				device = new SwitchbotDeviceWoContact(peripheral, this.noble);
				break;
			case "c":
				device = new SwitchbotDeviceWoCurtain(peripheral, this.noble);
				break;
			default: // 'resetting', 'unknown'
				device = new SwitchbotDevice(peripheral, this.noble);
			}
			return device;
		} else {
			return null;
		}
	}

	_filterAdvertising(ad, id, model) {
		if (!ad) {
			return false;
		}
		if (id) {
			id = id.toLowerCase().replace(/\:/g, "");
			let ad_id = ad.address.toLowerCase().replace(/[^a-z0-9]/g, "");
			if (ad_id !== id) {
				return false;
			}
		}
		if (model) {
			if (ad.serviceData.model !== model) {
				return false;
			}
		}
		return true;
	}

	/* ------------------------------------------------------------------
  * startScan([params])
  * - Start to monitor advertising packets coming from switchbot devices
  *
  * [Arguments]
  *   - params   | Object  | Optional |
  *   - model    | String  | Optional | "H", "T", "e", "s", "d", or "c".
  *              |         |          | If "H" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Bots.
  *              |         |          | If "T" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Meters.
  *              |         |          | If "e" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Humidifiers.
  *              |         |          | If "s" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Motion Sensor.
  *              |         |          | If "d" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Contact Sensor.
  *              |         |          | If "c" is specified, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from Curtains.
  *   - id       | String  | Optional | If this value is set, the `onadvertisement`
  *              |         |          | event hander will be called only when advertising
  *              |         |          | packets comes from devices whose ID is as same as
  *              |         |          | this value.
  *              |         |          | The ID is identical to the MAC address.
  *              |         |          | This parameter is case-insensitive, and
  *              |         |          | colons are ignored.
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
	startScan(params) {
		let promise = new Promise((resolve, reject) => {
			// Check the parameters
			let valid = parameterCheckerJs.check(params, {
				model: { required: false, type: "string", enum: ["H", "T", "e", "s", "d", "c"] },
				id: { required: false, type: "string", min: 12, max: 17 },
			}, false);

			if (!valid) {
				reject(new Error(parameterCheckerJs.error.message));
				return;
			}

			if (!params) {
				params = {};
			}

			// Initialize the noble object
			this._init().then(() => {

				// Determine the values of the parameters
				let p = {
					model: params.model || "",
					id: params.id || ""
				};

				// Set an handler for the 'discover' event
				this.noble.on("discover", (peripheral) => {
					let ad = switchbotAdvertisingJs.parse(peripheral);
					if (this._filterAdvertising(ad, p.id, p.model)) {
						if (this.onadvertisement && typeof (this.onadvertisement) === "function") {
							this.onadvertisement(ad);
						}
					}
				});

				// Start scaning
				this.noble.startScanning(this._PRIMARY_SERVICE_UUID_LIST, true, (error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			}).catch((error) => {
				reject(error);
			});
		});
		return promise;
	}

	/* ------------------------------------------------------------------
  * stopScan()
  * - Stop to monitor advertising packets coming from switchbot devices
  *
  * [Arguments]
  * - none
  *
  * [Returen value]
  * - none
  * ---------------------------------------------------------------- */
	stopScan() {
		this.noble.removeAllListeners("discover");
		this.noble.stopScanning();
	}

	/* ------------------------------------------------------------------
  * wait(msec) {
  * - Wait for the specified time (msec)
  *
  * [Arguments]
  * - msec | Integer | Required | Msec.
  *
  * [Returen value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
	wait(msec) {
		return new Promise((resolve, reject) => {
			// Check the parameters
			let valid = parameterCheckerJs.check({ msec: msec }, {
				msec: { required: true, type: "integer", min: 0 }
			});

			if (!valid) {
				reject(new Error(parameterCheckerJs.error.message));
				return;
			}
			// Set a timer
			setTimeout(resolve, msec);
		});
	}

}

export default Switchbot;