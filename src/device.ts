/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * device.ts: Switchbot BLE API registration.
 */
import Noble from '@stoprocent/noble';
import { parameterChecker } from './parameter-checker.js';
import { Advertising } from './advertising.js';
import {
  SERV_UUID_PRIMARY, CHAR_UUID_WRITE, CHAR_UUID_NOTIFY, CHAR_UUID_DEVICE,
  READ_TIMEOUT_MSEC, WRITE_TIMEOUT_MSEC, COMMAND_TIMEOUT_MSEC,
} from './settings.js';
import { SwitchBotBLEModel, SwitchBotBLEModelName } from './types/types.js';

type Chars = {
  write: Noble.Characteristic | null,
  notify: Noble.Characteristic | null,
  device: Noble.Characteristic | null,
} | null;

export class SwitchbotDevice {
  _noble: typeof Noble;
  _peripheral: Noble.Peripheral;
  _characteristics: Chars | null;
  _id: string;
  _address: any;
  _model!: SwitchBotBLEModel;
  _modelName!: SwitchBotBLEModelName;
  _explicitly: boolean;
  _connected: boolean;
  onnotify_internal: any;
  ondisconnect_internal!: () => void;
  onconnect_internal!: () => Promise<void>;
  /**
   * Constructor for the Device class.
   *
   * @param {Object} peripheral - The `peripheral` object from noble, representing this device.
   * @param {Noble} noble - The Noble object created by the noble module.
   *
   * This constructor initializes a new instance of the Device class with the specified peripheral and noble objects.
   */
  constructor(peripheral: Noble.Peripheral, noble: typeof Noble) {
    this._peripheral = peripheral;
    this._noble = noble;
    this._characteristics = null;

    // Save the device information
    const ad: any = Advertising.parse(peripheral);
    this._id = ad ? ad.id : null;
    this._address = ad ? ad.address : null;
    this._model = ad ? ad.serviceData.model : null;
    this._modelName = ad ? ad.serviceData.modelName : null;


    this._explicitly = false;
    this._connected = false;

    this.onconnect = () => { };
    this.ondisconnect = () => { };
    this.ondisconnect_internal = () => { };
    this.onnotify_internal = () => { };
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get address(): string {
    return this._address;
  }

  get model(): string {
    return this._model;
  }

  get modelName(): string {
    return this._modelName;
  }

  get connectionState(): string {
    if (!this._connected && this._peripheral.state === 'disconnecting') {
      return 'disconnected';
    } else {
      return this._peripheral.state;
    }
  }

  /**
  * Sets the asynchronous connection handler.
  *
  * This setter assigns a function to be used as the asynchronous connection handler. The handler
  * is expected to be a function that returns a Promise, which resolves once the connection process
  * is complete. The resolution of the Promise does not carry any value.
  *
  * @param func A function that returns a Promise, representing the asynchronous operation of connecting.
  *             This function is expected to be called without any arguments.
  * @throws Error if the provided argument is not a function, ensuring type safety.
  */
  set onconnect(func: () => Promise<void> | void) {
    if (!func || typeof func !== 'function') {
      throw new Error('The `onconnect` must be a function that returns a Promise<void>.');
    }
    this.onconnect_internal = async () => {
      await func();
    };
  }

  /**
  * Sets the asynchronous disconnection handler.
  *
  * This setter configures a function to act as the asynchronous disconnection handler. The handler
  * should be a function that returns a Promise, which resolves when the disconnection process
  * is complete. The resolution of the Promise does not carry any value.
  *
  * @param func A function that returns a Promise, representing the asynchronous operation of disconnecting.
  *             This function is expected to be called without any arguments.
  * @throws Error if the provided argument is not a function, to ensure that the handler is correctly typed.
  */
  set ondisconnect(func: () => Promise<void> | void) {
    if (!func || typeof func !== 'function') {
      throw new Error('The `ondisconnect` must be a function that returns a Promise<void>.');
    }
    this.ondisconnect = async () => {
      await func();
    };
  }

  /**
  * Initiates an asynchronous connection process.
  *
  * This method marks the device as being connected explicitly by setting a flag, then proceeds
  * to initiate the actual connection process by calling an internal asynchronous method `connect_internalAsync`.
  * The `connect_internalAsync` method is responsible for handling the low-level connection logic.
  *
  * @returns A Promise that resolves when the connection process initiated by `connect_internalAsync` completes.
  *          The resolution of this Promise does not carry any value, indicating that the focus is on
  *          the completion of the connection process rather than the result of the connection itself.
  */
  async connect(): Promise<void> {
    this._explicitly = true;
    return await this.connect_internal();
  }

  /**
   * Initiates the device connection process.
   *
   * This method is marked as deprecated and is scheduled for removal in a future version. It is recommended
   * to use `disconnectAsync()` instead. The method returns a Promise that resolves when the device is successfully
   * connected or rejects if the connection cannot be established.
   *
   * The connection process involves several steps:
   * 1. Checks the Bluetooth adapter's state. If it's not powered on, the promise is rejected.
   * 2. Checks the current connection state of the device. If already connected, the promise resolves immediately.
   *    If in the process of connecting or disconnecting, the promise is rejected advising to wait.
   * 3. Sets up event handlers for 'connect' and 'disconnect' events on the peripheral device to manage connection state.
   * 4. Initiates the connection. If an error occurs during this step, the promise is rejected.
   * 5. Once connected, retrieves the device's characteristics and subscribes to them. If this process fails, the device
   *    is disconnected, and the promise is rejected.
   *
   * @returns A Promise<void> that resolves when the device is connected or rejects with an error.
   */
  async connect_internal() {
    // Check the bluetooth state
    if (this._noble._state !== 'poweredOn') {
      throw new Error('The Bluetooth status is ' + this._noble._state + ', not poweredOn.');
    }

    // Check the connection state
    const state = this.connectionState;
    if (state === 'connected') {
      return;
    } else if (state === 'connecting' || state === 'disconnecting') {
      throw new Error('Now ' + state + '. Wait for a few seconds then try again.');
    }

    // Set event handlers for events fired on the `Peripheral` object
    this._peripheral.once('connect', async () => {
      this._connected = true;
      await this.onconnect();
    });

    this._peripheral.once('disconnect', async () => {
      this._connected = false;
      this._characteristics = null;
      this._peripheral.removeAllListeners();
      try {
        await this.ondisconnect_internal();
        await this.ondisconnect();
      } catch (error: any) {
        throw new Error('Error during disconnect:', error);
      }
    });

    // Connect
    await this._peripheral.connectAsync();
    const chars = await this.getCharacteristics();
    this._characteristics = chars;
    await this.subscribe();
  }


  async getCharacteristics(): Promise<Chars> {
    // Set timeout timer
    let timer: NodeJS.Timeout | null = setTimeout(async () => {
      await this.ondisconnect_internal();
      timer = null;
      throw new Error('Failed to discover services and characteristics: TIMEOUT');
    }, 5000);

    try {
      // Discover services and characteristics
      const service_list = await this.discoverServices();
      if (!timer) {
        throw new Error('');
      }

      const chars: Chars = {
        write: null,
        notify: null,
        device: null,
      };

      for (const service of service_list) {
        const char_list = await this.discoverCharacteristics(service);
        for (const char of char_list) {
          if (char.uuid === CHAR_UUID_WRITE) {
            chars.write = char;
          } else if (char.uuid === CHAR_UUID_NOTIFY) {
            chars.notify = char;
          } else if (char.uuid === CHAR_UUID_DEVICE) {
            // Some models of Bot don't seem to support this characteristic UUID
            chars.device = char;
          }
        }
      }

      if (!chars.write || !chars.notify) {
        throw new Error('No characteristic was found.');
      }

      return chars;
    } catch (error) {
      if (timer) {
        clearTimeout(timer);
        this.ondisconnect_internal = () => { };
      }
      throw error;
    } finally {
      if (timer) {
        clearTimeout(timer);
        this.ondisconnect_internal = () => { };
      }
    }
  }

  async discoverServices(): Promise<Noble.Service[]> {
    return await this._peripheral.discoverServicesAsync([])
      .then((service_list: any[]) => {
        const services = service_list.filter((s: { uuid: string; }) => s.uuid === SERV_UUID_PRIMARY);
        if (services.length === 0) {
          throw new Error('No service was found.');
        }
        return services;
      })
      .catch((error) => {
        throw error;
      });
  }

  /**
 * Asynchronously discovers the characteristics of the specified service.
 * This method is an asynchronous version of the deprecated `discoverCharacteristics` method.
 * It attempts to discover the characteristics of the specified service and returns a Promise that resolves with the list of characteristics.
 * If the discovery process fails, the Promise is rejected with an error.
 * @param service The service object for which characteristics will be discovered.
 * @returns A Promise that resolves with the list of characteristics or rejects with an error.
 */
  async discoverCharacteristics(service: Noble.Service): Promise<Noble.Characteristic[]> {
    return service.discoverCharacteristicsAsync([])
      .then((char_list) => {
        return char_list;
      })
      .catch((error) => {
        throw error;
      });
  }


  /**
   * Asynchronously writes data to the specified characteristic.
   * This method is an asynchronous version of the deprecated `write` method.
   * It attempts to write data to the specified characteristic and returns a Promise that resolves once the write operation is complete.
   * If the write operation fails, the Promise is rejected with an error.
   * @param char The characteristic object to which data will be written.
   * @param buf The data to be written to the characteristic.
   * @returns A Promise that resolves once the write operation is complete or rejects with an error.
   */
  async subscribe() {
    const char = this._characteristics ? this._characteristics.notify : null;
    if (!char) {
      throw new Error('No notify characteristic was found.');
    }
    char.subscribeAsync()
      .then(() => {
        char.on('data', (buf) => {
          this.onnotify_internal(buf);
        });
      })
      .catch((error) => {
        throw error;
      });
  }

  /**
 * Asynchronously unsubscribes from the device's notification characteristic.
 *
 * This method checks if the notification characteristic object exists within the cached characteristics
 * (`this.chars`). If the characteristic is found, it proceeds to remove all event listeners attached to it
 * to prevent any further handling of incoming data notifications. Then, it asynchronously unsubscribes from
 * the notification characteristic using `unsubscribeAsync()`, effectively stopping the device from sending
 * notifications to the client.
 *
 * If the notification characteristic is not found, the method simply returns without performing any action.
 *
 * @return A Promise that resolves to `void` upon successful unsubscription or if the characteristic is not found.
 */
  async unsubscribe() {
    const char = this._characteristics ? this._characteristics.notify : null;
    if (!char) {
      return;
    }
    char.removeAllListeners();
    await char.unsubscribeAsync();
  }

  /**
  * Asynchronously disconnects from the device.
  *
  * This method handles the disconnection process by first checking the current
  * connection state of the device. If the device is already disconnected, the
  * method resolves immediately. If the device is in the process of connecting or
  * disconnecting, it throws an error indicating that the operation should be retried
  * after a brief wait. Otherwise, it proceeds to unsubscribe from any subscriptions
  * and then initiates the disconnection process.
  *
  * Note: This method sets a flag to indicate that the disconnection was not initiated
  * by the user explicitly.
  *
  * @returns A Promise that resolves when the disconnection process has completed.
  *          The Promise does not pass any value upon resolution.
  */
  async disconnect() {
    this._explicitly = false;
    const state = this._peripheral.state;

    if (state === 'disconnected') {
      return; // Resolves the promise implicitly
    } else if (state === 'connecting' || state === 'disconnecting') {
      throw new Error('Now ' + state + '. Wait for a few seconds then try again.');
    }

    await this.unsubscribe(); // Wait for unsubscribe to complete
    await this._peripheral.disconnectAsync();
  }

  /**
  * Disconnects from the device asynchronously if the connection was not initiated by the user.
  *
  * This method checks the `explicitly` flag to determine if the connection was initiated by the user.
  * If not, it proceeds to disconnect from the device by calling `this.disconnectAsync()`. After the disconnection,
  * it sets `explicitly` to true to prevent future disconnections when the connection is user-initiated.
  *
  * This approach ensures that automatic disconnections only occur when the user has not explicitly initiated the connection,
  * avoiding unnecessary disconnections in user-initiated sessions.
  *
  * @returns A Promise that resolves once the device has been successfully disconnected, applicable only when the
  *          connection was not user-initiated.
  */
  async disconnect_internal() {
    if (!this._explicitly) {
      await this.disconnect();
      this._explicitly = true; // Ensure this condition is updated to prevent re-entry or incorrect logic flow.
    }
  }

  /**
 * Asynchronously retrieves the device name.
 * This method is designed to fetch the name of the device asynchronously and return it as a promise.
 * It is marked as deprecated and will be removed in a future version. Use `getDeviceNameAsync` instead.
 *
 * @deprecated since version 2.4.0. Will be removed in version 3.0.0. Use `getDeviceNameAsync()` instead.
 * @returns A Promise that resolves with the device name.
 */
  async getDeviceName() {
    let name = '';
    await this.connect_internal()
      .then(async () => {
        if (!this._characteristics || !this._characteristics.device) {
          // Some models of Bot don't seem to support this characteristic UUID
          throw new Error('The device does not support the characteristic UUID 0x' + CHAR_UUID_DEVICE + '.');
        }
        return await this.read(this._characteristics.device);
      })
      .then((buf) => {
        name = buf.toString('utf8');
        return this.disconnect_internal();
      })
      .then(() => {
        return name;
      })
      .catch((error) => {
        throw new Error(error);
      });
  }

  /**
   * Asynchronously retrieves the device name.
   * This method initiates a connection to the device, checks for the presence of a specific characteristic UUID,
   * reads the characteristic to obtain the device name, and then disconnects from the device.
   * It ensures that the device supports the required characteristic for fetching the name. If the characteristic
   * is not supported, it throws an error. The method encapsulates the entire process of connecting, reading,
   * and disconnecting, making it convenient to get the device name with a single call.
   *
   * @returns A Promise that resolves with the device name as a string.
   */
  async getDeviceNameAsnyc(): Promise<string> {
    await this.connect_internal();
    if (!this._characteristics || !this._characteristics.device) {
      throw new Error(`The device does not support the characteristic UUID 0x${CHAR_UUID_DEVICE}.`);
    }
    const buf = await this.read(this._characteristics.device);
    const name = buf.toString('utf8');
    await this.disconnect_internal();
    return name;
  }

  /**
 * Asynchronously sets the device name to the specified value.
 * Validates the new name to ensure it meets the criteria of being a string with a byte length between 1 and 100 bytes.
 * If the validation fails, the promise is rejected with an error detailing the validation issue.
 * Upon successful validation, the device name is updated, and the promise resolves without passing any value.
 *
 * @param name The new device name as a string. Must be 1 to 100 bytes in length.
 * @returns A Promise that resolves to `void` upon successful update of the device name.
 * @deprecated since version 2.4.0. Will be removed in version 3.0.0. Use `setDeviceNameAsync()` instead.
 */
  setDeviceName(name: string) {
    return new Promise<void>((resolve, reject) => {
      // Check the parameters
      const valid = parameterChecker.check(
        { name: name },
        {
          name: { required: true, type: 'string', minBytes: 1, maxBytes: 100 },
        },
        true, // Add the required argument
      );

      if (!valid) {
        reject(new Error(parameterChecker.error!.message));
        return;
      }

      const buf = Buffer.from(name, 'utf8');
      this.connect_internal()
        .then(() => {
          if (!this._characteristics || !this._characteristics.device) {
            // Some models of Bot don't seem to support this characteristic UUID
            throw new Error('The device does not support the characteristic UUID 0x' + CHAR_UUID_DEVICE + '.');
          }
          return this.write(this._characteristics.device, buf);
        })
        .then(() => {
          return this.disconnect_internal();
        })
        .then(() => {
          return;
          resolve();
        })
        .catch((error) => {
          throw new Error(error);
        });
    });
  }

  /**
   * Asynchronously sets the device name to the specified value.
   * This method begins by validating the provided name to ensure it meets the criteria of being a string with a byte length between 1 and 100 bytes.
   * If the name does not pass validation, the method throws an error with a message detailing the validation issue.
   * After passing validation, the method converts the name into a UTF-8 encoded buffer.
   * It then initiates a connection to the device. If the device does not support the required characteristic UUID for setting the device name,
   * an error is thrown indicating the lack of support.
   * Upon successfully connecting and verifying support, the method writes the new name to the device using the appropriate characteristic.
   * Finally, it disconnects from the device, completing the name update process.
   *
   * @param name The new device name as a string. Must be 1 to 100 bytes in length.
   * @returns A Promise that resolves to `void` upon successful update of the device name.
   */
  async setDeviceNameAsync(name: string): Promise<void> {
    // Check the parameters
    const valid = parameterChecker.check(
      { name: name },
      {
        name: { required: true, type: 'string', minBytes: 1, maxBytes: 100 },
      },
      true, // Indicates that the 'name' argument is required
    );

    if (!valid) {
      throw new Error(parameterChecker.error!.message);
    }

    const buf = Buffer.from(name, 'utf8');
    await this.connect_internal();

    if (!this._characteristics || !this._characteristics.device) {
      // Some models of Bot don't seem to support this characteristic UUID
      throw new Error('The device does not support the characteristic UUID 0x' + CHAR_UUID_DEVICE + '.');
    }

    await this.write(this._characteristics.device, buf);
    await this.disconnect_internal();
  }

  /**
   * Asynchronously sends a command to the device and awaits a response.
   * This method encapsulates the process of sending a command encapsulated in a Buffer to the device,
   * and then waiting for the device to respond. The method ensures that the device is connected before sending the command,
   * writes the command to the device's write characteristic, waits for a response on the notify characteristic,
   * and finally disconnects from the device. The response from the device is returned as a Buffer.
   *
   * @param req_buf A Buffer containing the command to be sent to the device.
   * @returns A Promise that resolves with a Buffer containing the device's response to the command.
   */
  async command(req_buf: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(req_buf)) {
      throw new Error('The specified data is not acceptable for writing.');
    }

    await this.connect_internal();

    if (!this._characteristics || !this._characteristics.write) {
      throw new Error('No characteristics available.');
    }

    await this.write(this._characteristics.write, req_buf);
    const res_buf = await this._waitCommandResponseAsync();
    await this.disconnect_internal();

    return res_buf;
  }

