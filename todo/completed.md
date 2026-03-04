### Task 5.4: Add time/energy tracking ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Implemented `getCurrentTimeAndStartTime()` in WoRelaySwitch1 to send BLE command `0x57 0x0F 0x51 0x01 0x05 0x01 0x00 0x00 0x00` and parse the response for current time, start time, and energy.
- Updated `RelaySwitchCommands` type in `src/types/device.ts` to include the new method.
- Validated by full build (`npm run build`), lint (`npm run lint`), and test (`npm run test`) cycle: all passed with no errors.
- See PR/commit: Task 5.4 implementation, March 7, 2026.
### Task 8.2: Add status with AQI/PM2.5 for air purifiers ✅
**Completed: March 7, 2026**
**Implementation Details:**
- WoAirPurifier getStatus() returns pm25 and airQuality fields from both API and BLE.
- Air quality index is parsed and mapped to 'excellent', 'good', 'fair', or 'poor'.
- Fan speed and mode are also included in status.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 8.2 implementation, March 7, 2026.

### Task 8.1: Add preset modes for air purifiers ✅
**Completed: March 7, 2026**
**Implementation Details:**
- WoAirPurifier implements setPresetMode() for BLE, supporting all required preset modes: level_1, level_2, level_3, auto, sleep, pet.
- Command mapping matches roadmap requirements and is validated by build, test, and lint cycle.
- See PR/commit: Task 8.1 implementation, March 7, 2026.

### Task 7.2: Add mode control for humidifiers ✅
**Completed: March 7, 2026**
**Implementation Details:**
- WoHumi and WoHumi2 implement setAuto(), setManual(), and getTargetLevel().
- Mode control and target humidity level are available via BLE and API.
- Methods: setAuto(), setManual(), setMode(), setLevel(), getTargetLevel().
- Validated by build, test, and lint cycle.
- See PR/commit: Task 7.2 implementation, March 7, 2026.

### Task 18.7: Add encryption state reset on disconnect ✅
**Completed: March 7, 2026**
**Implementation Details:**
- BLEConnection now clears all encryption state (IV, cipher, mode) for a device on disconnect, ensuring fresh initialization on next connect.
- Applies to all encryption-enabled devices (relay switches, air purifiers, light strips, etc.).
- Validated by full build, test, and lint cycle. All encryption and cleanup tests pass.
- See PR/commit: Task 18.7 implementation, March 7, 2026.
### Task 18.6: Add encryption for light strips ✅
**Completed: March 7, 2026**
**Implementation Details:**
- WoBulb, WoStrip, and WoStripLight3 now support BLE encryption using a 16-byte key (encryptionKey) and optional IV/mode, following the relay/lock/air purifier pattern.
- All BLE commands (turnOn, turnOff, setBrightness, setColor, setEffect, etc.) are encrypted if encryptionKey is present in device info.
- Utility used: src/utils/relay-encryption.ts for AES-128-CTR encryption and command formatting.
- Tests: test/strip-encryption.test.ts validates encrypted and plain command sending.
- All tests passing, lint clean after lint:fix.
- See PR/commit: Task 18.6 implementation, March 7, 2026.

### Task 18.5: Add encryption for air purifiers ✅
**Completed: March 7, 2026**
**Implementation Details:**
- WoAirPurifier now supports BLE encryption using a 16-byte key (encryptionKey) and optional IV/mode, following the relay/lock pattern.
- All BLE commands (turnOn, turnOff, setMode, setFanSpeed, setPresetMode) are encrypted if encryptionKey is present in device info.
- Utility used: src/utils/relay-encryption.ts for AES-128-CTR encryption and command formatting.
- Tests: test/airpurifier-encryption.test.ts validates encrypted and plain command sending.
- All tests passing, lint clean after lint:fix.
- See PR/commit: Task 18.5 implementation, March 7, 2026.

### Task 18.4: Add encryption for relay switches ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Relay switch device classes (WoRelaySwitch1, WoRelaySwitch1PM, WoRelaySwitch2PM) now support BLE encryption using a 16-byte key (encryptionKey) and optional IV/mode, following the lock pattern.
- All relay switch commands (including channel control) are encrypted if encryptionKey is present in device info.
- Utility added: src/utils/relay-encryption.ts for AES-128-CTR encryption and command formatting.
- Tests: test/relay-encryption.test.ts validates encrypted and plain command sending; test/relay-2pm-channel-control.test.ts updated for Buffer compatibility.
- All tests passing, lint clean after lint:fix.
- See PR/commit: Task 18.4 implementation, March 7, 2026.

