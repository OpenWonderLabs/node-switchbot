/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * device.ts: Switchbot BLE API registration.
 */
import { Characteristic, Peripheral, Service } from '@abandonware/noble';
import { ParameterChecker } from './parameter-checker.js';
import { Advertising, Ad } from './advertising.js';

type Chars = {
  write: Characteristic | null,
  notify: Characteristic | null,
  device: Characteristic | null,
} | null;

export class SwitchbotDevice {
  _peripheral;
  _noble;
  _chars: Chars;
  _SERV_UUID_PRIMARY = 'cba20d00224d11e69fb80002a5d5c51b';
  _CHAR_UUID_WRITE = 'cba20002224d11e69fb80002a5d5c51b';
  _CHAR_UUID_NOTIFY = 'cba20003224d11e69fb80002a5d5c51b';
  _CHAR_UUID_DEVICE = '2a00';
  _READ_TIMEOUT_MSEC = 3000;
  _WRITE_TIMEOUT_MSEC = 3000;
  _COMMAND_TIMEOUT_MSEC = 3000;
  _id;
  _address;
  _model;
  _modelName;
  _was_connected_explicitly;
  _connected;
  _onconnect: () => void;
  _ondisconnect: () => void;
  _ondisconnect_internal: () => void;
  _onnotify_internal: (buf: Buffer) => void;
  /* ------------------------------------------------------------------
   * Constructor
   *
   * [Arguments]
   * - peripheral | Object | Required | The `peripheral` object of noble,
   *              |        |          | which represents this device
   * - noble      | Noble  | Required | The Noble object created by the noble module.
   * ---------------------------------------------------------------- */
  constructor(peripheral: Peripheral, noble: any) {
    this._peripheral = peripheral;
    this._noble = noble;
    this._chars = null;

    // Save the device information
    const ad: Ad = Advertising.parse(peripheral);
    this._id = ad ? ad.id : null;
    this._address = ad ? ad.address : null;
    this._model = ad ? ad.serviceData.model : null;
    this._modelName = ad ? ad.serviceData.modelName : null;


    this._was_connected_explicitly = false;
    this._connected = false;

    this._onconnect = () => { };
    this._ondisconnect = () => { };
    this._ondisconnect_internal = () => { };
    this._onnotify_internal = () => { };
  }

  // Getters
  get id() {
    return this._id;
  }

  get address() {
    return this._address;
  }

  get model() {
    return this._model;
  }

  get modelName() {
    return this._modelName;
  }

  get connectionState() {
    if (!this._connected && this._peripheral.state === 'disconnecting') {
      return 'disconnected';
    } else {
      return this._peripheral.state;
    }
  }

  // Setters
  set onconnect(func: () => void) {
    if (!func || typeof func !== 'function') {
      throw new Error('The `onconnect` must be a function.');
    }
    this._onconnect = func;
  }

  set ondisconnect(func: () => void) {
    if (!func || typeof func !== 'function') {
      throw new Error('The `ondisconnect` must be a function.');
    }
    this._ondisconnect = func;
  }

