# SwitchBot OpenAPI Documentation

The `SwitchBotOpenAPI` class allows you to interact with SwitchBot devices using the SwitchBot OpenAPI. This documentation provides an overview of how to install, set up, and use the various methods available in the `SwitchBotOpenAPI` class.

## Table of Contents

- [OpenAPI](#openapi)
  - [Importing and Setting Up](#importing-and-setting-up)
  - [`SwitchBotOpenAPI` Object](#switchbotopenapi-object)
    - [`getDevices()` Method](#getdevices-method)
    - [`controlDevice()` Method](#controldevice-method)
    - [`getDeviceStatus()` Method](#getdevicestatus-method)
    - [`setupWebhook()` Method](#setupwebhook-method)
    - [`deleteWebhook()` Method](#deletewebhook-method)
  - [Logging](#logging)
  - [Supported Devices](#supported-devices)

## OpenAPI

### Importing and Setting Up

To use the `SwitchBotOpenAPI` class, you need to import it and create an instance with your SwitchBot token and secret.

```typescript
import { SwitchBotOpenAPI } from 'node-switchbot'

const switchBotAPI = new SwitchBotOpenAPI('your-token', 'your-secret')

// Example usage
switchBotAPI.getDevices().then((devices) => {
  console.log('Devices:', devices)
}).catch((error) => {
  console.error('Error getting devices:', error)
})
```

### SwitchBotOpenAPI Object

The `SwitchBotOpenAPI` object provides several methods to interact with SwitchBot devices. Below are examples of how to use each method.

#### `getDevices()` Method

Fetches the list of devices associated with your SwitchBot account.

```typescript
async function getDevices() {
  try {
    const devices = await switchBotAPI.getDevices()
    console.log('Devices:', devices)
  } catch (e: any) {
    console.error(`failed to get devices, Error: ${e.message ?? e}`)
  }
}

// Example usage
getDevices()
```

#### `controlDevice()` Method

Sends a command to control a specific device.

```typescript
async function controlDevice(deviceId, command, parameter) {
  try {
    const response = await switchBotAPI.controlDevice(deviceId, command, parameter)
    console.log('Control Device Response:', response)
  } catch (error) {
    console.error('Error controlling device:', error)
  }
}

// Example usage
controlDevice('your-device-id', 'turnOn', 'default')
```

#### `getDeviceStatus()` Method

Fetches the current status of a specific device.

```typescript
async function getDeviceStatus(deviceId) {
  try {
    const status = await switchBotAPI.getDeviceStatus(deviceId)
    console.log('Device Status:', status)
  } catch (error) {
    console.error('Error getting device status:', error)
  }
}

// Example usage
getDeviceStatus('your-device-id')
```

#### `setupWebhook()` Method

Sets up a webhook to receive events from SwitchBot devices.

```typescript
async function setupWebhook(url) {
  try {
    await switchBotAPI.setupWebhook(url)
    console.log('Webhook setup successfully')
  } catch (error) {
    console.error('Error setting up webhook:', error)
  }
}

// Example usage
setupWebhook('http://your-webhook-url')
```

#### `deleteWebhook()` Method

Deletes an existing webhook.

```typescript
async function deleteWebhook(url) {
  try {
    await switchBotAPI.deleteWebhook(url)
    console.log('Webhook deleted successfully')
  } catch (error) {
    console.error('Error deleting webhook:', error)
  }
}

// Example usage
deleteWebhook('http://your-webhook-url')
```

### Logging

To be able to receive logging that this module is pushing out you will need to subscribt to the events.

```typescript
this.switchBotAPI.on('log', (log) => {
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

| Device                    | OpenAPI Support | Webhook Support |
| ------------------------- | --------------- | --------------- |
| SwitchBot Bot             | Yes             | Yes             |
| SwitchBot Curtain         | Yes             | Yes             |
| SwitchBot Meter           | Yes             | Yes             |
| SwitchBot Motion Sensor   | Yes             | Yes             |
| SwitchBot Contact Sensor  | Yes             | Yes             |
| SwitchBot Plug Mini       | Yes             | Yes             |
| SwitchBot Smart Lock      | Yes             | Yes             |
| SwitchBot Humidifier      | Yes             | Yes             |
| SwitchBot Color Bulb      | Yes             | Yes             |
| SwitchBot LED Strip Light | Yes             | Yes             |

### Summary

The `SwitchBotOpenAPI` class provides a powerful way to interact with your SwitchBot devices programmatically. By following the examples provided, you can easily integrate SwitchBot device control and monitoring into your applications.