### Task 10.3: Add calibration status tracking ✅
**Completed: March 7, 2026**
**Implementation Details:**
- WoCurtain and WoBlindTilt now parse the calibration bit from BLE advertisements and include a `calibrated` property in their status objects.
- BlindTiltStatus type updated to include `calibrated?: boolean`.
- Devices log a warning if not calibrated.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 10.3 implementation, March 7, 2026.

### Task 10.4: Add direction detection for covers ✅
**Completed: March 7, 2026**
**Implementation Details:**
- WoCurtain and WoBlindTilt now track direction ('opening' or 'closing') by comparing the current position to the previous position in getStatus().
- The status object for both devices includes a `direction` property.
- This enables UI and integrations to show proper movement icons and states.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 10.4 implementation, March 7, 2026.

### Task 19.1: Add specific BLE exceptions ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Added SwitchbotOperationError for generic BLE operation failures.
- Added SwitchbotAuthenticationError for BLE authentication/encryption key failures.
- Added CharacteristicMissingError for missing BLE characteristics.
- All new error classes extend SwitchBotError and provide clear error codes and messages.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 19.1 implementation, March 7, 2026.

### Task 19.4: Add/expand tests for retry logic (DBus, BLEAK, error context) ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Expanded test/utils.retry.test.ts to cover DBus error backoff, BLEAK_RETRY_EXCEPTIONS, and enhanced error context.
- Validated that retry logic triggers correct backoff and error handling for all relevant error types.
- All tests pass, build and lint are clean.
- See PR/commit: Task 19.4 implementation, March 7, 2026.

### Task 19.5: Add response length validation ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Added validateResponseLength utility to src/utils/index.ts.
- Applied response length checks to relay, bulb, and air purifier BLE status parsing.
- Throws descriptive error if response is truncated (shows actual vs expected length and context).
- All tests pass, build and lint are clean (only style warnings remain).
- See PR/commit: Task 19.5 implementation, March 7, 2026.

### Task 20.5: Implement notification handling ✅
**Completed: March 7, 2026**
**Implementation Details:**
- BLEConnection now supports per-command notification futures with timeout handling (default 5s, configurable).
- Unsolicited notifications are logged with device MAC and payload.
- Test: test/ble-notification-handling.test.ts covers notification futures, timeout, and unsolicited log.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 20.5 implementation, March 7, 2026.

### Task 21.3: Add multi-command support ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Added sendMultipleCommands() and sendCommandSequence() to Curtain 3, WoBulb, WoStrip, and other multi-command devices.
- sendMultipleCommands: Sends a series of commands, returns true if any succeed, false if all fail.
- sendCommandSequence: Sends a series of commands, stops and returns false if any fail, true if all succeed.
- Used for Curtain 3, light devices, and all newer multi-command models.
- Fully tested in test/curtain3-features.test.ts and test/light-multi-command.test.ts (all tests pass).
- Validated by build, test, and lint cycle.
- See PR/commit: Task 21.3 implementation, March 7, 2026.

### Task 21.4: Implement basic settings command (getBasicInfo) ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Universal method `getBasicInfo()` implemented in base device class.
- Uses BLE command [0x57, 0x02] or API fallback.
- Added full JSDoc documentation and a dedicated test file for BLE, API, and error cases.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 21.4 implementation, March 7, 2026.

### Task 21.5: Add mode setting commands ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Universal setMode command implemented in SwitchBotDevice base and all relevant device classes.
- Supports BLE (0x57 0x03) and API ('setMode') for all devices with mode support.
- Per-device mode enums/types (e.g., 'press'/'switch', 'auto'/'manual', etc.)
- Extended settings and universal mode command available for Curtain 3, WoHand, WoHumi, WoAirPurifier, and others.
- Fully tested in test/set-mode.test.ts, test/humidifier-mode-control.test.ts, test/wo-hand.test.ts, and test/airpurifier-status.test.ts.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 21.5 implementation, March 7, 2026.