  /* ------------------------------------------------------------------
   * connect()
   * - Connect the device
   *
   * [Arguments]
   * -  none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  connect() {
    this._was_connected_explicitly = true;
    return this._connect();
  }

  _connect() {
    return new Promise<void>((resolve, reject) => {
      // Check the bluetooth state
      if (this._noble.state !== 'poweredOn') {
        reject(
          new Error(
            'The Bluetooth status is ' + this._noble.state + ', not poweredOn.',
          ),
        );
        return;
      }

      // Check the connection state
      const state = this.connectionState;
      if (state === 'connected') {
        resolve();
        return;
      } else if (state === 'connecting' || state === 'disconnecting') {
        reject(
          new Error('Now ' + state + '. Wait for a few seconds then try again.'),
        );
        return;
      }

      // Set event handlers for events fired on the `Peripheral` object
      this._peripheral.once('connect', () => {
        this._connected = true;
        this._onconnect();
      });

      this._peripheral.once('disconnect', () => {
        this._connected = false;
        this._chars = null;
        this._peripheral.removeAllListeners();
        this._ondisconnect_internal();
        this._ondisconnect();
      });

      // Connect
      this._peripheral.connect((error) => {
        if (error) {
          reject(error);
          return;
        }
        this._getCharacteristics()
          .then((chars) => {
            this._chars = chars;
            return this._subscribe();
          })
          .then(() => {
            resolve();
          })
          .catch((error) => {
            this._peripheral.disconnect();
            reject(error);
          });
      });
    });
  }

  _getCharacteristics(): Promise<Chars> {
    return new Promise((resolve, reject) => {
      // Set timeout timer
      let timer: NodeJS.Timeout | null = setTimeout(() => {
        this._ondisconnect_internal = () => { };
        timer = null;
        reject(
          new Error('Failed to discover services and characteristics: TIMEOUT'),
        );
      }, 5000);

      // Watch the connection state
      this._ondisconnect_internal = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
          this._ondisconnect_internal = () => { };
        }
        reject(
          new Error(
            'Failed to discover services and characteristics: DISCONNECTED',
          ),
        );
      };

      // Discover services and characteristics
      (async () => {
        const service_list = await this._discoverServices();
        if (!timer) {
          throw new Error('');
        }

        const chars = {
          write: null,
          notify: null,
          device: null,
        };

        for (const service of service_list as any[]) {
          const char_list = await this._discoverCharacteristics(service);
          for (const char of char_list as any[]) {
            if (char.uuid === this._CHAR_UUID_WRITE) {
              chars.write = char;
            } else if (char.uuid === this._CHAR_UUID_NOTIFY) {
              chars.notify = char;
            } else if (char.uuid === this._CHAR_UUID_DEVICE) {
              // Some models of Bot don't seem to support this characteristic UUID
              chars.device = char;
            }
          }
        }

        if (chars.write && chars.notify) {
          resolve(chars);
        } else {
          reject(new Error('No characteristic was found.'));
        }
      })().catch((error) => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
          this._ondisconnect_internal = () => { };
          reject(error);
        } else {
          // Do nothing
        }
      });
    });
  }

  _discoverServices() {
    return new Promise((resolve, reject) => {
      this._peripheral.discoverServices([], (error, service_list) => {
        if (error) {
          reject(error);
          return;
        }

        let service = null;
        for (const s of service_list) {
          if (s.uuid === this._SERV_UUID_PRIMARY) {
            service = s;
            break;
          }
        }
        if (service) {
          resolve(service_list);
        } else {
          reject(new Error('No service was found.'));
        }
      });
    });
  }

  _discoverCharacteristics(service: Service) {
    return new Promise((resolve, reject) => {
      service.discoverCharacteristics([], (error, char_list) => {
        if (error) {
          reject(error);
        } else {
          resolve(char_list);
        }
      });
    });
  }

  _subscribe() {
    return new Promise<void>((resolve, reject) => {
      const char = this._chars ? this._chars.notify : null;
      if (!char) {
        reject(new Error('No notify characteristic was found.'));
        return;
      }
      char.subscribe((error) => {
        if (error) {
          reject(error);
          return;
        }
        char.on('data', (buf) => { // Remove the argument passed to the _onnotify_internal function
          this._onnotify_internal(buf);
        });
        resolve();
      });
    });
  }

  _unsubscribe() {
    return new Promise<void>((resolve) => {
      const char = this._chars ? this._chars.notify : null;
      if (!char) {
        resolve();
        return;
      }
      char.removeAllListeners();
      char.unsubscribe(() => {
        resolve();
      });
    });
  }

  /* ------------------------------------------------------------------
   * disconnect()
   * - Disconnect the device
   *
   * [Arguments]
   * -  none
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  disconnect() {
    return new Promise<void>((resolve, reject) => {
      this._was_connected_explicitly = false;
      // Check the connection state
      const state = this._peripheral.state;
      if (state === 'disconnected') {
        resolve();
        return;
      } else if (state === 'connecting' || state === 'disconnecting') {
        reject(
          new Error('Now ' + state + '. Wait for a few seconds then try again.'),
        );
        return;
      }

      // Unsubscribe
      this._unsubscribe().then(() => {
        // Disconnect
        this._peripheral.disconnect(() => {
          resolve();
        });
      });
    });
  }

  _disconnect() {
    if (this._was_connected_explicitly) {
      return new Promise<void>((resolve) => {
        resolve();
      });
    } else {
      return this.disconnect();
    }
  }

  /* ------------------------------------------------------------------
   * getDeviceName()
   * - Retrieve the device name
   *
   * [Arguments]
   * -  none
   *
   * [Return value]
   * - Promise object
   *   The device name will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  getDeviceName() {
    return new Promise((resolve, reject) => {
      let name = '';
      this._connect()
        .then(() => {
          if (!this._chars || !this._chars.device) {
            // Some models of Bot don't seem to support this characteristic UUID
            throw new Error(
              'The device does not support the characteristic UUID 0x' +
              this._CHAR_UUID_DEVICE +
              '.',
            );
          }
          return this._read(this._chars.device);
        })
        .then((buf: any) => {
          name = buf.toString('utf8');
          return this._disconnect();
        })
        .then(() => {
          resolve(name);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /* ------------------------------------------------------------------
   * setDeviceName(name)
   * - Set the device name
   *
   * [Arguments]
   * - name | String | Required | Device name. The bytes length of the name
   *        |        |          | must be in the range of 1 to 20 bytes.
   *
   * [Return value]
   * - Promise object
   *   Nothing will be passed to the `resolve()`.
   * ---------------------------------------------------------------- */
  setDeviceName(name: string) {
    return new Promise<void>((resolve, reject) => {
      // Check the parameters
      const valid = ParameterChecker.check(
        { name: name },
        {
          name: { required: true, type: 'string', minBytes: 1, maxBytes: 100 },
        },
        true, // Add the required argument
      );

      if (!valid) {
        reject(new Error(ParameterChecker.error.message));
        return;
      }

      const buf = Buffer.from(name, 'utf8');
      this._connect()
        .then(() => {
          if (!this._chars || !this._chars.device) {
            // Some models of Bot don't seem to support this characteristic UUID
            throw new Error(
              'The device does not support the characteristic UUID 0x' +
              this._CHAR_UUID_DEVICE +
              '.',
            );
          }
          return this._write(this._chars.device, buf);
        })
        .then(() => {
          return this._disconnect();
        })
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  // Write the specified Buffer data to the write characteristic
  // and receive the response from the notify characteristic
  // with connection handling
  _command(req_buf: Buffer) {
    return new Promise((resolve, reject) => {
      if (!Buffer.isBuffer(req_buf)) {
        reject(new Error('The specified data is not acceptable for writing.'));
        return;
      }

      let res_buf: Buffer | unknown;

      this._connect()
        .then(() => {
          if (!this._chars || !this._chars.write) {
            return reject(new Error('No characteristics available.'));
          }
          return this._write(this._chars.write, req_buf);
        })
        .then(() => {
          return this._waitCommandResponse();
        })
        .then((buf) => {
          res_buf = buf;
          return this._disconnect();
        })
        .then(() => {
          resolve(res_buf);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  _waitCommandResponse() {
    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined = setTimeout(() => {
        timer = undefined;
        this._onnotify_internal = () => { };
        reject(new Error('COMMAND_TIMEOUT'));
      }, this._COMMAND_TIMEOUT_MSEC);

      this._onnotify_internal = (buf) => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        this._onnotify_internal = () => { };
        resolve(buf);
      };
    });
  }

  // Read data from the specified characteristic
  _read(char: Characteristic) {
    return new Promise((resolve, reject) => {
      // Set a timeout timer
      let timer: NodeJS.Timeout | undefined = setTimeout(() => {
        reject('READ_TIMEOUT');
      }, this._READ_TIMEOUT_MSEC);

      // Read characteristic data
      char.read((error, buf) => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        if (error) {
          reject(error);
        } else {
          resolve(buf);
        }
      });
    });
  }

  // Write the specified Buffer data to the specified characteristic
  _write(char: Characteristic, buf: Buffer) {
    return new Promise<void>((resolve, reject) => {
      // Set a timeout timer
      let timer: NodeJS.Timeout | undefined = setTimeout(() => {
        reject('WRITE_TIMEOUT');
      }, this._WRITE_TIMEOUT_MSEC);

      // write characteristic data
      char.write(buf, false, (error) => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