  /**
   * Waits for a response from the device after sending a command.
   * This method sets up a promise that resolves when a response is received from the device or rejects if a timeout occurs.
   * A timer is started to enforce a command timeout. If the response is received before the timeout, the timer is cleared.
   * The method sets an internal handler (`onnotify_internal`) to process the incoming response.
   * If the response is not received within the specified timeout period, the promise is rejected with a 'COMMAND_TIMEOUT' error.
   * Once a response is received or a timeout occurs, the internal handler is reset to an empty function to prevent memory leaks.
   * @deprecated since version 2.4.0. Will be removed in version 3.0.0. Use `_waitCommandResponseAsync()` instead.
   *
   * @returns A Promise that resolves with the received Buffer or rejects with an error if a timeout occurs.
   */
  _waitCommandResponse(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined = setTimeout(() => {
        timer = undefined;
        this.onnotify_internal = () => { };
        reject(new Error('COMMAND_TIMEOUT'));
      }, COMMAND_TIMEOUT_MSEC);

      this.onnotify_internal = (buf: Buffer | PromiseLike<Buffer>) => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
        this.onnotify_internal = () => { };
        return buf;
      };
    });
  }

  /**
   * Asynchronously waits for a response from the device after sending a command.
   * This method sets up a promise that resolves when a response is received from the device or rejects if a timeout occurs.
   * A timer is started to enforce a command timeout. If the response is received before the timeout, the timer is cleared.
   * The method sets an internal handler (`onnotify_internalAsync`) to process the incoming response.
   * If the response is not received within the specified timeout period, the promise is rejected with a 'COMMAND_TIMEOUT' error.
   * Once a response is received or a timeout occurs, the internal handler is reset to an empty function to prevent memory leaks.
   *
   * @returns A Promise that resolves with the received Buffer or rejects with an error if a timeout occurs.
   */
  async _waitCommandResponseAsync(): Promise<Buffer> {
    const timeout = READ_TIMEOUT_MSEC; // Timeout period in milliseconds
    let timer: NodeJS.Timeout | null = null;

    // Setup a timeout to reject the operation if it takes too long
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('READ_TIMEOUT')), timeout);
    });

    // Setup the read operation promise
    const readPromise = await this.onnotify_internal();

    // Wait for either the read operation to complete or the timeout to occur
    const result = await Promise.race([readPromise, timeoutPromise]);

    // Clear the timeout if the read operation completes successfully
    if (timer) {
      clearTimeout(timer);
    }
    return result;
  }

  /**
   * Asynchronously reads data from the specified characteristic of the device with a timeout.
   * This method attempts to read data from the device's characteristic and sets a timeout to handle cases where the read operation takes too long.
   * If the read operation does not complete within the specified timeout period, an error is thrown.
   * Once the read operation completes successfully, the timeout is cleared to prevent it from triggering.
   *
   * @param char The characteristic of the device from which data will be read.
   * @returns A Promise that resolves with the data read from the characteristic or rejects with an error if a timeout occurs.
   *
   * @throws Error if the read operation fails or if a timeout occurs.
   */
  async read(char: Noble.Characteristic): Promise<Buffer> {
    let timer: NodeJS.Timeout | undefined = setTimeout(() => {
      throw new Error('READ_TIMEOUT');
    }, READ_TIMEOUT_MSEC);

    // Setup the read operation promise
    const readPromise = await char.readAsync()
      .then((result) => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        } else {
          throw new Error('READ_TIMEOUT');
        }
        return result;
      });

    // Wait for either the read operation to complete or the timeout to occur
    const result = await Promise.race([readPromise, timer]) as Buffer;

    // Clear the timeout if the read operation completes successfully
    if (timer) {
      clearTimeout(timer);
    }
    return result;
  }

  /**
   * Asynchronously writes data to a specified characteristic of the device.
   * This method sends a buffer of data to the device's characteristic and sets a timeout to handle cases where the write operation takes too long.
   * If the write operation does not complete within the specified timeout period, an error is thrown.
   * Once the write operation completes successfully, the timeout is cleared to prevent it from triggering.
   *
   * @param char The characteristic of the device to which the data will be written.
   * @param buf A Buffer containing the data to be written to the device.
   * @returns A Promise that resolves when the write operation completes successfully or rejects with an error if a timeout occurs.
   */
  async write(char: Noble.Characteristic, buf: Buffer): Promise<void | string> {
    let timer: NodeJS.Timeout | undefined = setTimeout(() => {
      throw new Error('WRITE_TIMEOUT');
    }, WRITE_TIMEOUT_MSEC);

    // write characteristic data
    await char.writeAsync(buf, false)
      .then(() => {
        if (timer) {
          clearTimeout(timer);
          timer = undefined;
        } else {
          throw new Error('READ_TIMEOUT');
        }
      })
      .catch((error) => {
        throw new Error('WRITE_TIMEOUT, ' + error);
      });
  }
}