### Task 21.6: Add passive polling ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Added PASSIVE_POLL_INTERVAL constant (24 hours) and pollNeeded() method to SwitchBotDevice base class.
- pollIfNeeded() method polls device status only if interval elapsed.
- lastPolledAt timestamp tracks last poll per device.
- Fully tested in test/passive-polling.test.ts (all tests pass).
- Validated by build, test, and lint cycle.
- See PR/commit: Task 21.6 implementation, March 7, 2026.

### Task 21.7: Implement cloud device fetching ✅
**Completed: March 7, 2026**
**Implementation Details:**
- OpenAPIClient.getDevices() fetches devices from the SwitchBot account.
- Model cache is auto-populated from cloud device list.
- Regional API support (US/CN/EU) handled via baseURL and settings.
- Fully tested in openapi-get-devices.test.ts and related tests.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 21.7 implementation, March 7, 2026.

### Task 11.1: Add byte-by-byte response validation ✅
**Completed: March 7, 2026**
**Implementation Details:**
- validateResponseLength utility and explicit byte checks implemented in device parsers (WoRelaySwitch1, WoBulb, WoAirPurifier, etc.).
- Ensures response length and byte values are validated for all BLE/API responses.
- Fully tested in device and error handling tests.
- Validated by build, test, and lint cycle.
- See PR/commit: Task 11.1 implementation, March 7, 2026.

### Task 1.5: Add advertisement data merging

**Completed:** March 7, 2026

- Implemented `deepMerge` utility for recursive object merging (src/utils/index.ts)
- Added `mergeAdvertisement` helper for BLEAdvertisement objects (src/utils/index.ts)
- Integrated merging logic into BLE discovery: new advertisements are recursively merged with previous data, preserving old values when new are null/undefined
- Ran build, lint, and all tests: all passed

This completes Task 1.5 for advertisement data merging.

---

## Phase 4: Advanced Features (March 7, 2026)

### Task 6.4: Light Multi-Command Sequences ✅
**Implementation Details:**
- Added `sendCommandSequence(commands)` to `WoBulb` for ordered multi-command execution where all commands must succeed
- Added `sendMultipleCommands(commands)` to `WoBulb` for fallback-style execution returning true if any command succeeds
- Updated `BulbCommands` interface with optional `sendCommandSequence` and `sendMultipleCommands`
- Added `test/light-multi-command.test.ts` with 8 tests validating:
	- Method availability on `WoBulb` and `WoStripLight3`
	- Sequence stop-on-failure behavior
	- Any-success behavior for multiple commands
	- Complex light pattern sequences
- Full validation passed: build ✅ tests ✅ (249 passing) lint ✅ type-check ✅

### Task 7.1: Humidity Level Control ✅
**Implementation Details:**
- Added `setLevel(level: number)` to `WoHumi` as target humidity convenience command
- `setLevel` clamps to valid range (1-100) and delegates to `setEfficiency`
- Updated `HumidifierCommands` interface with optional `setLevel`
- Added `test/humidifier-level-control.test.ts` with 3 tests validating:
	- Delegation from `setLevel` to `setEfficiency`
	- Clamping behavior for out-of-range input
	- Continued `setLevel` availability on `WoHumi2` via inheritance
- Full validation passed: build ✅ tests ✅ (249 passing) lint ✅ type-check ✅

### Task 3.2 & 3.3: Curtain 3 Commands & Extended Info ✅
**Implementation Details:**
- Added Curtain 3 multi-command sequence support:
  - `sendCommandSequence(commands)` - sends multiple commands in series, all must succeed  
  - `sendMultipleCommands(commands)` - sends multiple commands in series, returns true if any succeed
- Added `getExtendedInfo()` method (BLE command `0x57 0x0F 0x46 0x01`):
  - Returns device chain information (master/slave devices)
  - Provides grouped curtain status (position, calibrated, moving)
- Added `CurtainExtendedInfo` interface to type system
- Updated `CurtainCommands` interface with optional new methods
- Curtain 3 model detection already supported via BLE model '{' and device-type mappings
- Created `test/curtain3-features.test.ts` with 8 tests validating:
  - Curtain3 device type recognition
  - Multi-command sequence and multiple command methods
  - Extended info method availability
  - Command sequence success/failure behavior
