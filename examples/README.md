# Examples

This directory contains usage examples for node-switchbot v4.0.0.

## Quick Links

- **[basic-usage.js](basic-usage.js)** - Standard usage with BLE + API hybrid mode
- **[ble-only.js](ble-only.js)** - BLE-only mode without API credentials (Linux/macOS)
- **[api-only.js](api-only.js)** - API-only mode (works on any platform)
- **[device-control.js](device-control.js)** - Comprehensive device control examples
- **[event-handling.js](event-handling.js)** - Event listeners for discovery and commands
- **[bot-password.js](bot-password.js)** - Password-protected Bot control via BLE
- **[typescript-usage.ts](typescript-usage.ts)** - TypeScript type-safe usage example

## Prerequisites

### For BLE Examples

#### macOS
- **Xcode** installed from App Store
- **Bluetooth Permissions**: System Preferences → Security & Privacy → Privacy → Bluetooth → Enable your terminal app
- @stoprocent/noble package (installed automatically)

#### Linux
- **Linux or macOS** (Raspbian, Ubuntu, macOS, etc.)
- **Required packages** (Ubuntu/Debian):
  ```bash
  sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
  ```
- **Running without sudo** (Recommended):
  ```bash
  sudo apt-get install libcap2-bin
  sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
  ```
- @stoprocent/noble package (installed automatically)

### For API Examples

- **SwitchBot account** with devices registered
- **OpenAPI credentials** from SwitchBot app:
  1. Open SwitchBot app
  2. Go to Profile > Preferences
  3. Tap App Version 10 times to enable Developer Options
  4. Get Token and Secret from Developer Options

## Environment Variables

Create a `.env` file for your credentials:

```bash
SWITCHBOT_TOKEN=your_token_here
SWITCHBOT_SECRET=your_secret_here
```

## Running Examples

### JavaScript

```bash
# With credentials
SWITCHBOT_TOKEN=xxx SWITCHBOT_SECRET=yyy node examples/basic-usage.js

# BLE-only (Linux/macOS)
node examples/ble-only.js

# API-only (any platform)
SWITCHBOT_TOKEN=xxx SWITCHBOT_SECRET=yyy node examples/api-only.js
```

### TypeScript

```bash
# Install ts-node if needed
npm install -g ts-node

# Run TypeScript example
SWITCHBOT_TOKEN=xxx SWITCHBOT_SECRET=yyy ts-node examples/typescript-usage.ts
```

## Device Support

All examples work with supported SwitchBot devices:

- **Bot** (WoHand) - Press/Switch mode control
- **Curtain** (WoCurtain) - Open/close/position control
- **Lock** (WoSmartLock, WoSmartLockPro) - Lock/unlock control
- **Meter** (WoSensorTH, Plus, Pro, ProCO2, Outdoor) - Temperature/humidity monitoring
- **Plug Mini** (US, JP, EU) - On/off/toggle control
- **Bulb** (WoBulb) - Color and brightness control
- **Strip** (WoStrip) - LED strip control
- **Ceiling Light** (WoCeilingLight) - Ceiling light control
- **Blind Tilt** (WoBlindTilt) - Blind angle control
- **Humidifier** (WoHumi, WoHumi2) - Mode and efficiency control
- **Air Purifier** (WoAirPurifier, Table) - Fan speed and mode control
- **Hub** (WoHub2, WoHub3) - Status monitoring
- **Contact** (WoContact) - Open/close sensor
- **Motion** (WoPresence) - Motion detection
- **Leak** (WoLeak) - Water leak detection
- **Relay Switch** (WoRelaySwitch1, 1PM) - Relay control
- **Remote** (WoRemote) - Remote status
- **Keypad** (WoKeypad) - Keypad status

## Example Output

```
Discovering devices...
Found 5 devices

Device: Living Room Bot (WoHand)
Device: Bedroom Curtain (WoCurtain)
Device: Front Door Lock (WoSmartLock)
Device: Kitchen Meter (WoSensorTH)
Device: Office Plug (WoPlugMiniUS)
```

## Troubleshooting

### BLE Not Working

- **Linux/macOS only**: BLE requires Linux or macOS operating system
- **Permissions**: You may need to run with `sudo` on Linux
- **Noble error**: Ensure @stoprocent/noble is installed correctly

### API Errors

- **401 Unauthorized**: Check your token and secret are correct
- **404 Not Found**: Device may not be registered in your account
- **Rate Limiting**: API has rate limits, add delays between requests

### Device Not Found

- **BLE**: Device must be in range and powered on
- **API**: Device must be registered and have cloud service enabled

## Need Help?

- [Main README](../README.md)
- [BLE Documentation](../BLE.md)
- [OpenAPI Documentation](../OpenAPI.md)
- [GitHub Issues](https://github.com/OpenWonderLabs/node-switchbot/issues)