- Full validation passed: build ✅ tests ✅ (241 passing, +8 new) lint ✅ type-check ✅

---

## Phase 3: New Devices - Other Devices Block (March 7, 2026)

### Task 17.6: HubMini Matter ✅
**Implementation Details:**
- Created `WoHubMiniMatter` class extending `WoHub2` in `src/devices/wo-hubmini-matter.ts`
- Inherits all hub functionality: `getStatus()` returning sensor data (temperature, humidity, lightLevel)
- Wired through 3-layer export chain (device → devices/index.ts → src/index.ts)
- Added to runtime registry: `DEVICE_CLASSES['WoHubMiniMatter']` in `src/switchbot.ts`
- Added device-type mappings in `src/settings.ts`: "HubMini Matter", "SwitchBot HubMini Matter"
- Created `test/hubmini-matter.test.ts` with 3 tests validating device-type mappings and method inheritance from WoHub2
- Full validation passed: build ✅ tests ✅ (233 passing) lint ✅ type-check ✅

### Task 17.5: Hub3 Enhancement ✅
**Implementation Details:**
- Enhanced existing `WoHub3` class (extends `WoHub2` in `src/devices/wo-hub3.ts`)
- Added device-type alias in `src/settings.ts`: "SwitchBot Hub 3" (in addition to existing "Hub 3")
- Created `test/hub3.test.ts` with 3 tests validating device-type mappings and method inheritance from WoHub2
- Verified inheritance: `getStatus()` method returns hub sensor data (temperature, humidity, lightLevel)
- Full validation passed: build ✅ tests ✅ (230 passing) lint ✅ type-check ✅

### Task 17.4: Keypad Vision Pro ✅
**Implementation Details:**
- Created `WoKeypadVisionPro` class extending `WoKeypad` in `src/devices/wo-keypad-vision-pro.ts`
- Inherits all keypad functionality: `getStatus()` methods
- Wired through 3-layer export chain (device → devices/index.ts → src/index.ts)
- Added to runtime registry: `DEVICE_CLASSES['WoKeypadVisionPro']` in `src/switchbot.ts`
- Added device-type mappings in `src/settings.ts`: "Keypad Vision Pro", "SwitchBot Keypad Vision Pro"
- Created `test/keypad-vision-pro.test.ts` with 3 tests validating device-type mapping and method inheritance
- Full validation passed: build ✅ tests ✅ (227 passing) lint ✅ type-check ✅

### Task 17.3: Keypad Vision ✅
**Implementation Details:**
- Created `WoKeypadVision` class extending `WoKeypad` in `src/devices/wo-keypad-vision.ts`
- Inherits all keypad functionality: `getStatus()` methods
- Wired through 3-layer export chain (device → devices/index.ts → src/index.ts)
- Added to runtime registry: `DEVICE_CLASSES['WoKeypadVision']` in `src/switchbot.ts`
- Added device-type mappings in `src/settings.ts`: "Keypad Vision", "SwitchBot Keypad Vision"
- Created `test/keypad-vision.test.ts` with 3 tests validating device-type mapping and method inheritance
- Full validation passed: build ✅ tests ✅ (224 passing) lint ✅ type-check ✅

---

## Phase 0: Foundation & Preparation ✅

### BLE Infrastructure Hardening (Completed March 6, 2026)
- [x] Add enumerable device properties for Homebridge compatibility
- [x] Implement ID-based BLE lookups for macOS (empty MAC address support)
- [x] Add manufacturer data MAC extraction fallback
- [x] Broaden discovery filters for legacy UUIDs (000d)
- [x] Add peripheral validation (connectable flag, RSSI bounds)
- [x] Implement BLE event listener cleanup
- [x] Add connection error cleanup (characteristics discovery failure)
- [x] Create BLE lifecycle regression tests
- [x] Fix resource leaks (event listeners, connection maps)

### Testing & Validation (Completed March 6-7, 2026)
- [x] 124 unit tests passing
- [x] BLE scanner lifecycle tests
- [x] BLE connection cleanup tests
- [x] macOS compatibility validation (45 real devices)

---

## Phase 1: Core Parity Sprint ✅

### Completed March 7, 2026
- [x] Advertisement status parsing and model cache support
	- Added richer advertisement parsing for Bot, Curtain/Curtain3, Lock/Lock Pro, and Relay Switch models
	- Added per-discovery model cache in `BLEScanner`
	- Stored parsed BLE service data on device info for status fallback

- [x] Curtain speed control
	- Added optional speed to `open`, `close`, and `setPosition` commands
	- Updated BLE payload and OpenAPI `setPosition` parameter construction

- [x] GCM/CTR BLE encryption plumbing
	- Added encryption mode (`auto`/`ctr`/`gcm`) support in `BLEConnection`
	- Added IV length validation, auto mode resolution, and GCM IV increment behavior

- [x] BLE command result and password response validation
	- Added command response checks for ack bytes (`0x01`, `0x05`, `0x06`)
	- Added password-required (`0x07`) and password-incorrect (`0x09`) detection

- [x] Persistent BLE connections + operation locking
	- Added per-device operation lock queue in `BLEConnection`
	- Added configurable persistent connection timer with auto-disconnect
	- Added device-level BLE command serialization in base device class

---

## Phase 2: Command Enhancement (Wave 1) ✅

### Completed March 7, 2026
- [x] Bot mode configuration
	- Implemented `setMode('press'|'switch')`, `setLongPress(duration)`, `handUp()`, and `handDown()` on `WoHand`

- [x] Lock advanced features
	- Implemented `unlockWithoutUnlatch()` on `WoSmartLockPro`
	- Added smart pre-checks to skip lock/unlock when already in target state
	- Added `getLockInfo()` helper on lock devices
	- Added BLE notification subscription hooks for lock updates

- [x] Light effect presets
	- Added 20 preset effects with `setEffect(effectName, speed)` on `WoBulb`/`WoStrip`

- [x] Relay power monitoring
	- Added relay basic-info parsing for voltage/current/energy from BLE response payload
	- Integrated parsed metrics into relay BLE status response

- [x] Phase 2 regression coverage
	- Added `test/phase2-features.test.ts` covering Bot mode config, lock smart detection, light effects, and relay metrics parsing

---

## Phase 2: Command Enhancement (Wave 2) ✅

### Completed March 7, 2026
- [x] Relay 2PM channel-specific control (Task 5.3)
	- Created `WoRelaySwitch2PM` class extending `WoRelaySwitch1`
	- Implemented `setChannel1(state: boolean)` and `setChannel2(state: boolean)` methods
	- Added channel-specific command constants (CHANNEL1_ON/OFF, CHANNEL2_ON/OFF) to DEVICE_COMMANDS.RELAY

- [x] Bulb color temperature with min/max bounds (Task 6.3)
	- Added `setColorTemp(minTemp, maxTemp, temp)` method to `WoBulb` class
	- Command format: `0x57 0x0F 0x47 0x01 0x17 BRIGHTNESS MIN_KEL MAX_KEL TEMP`
	- Validates and clamps temperatures, ensures current temp within min/max bounds
	- Auto-corrects reversed min/max values

- [x] RGBIC bulb segmented control (Task 6.2)
	- Created `WoRGBICBulb` class extending `WoBulb`
	- Implemented `setSegmentColor(segmentId, r, g, b)` for individual LED segment color control
	- Implemented `setSegmentEffect(segmentId, effectName, speed)` for segment-specific effects
	- Added 25 RGBIC effects including segment_cycle, segment_wave, segment_chase, segment_strobe, segment_twinkle
	- Inherits all standard bulb features from WoBulb (standard effects, color temperature bounds)

- [x] Phase 2 Wave 2 regression coverage
	- Added `test/phase2-remaining.test.ts` with 21 tests covering Relay 2PM channels, color temperature bounds, and RGBIC segmented control

---

## Phase 2: Advanced Features ✅

### Completed March 7, 2026
- [x] Sequence device pattern (Task 21.1)
	- Added `SequenceDevice` base class
	- Tracks advertisement `sequenceNumber` changes and emits `sequence-changed`
	- Auto-triggers `update()` on sequence changes with in-flight suppression
	- Applied to lock, relay switch, and air purifier device families
	- Added regression coverage in `test/sequence-device.test.ts`

- [x] Override state during connection pattern (Task 21.2)
	- Added `DeviceOverrideStateDuringConnection` base class
	- Ignores advertisement state (`bleServiceData`, battery, RSSI) while BLE connection is active
	- Prevents stale advertisement fallback state during live connections
	- Applied to bot and plug device families
	- Added regression coverage in `test/device-override-state-during-connection.test.ts`

---

## Phase 3: New Device Types (Vacuum Variants) ✅

### Completed March 7, 2026
- [x] K10+ / K10+ Pro / K10+ Pro Combo vacuum variants (Tasks 12.1-12.3)
	- Added `WoVacuumK10Plus`, `WoVacuumK10Pro`, and `WoVacuumK10ProCombo` classes
	- Reused shared `WoVacuum` command/status behavior to avoid duplication
	- Wired `DEVICE_CLASS_MAP` routing for K10 family API/BLE names

- [x] K11+ / K20 / S10 / S20 vacuum variants (Tasks 12.4-12.7)
	- Added `WoVacuumK11Plus`, `WoVacuumK20`, `WoVacuumS10`, and `WoVacuumS20` classes
	- Updated `SwitchBot` runtime device registry and package exports
	- Added regression coverage in `test/vacuum-variants.test.ts` for class mapping

- [x] Lock Lite / Lock Vision variants (Tasks 13.1-13.2)
	- Added `WoSmartLockLite` and `WoSmartLockVision` classes extending `WoSmartLock`
	- Both variants use base lock functionality without unlatch support
	- Wired `DEVICE_CLASS_MAP` routing for lock variant API/BLE names

- [x] Lock Vision Pro / Lock Pro WiFi variants (Tasks 13.3-13.4)
	- Added `WoSmartLockVisionPro` and `WoSmartLockProWiFi` classes extending `WoSmartLockPro`
	- Both variants inherit pro lock features including unlatch support
	- Updated `SwitchBot` runtime device registry and package exports
	- Added regression coverage in `test/lock-variants.test.ts` for class mapping and method inheritance

---

## Phase 3: New Device Types (Relay Variants) ✅

### Completed March 7, 2026
- [x] Relay Switch 2PM wiring completion (Task 14.1)
	- WoRelaySwitch2PM class already existed from Phase 2
	- Completed wiring through src/index.ts exports
	- Added to src/switchbot.ts DEVICE_CLASSES registry
	- Added 'Relay Switch 2PM' mapping to DEVICE_CLASS_MAP in src/settings.ts

- [x] Garage Door Opener relay variant (Task 14.2)
	- Added WoGarageDoorOpener class extending WoRelaySwitch1
	- Lightweight variant reuses relay switch control methods (turnOn/turnOff/toggle)
	- Wired through exports, registry, and DEVICE_CLASS_MAP
	- Added regression coverage in test/relay-variants.test.ts (4 tests)
	- Tests verify: 2PM class mapping, Garage Door Opener mapping, channel methods on 2PM, relay methods on opener

---

## Phase 3: New Device Types (Climate Enhancements) ✅

### Completed March 7, 2026
- [x] Evaporative Humidifier (WoHumi2) enhancement (Task 15.1)
	- Enhanced WoHumi2 with convenience methods: setAuto(), setManual(), setLevel(level)
	- Added evaporative humidifier API aliases in DEVICE_CLASS_MAP to map to WoHumi2
	- Added regression coverage in test/humidifier2-enhancement.test.ts (4 tests)
	- Tests verify WoHumi2 method delegation and evaporative humidifier device-type mapping

- [x] Circulator Fan (Battery/USB) variant (Task 15.2)
	- Added WoCirculatorFan class extending WoAirPurifier
	- Wired fan class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type aliases in DEVICE_CLASS_MAP for Battery/USB fan names
	- Added regression coverage in test/circulator-fan-variants.test.ts (4 tests)
	- Tests verify model mapping and inherited control methods (turnOn/turnOff/setFanSpeed)

- [x] Smart Thermostat Radiator variant (Task 15.3)
	- Added WoSmartThermostatRadiator class extending WoAirPurifier
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type aliases in DEVICE_CLASS_MAP for thermostat radiator names
	- Added regression coverage in test/thermostat-radiator-variants.test.ts (4 tests)
	- Tests verify model mapping and inherited climate control methods (turnOn/turnOff/setMode)

- [x] Climate Panel variant (Task 15.4)
	- Added WoClimatePanel class extending WoAirPurifier
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added climate panel aliases in DEVICE_CLASS_MAP
	- Added regression coverage in test/climate-panel-variants.test.ts (3 tests)
	- Tests verify model mapping and inherited climate control methods (turnOn/turnOff/setMode)

## Phase 3: New Device Types (Lighting Variants) ⏳

### Completed March 7, 2026
- [x] Strip Light 3 (Task 16.1)
	- Added WoStripLight3 class extending WoBulb for color control
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type mappings: "Strip Light 3", "SwitchBot Strip Light 3"
	- Added regression coverage in test/strip-light-3.test.ts (3 tests)
	- Tests verify device-type mapping for both aliases and inherited color control methods

- [x] Floor Lamp (Task 16.2)
	- Added WoFloorLamp class extending WoBulb for color control
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type mappings: "Floor Lamp", "SwitchBot Floor Lamp"
	- Added regression coverage in test/floor-lamp.test.ts (3 tests)
	- Tests verify device-type mapping for both aliases and inherited color control methods

- [x] RGBICWW Strip Light (Task 16.3)
	- Added WoRGBICWWStripLight class extending WoRGBICBulb for segmented control
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type mappings: "RGBICWW Strip Light", "SwitchBot RGBICWW Strip Light"
	- Added regression coverage in test/rgbicww-strip-light.test.ts (3 tests)
	- Tests verify device-type mapping and inherited RGBIC methods (setSegmentColor, setSegmentEffect)
	- Note: Also wired WoRGBICBulb through exports for completeness

- [x] RGBICWW Floor Lamp (Task 16.4)
	- Added WoRGBICWWFloorLamp class extending WoRGBICBulb for segmented control
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type mappings: "RGBICWW Floor Lamp", "SwitchBot RGBICWW Floor Lamp"
	- Added regression coverage in test/rgbicww-floor-lamp.test.ts (3 tests)
	- Tests verify device-type mapping and inherited RGBIC methods (setSegmentColor, setSegmentEffect)

- [x] Art Frame (Task 16.5)
	- Added WoArtFrame class extending WoBulb for color control
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type mappings: "Art Frame", "SwitchBot Art Frame"
	- Added regression coverage in test/art-frame.test.ts (3 tests)
	- Tests verify device-type mapping for both aliases and inherited color control methods
	- **Lighting variants block (Tasks 16.1-16.5) complete!** ✅

## Phase 3: New Device Types (Other Devices) ⏳

### Completed March 7, 2026
- [x] Plug Mini EU verification (Task 17.1)
	- Verified WoPlugMiniEU exists in runtime registry (aliased to WoPlugMiniUS)
	- Verified device-type mapping: "Plug Mini (EU)" → WoPlugMiniEU
	- Added regression coverage in test/plug-mini-eu.test.ts (2 tests)
	- Tests verify EU variant maps to WoPlugMiniUS class and inherits plug control methods
	- Note: WoPlugMiniEU shares implementation with WoPlugMiniUS (regional variant)

	- Added WoRollerShade class extending WoCurtain for motorized window covering control
	- Wired class through exports and SwitchBot runtime DEVICE_CLASSES registry
	- Added device-type mappings: "Roller Shade", "SwitchBot Roller Shade"
	- Added regression coverage in test/roller-shade.test.ts (3 tests)
	- Tests verify device-type mapping and inherited curtain control methods (open, close, pause, setPosition)

### Task 5.4: Add time/energy tracking ✅
**Completed: March 7, 2026**
**Implementation Details:**
- Implemented `getCurrentTimeAndStartTime()` in WoRelaySwitch1 to send BLE command `0x57 0x0F 0x51 0x01 0x05 0x01 0x00 0x00 0x00` and parse the response for current time, start time, and energy.
- Updated `RelaySwitchCommands` type in `src/types/device.ts` to include the new method.
- Validated by full build (`npm run build`), lint (`npm run lint`), and test (`npm run test`) cycle: all passed with no errors.
- See PR/commit: Task 5.4 implementation, March 7, 2026.

---

## Notes

When moving a task from todo.md to this file:
1. Add the completion date
2. Note any implementation details or deviations
3. Link to relevant PRs or commits if applicable
4. Update "Last Updated" timestamp

Format: `- [x] **Task X.Y**: Description (Completed: YYYY-MM-DD)`
