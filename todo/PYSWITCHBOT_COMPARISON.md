# pySwitchBot Comparison - Implementation Roadmap

Comprehensive comparison between pySwitchBot (Python) and node-switchbot (TypeScript/Node.js) based on repository analysis performed on March 7, 2026.

## 🔍 Discovery & Advertisement Parsing

### Current Gap
- **pySwitchBot**: 50+ dedicated device parsers extracting detailed status from advertisements without connection
- **node-switchbot**: Basic model identification, requires connection for detailed status

### Implementation Tasks

#### High Priority
- [ ] **Task 1.1**: Create dedicated advertisement parser per device type in `src/devices/`
  - Bot: Extract `switchMode`, `isOn`, `battery` from advertisements
  - Curtain: Extract `calibration`, `inMotion`, `position`, `lightLevel`, `deviceChain`
  - Lock: Extract `sequence_number`, `status`, `door_open`, alarms, `night_latch`
  - Meter: Extract temperature, humidity, battery
  - Relay Switch: Extract `sequence_number`, `isOn`, `channel2_isOn`

- [ ] **Task 1.2**: Implement manufacturer data extraction priority
  - Check service data first (UUID `fd3d`)
  - Fall back to manufacturer data (IDs: 2409, 741, 89)
  - Merge data from both sources

- [ ] **Task 1.3**: Add model-to-MAC caching system
  - Cache discovered device models
  - Speed up subsequent scans
  - Store in DeviceManager

#### Medium Priority
- [ ] **Task 1.4**: Enhance advertisement data structure
  - Add `rawAdvData` field
  - Add `isEncrypted` flag
  - Add `modelFriendlyName` field
  
- [ ] **Task 1.5**: Add advertisement data merging
  - Preserve old values when new data is None
  - Recursive dict merging for nested structures
  - Implement `_merge_data()` helper

## 🎮 Control Commands Enhancement

### Bot (WoHand) Commands

#### High Priority
- [x] **Task 2.1**: Add `setMode(mode: 'switch' | 'press')` command ✅
  - Switch mode: Toggle on/off
  - Press mode: Momentary press
  - Command: `0x57 0x0F 0x47 0x01 MODE` (MODE: 0x00=press, 0x01=switch)

- [x] **Task 2.2**: Add `setLongPress(duration: number)` command ✅
  - Configure press duration (1-255 deciseconds)
  - Command: `0x57 0x0F 0x47 0x03 DURATION`
  
- [x] **Task 2.3**: Add direct arm control ✅
  - `handUp()` - Raise arm
  - `handDown()` - Lower arm
  - More precise than toggle

### Curtain Commands

#### High Priority
- [x] **Task 3.1**: Add speed parameter to movement commands ✅
  - `open(speed?: number)` - Speed 1-255 (default: 255)
  - `close(speed?: number)` - Speed 1-255
  - `setPosition(position: number, speed?: number)` - Position with speed
  - Command: `0x57 0x0F 0x45 0x01 0x05 MODE SPEED POSITION`

- [x] **Task 3.2**: Add Curtain 3 specific commands ✅
  - Support Curtain 3 model detection
  - Implement multi-command sequences
  - Add extended info retrieval

#### Medium Priority
- [x] **Task 3.3**: Add `getExtendedInfo()` command ✅
  - Returns device chain information
  - Grouped curtain status
  - Command: `0x57 0x0F 0x46 0x01`

### Lock Commands

#### High Priority
- [x] **Task 4.1**: Add `unlockWithoutUnlatch()` command ✅
  - EU firmware feature
  - Unlocks without unlatching door
  - Command: Different from standard unlock

- [x] **Task 4.2**: Implement notification handling ✅
  - Subscribe to lock notifications
  - Real-time status updates
  - Handle unsolicited notifications

- [x] **Task 4.3**: Add smart lock state detection ✅
  - Check current state before sending command
  - Avoid unnecessary unlock/lock commands
  - Return early if already in target state

#### Medium Priority
- [x] **Task 4.4**: Add `getLockInfo()` command ✅
  - Get detailed lock configuration
  - Battery, firmware, settings
  - Command: `0x57 0x02`

### Relay Switch (1PM/2PM) Commands

#### High Priority
- [x] **Task 5.1**: Add `toggle()` command ✅
  - Toggle current state
  - Command: `0x57 0x0F 0x50 0x01 0x01 0x02`

- [x] **Task 5.2**: Implement power monitoring ✅
  - `getBasicInfo()` - Returns voltage, current, power, energy
  - Parse response: 11 bytes with power data at specific offsets
  - Command: `0x57 0x02`

- [x] **Task 5.3**: Add channel-specific control (2PM model) ✅
  - `setChannel1(state: boolean)`
  - `setChannel2(state: boolean)`
  - Detect 2PM vs 1PM model

#### Medium Priority
- [ ] **Task 5.4**: Add time/energy tracking
  - `getCurrentTimeAndStartTime()` - For energy calculations
  - Command: `0x57 0x0F 0x51 0x01 0x05 0x01 0x00 0x00 0x00`

- [ ] **Task 5.5**: Add garage door opener support
  - Variant of relay switch
  - Specific command sequences
  - Model: SwitchBot Relay Switch (garage mode)

### Light (Bulb/Strip) Commands

#### High Priority
- [x] **Task 6.1**: Add effect presets (20+ effects) ✅
  - Christmas, Halloween, Sunset, Rainbow, etc.
  - Command: `0x57 0x0F 0x47 0x01 EFFECT_ID 0xFF SPEED 0x00 0x00 0x00`
  - Effect IDs: 0x00-0x13 (20 effects)
  - Speed: 0x01 (slow) to 0x64 (fast)

- [x] **Task 6.2**: Add RGBIC segmented control ✅
  - Control individual LED segments
  - RGBIC-specific effects
  - Multi-zone color control

#### Medium Priority
- [x] **Task 6.3**: Add color temperature with min/max ✅
  - `setColorTemp(minTemp: number, maxTemp: number, temp: number)`
  - Command: `0x57 0x0F 0x47 0x01 0x17 BRIGHTNESS MIN_KEL MAX_KEL TEMP`

- [x] **Task 6.4**: Implement multi-command sequences ✅
  - Send multiple commands in series
  - Used for complex light patterns
  - Support for Strip Light 3

### Humidifier Commands

#### High Priority
- [x] **Task 7.1**: Add humidity level control ✅
  - `setLevel(level: number)` - Set target humidity (1-100)
  - Command: `0x57 0x0F 0xXX 0x01 LEVEL` (XX varies by model)

- [ ] **Task 7.2**: Add mode control
  - `setAuto()` - Automatic mode
  - `setManual()` - Manual mode
  - Get target humidity level

### Air Purifier Commands

#### High Priority
- [ ] **Task 8.1**: Add preset modes
  - Modes: `level_1`, `level_2`, `level_3`, `auto`, `sleep`, `pet`
  - `setPresetMode(mode: string)`
  - Command: `0x57 0x0F 0x4E 0x01 MODE_ID`

- [ ] **Task 8.2**: Add status with AQI/PM2.5
  - Parse air quality index from response
  - PM2.5 levels
  - Fan speed and mode

### Vacuum Commands

#### High Priority
- [x] **Task 9.1**: Implement vacuum device classes ✅
  - K10+, K10+ Pro, K10+ Pro Combo
  - K11+, K20
  - S10, S20

- [x] **Task 9.2**: Add basic vacuum commands ✅
  - `cleanUp(protocolVersion: number)` - Start cleaning
  - `returnToDock(protocolVersion: number)` - Return to base
  - Support protocol versions 1 and 2

- [x] **Task 9.3**: Add vacuum status getters ✅
  - Battery level
  - Work status (cleaning, returning, docked, etc.)
  - Dustbin status
  - Network status

## 📊 Status & Response Parsing

### Advertisement-Based Status (No Connection Required)

#### High Priority
- [x] **Task 10.1**: Implement passive status from advertisements ✅
  - Parse device state from BLE advertisements
  - No connection needed for basic status
  - Cache last known state

- [x] **Task 10.2**: Add sequence number tracking ✅
  - Monitor `sequence_number` in advertisements
  - Auto-trigger status update when sequence changes
  - Implement for: locks, relay switches, vacuums, air purifiers

#### Medium Priority
- [ ] **Task 10.3**: Add calibration status tracking
  - Parse calibration bit from advertisements
  - Track for: curtains, blind tilts
  - Warn if device not calibrated

- [ ] **Task 10.4**: Add direction detection for covers
  - Track `_is_opening` / `_is_closing` states
  - Update based on position changes
  - Help UI show proper icons

### Response Validation

#### High Priority
- [ ] **Task 11.1**: Add byte-by-byte response validation
  - Check response length
  - Validate specific byte positions
  - Compare against expected value sets: `{1}`, `{1, 5}`, `{1, 6}`

- [x] **Task 11.2**: Implement password detection ✅
  - Check for `0x07` (password required)
  - Check for `0x09` (password incorrect)
  - Throw specific authentication errors

## 🆕 New Device Types to Add

### High Priority Devices

#### Vacuum Cleaners
- [x] **Task 12.1**: K10+ Vacuum ✅
- [x] **Task 12.2**: K10+ Pro Vacuum ✅
- [x] **Task 12.3**: K10+ Pro Combo Vacuum ✅
- [x] **Task 12.4**: K11+ Vacuum ✅
- [x] **Task 12.5**: K20 Vacuum ✅
- [x] **Task 12.6**: S10 Vacuum ✅
- [x] **Task 12.7**: S20 Vacuum ✅

#### Lock Variants
- [x] **Task 13.1**: Lock Lite ✅
- [x] **Task 13.2**: Lock Vision ✅
- [x] **Task 13.3**: Lock Vision Pro ✅
- [x] **Task 13.4**: Lock Pro WiFi ✅

#### Relay Switches
- [x] **Task 14.1**: Relay Switch 2PM ✅
- [x] **Task 14.2**: Garage Door Opener (relay variant) ✅

### Medium Priority Devices

#### Climate Control
- [x] **Task 15.1**: Evaporative Humidifier (WoHumi2) - Already exists, enhance ✅
- [x] **Task 15.2**: Circulator Fan (Battery/USB) ✅
- [x] **Task 15.3**: Smart Thermostat Radiator ✅
- [x] **Task 15.4**: Climate Panel ✅

#### Lighting
- [x] **Task 16.1**: Strip Light 3 ✅
- [x] **Task 16.2**: Floor Lamp ✅
- [x] **Task 16.3**: RGBICWW Strip Light ✅
- [x] **Task 16.4**: RGBICWW Floor Lamp ✅
- [x] **Task 16.5**: Art Frame ✅

#### Other
- [x] **Task 17.1**: Plug Mini EU - Already exists, verify ✅
- [x] **Task 17.2**: Roller Shade ✅
- [x] **Task 17.3**: Keypad Vision ✅
- [x] **Task 17.4**: Keypad Vision Pro ✅
- [x] **Task 17.5**: Hub3 - Already exists, enhance ✅
- [x] **Task 17.6**: HubMini Matter ✅

**Total New Devices:** ~30+ device types/variants to add or enhance

## 🔐 Encryption & Security

### High Priority

- [ ] **Task 18.1**: Implement GCM encryption mode
  - AES128-GCM cipher support
  - 12-byte IV for GCM (vs 16-byte for CTR)
  - Include 2-byte authentication tag
  - Skip auth verification (firmware returns partial tag)

- [ ] **Task 18.2**: Add automatic encryption mode detection
  - Detect CTR vs GCM from device response
  - Command: `0x57 0x0F 0x21 0x03 KEY_ID` to get IV
  - Parse response to determine mode

- [ ] **Task 18.3**: Implement IV increment for GCM
  - Increment IV after each encrypted command
  - Reset IV on reconnection
  - Track current IV state

- [ ] **Task 18.4**: Add encryption for relay switches
  - Newer relay switches require encryption
  - Same key retrieval process as locks

- [ ] **Task 18.5**: Add encryption for air purifiers
  - Newer air purifiers require encryption
  - Command encryption for all control commands

- [ ] **Task 18.6**: Add encryption for light strips
  - Newer light strips require encryption
  - Effect commands need encryption

### Medium Priority

- [ ] **Task 18.7**: Add encryption state reset on disconnect
  - Clear IV, cipher, encryption mode
  - Re-initialize on next connection
  - Handle firmware updates that change encryption

- [ ] **Task 18.8**: Implement key verification
  - `verifyEncryptionKey()` - Test key validity
  - Try commands with key before assuming valid
  - Better error messages for invalid keys

## ⚠️ Error Handling

### High Priority

- [ ] **Task 19.1**: Add specific BLE exceptions
  - `SwitchbotOperationError` - Operation failures
  - `SwitchbotAuthenticationError` - Auth failures
  - `CharacteristicMissingError` - BLE characteristic missing

- [ ] **Task 19.2**: Implement command result verification
  - `checkCommandResult()` validates response bytes
  - Expected value sets: `{1}`, `{1, 5}`, `{1, 6}`
  - Throw errors with hex result, index, expected values, RSSI

- [ ] **Task 19.3**: Add password verification responses
  - Check for `0x07` byte (password required)
  - Check for `0x09` byte (password incorrect)
  - Throw `SwitchbotAuthenticationError` with context

### Medium Priority

- [ ] **Task 19.4**: Enhance retry logic
  - DBus error backoff (0.25s)
  - `BLEAK_RETRY_EXCEPTIONS` handling
  - Better context in retry errors

- [ ] **Task 19.5**: Add response length validation
  - Check minimum expected length
  - Throw errors for truncated responses
  - Include actual vs expected length in error

## 🔗 Connection Management

### High Priority

- [x] **Task 20.1**: Implement persistent connection with timer ✅
  - Keep connection open for 8.5 seconds after last command
  - Reset timer on each command
  - Allows command batching without reconnecting

- [x] **Task 20.2**: Add operation lock ✅
  - Prevent concurrent BLE operations
  - `_operation_lock` async lock
  - Wait for operations to complete before disconnecting

- [ ] **Task 20.3**: Implement command batching
  - Queue multiple commands
  - Send in sequence on single connection
  - Share connection overhead

### Medium Priority

- [ ] **Task 20.4**: Add expected disconnect tracking
  - `_expected_disconnect` flag
  - Differentiate expected vs unexpected disconnects
  - Better error handling for unexpected disconnects

- [ ] **Task 20.5**: Implement notification handling
  - Per-command notification futures
  - Timeout handling (5s default)
  - Log unsolicited notifications

- [ ] **Task 20.6**: Add characteristic caching
  - Cache read/write characteristics
  - Clear cache on characteristic missing error
  - Avoid repeated characteristic discovery

## ✨ Advanced Features

### High Priority

- [x] **Task 21.1**: Implement sequence device pattern ✅
  - `SequenceDevice` base class
  - Monitor `sequence_number` from advertisements
  - Auto-trigger `update()` when sequence changes
  - Use for: locks, relay switches, vacuums, air purifiers

- [x] **Task 21.2**: Add override state during connection pattern ✅
  - `DeviceOverrideStateDuringConnection` base class
  - Ignore advertisement data while connected
  - Prevents stale data issues
  - Use for: bot, plugs

### Medium Priority

- [x] **Task 21.3**: Add multi-command support ✅ (Completed March 7, 2026)
  - `sendMultipleCommands()` - Send series, return if any succeed
  - `sendCommandSequence()` - Send series, must all succeed
  - Used for Curtain 3 and newer devices

- [x] **Task 21.4**: Add mode setting commands ✅ (Completed March 7, 2026)
  - Universal mode setting command: `0x57 0x03`
  - Extended settings command
  - Per-device mode enums

### Low Priority

- [x] **Task 21.6**: Add passive polling ✅ (Completed March 7, 2026)
  - `PASSIVE_POLL_INTERVAL = 60 * 60 * 24` (24 hours)
  - `pollNeeded()` method
  - Auto-poll inactive devices periodically

- [ ] **Task 21.7**: Implement cloud device fetching
  - `getDevices()` - Fetch devices from SwitchBot account
  - Auto-populate model cache from cloud
  - Handle regional APIs (US/CN/EU)

## 📋 Implementation Priority Guide

### Phase 1: Critical Functionality (Q1 2026)
1. Curtain speed control (Task 3.1)
2. Advertisement-based status (Task 10.1, 10.2)
3. Encryption GCM mode (Task 18.1-18.3)
4. Command result verification (Task 19.2, 19.3)
5. Persistent connections (Task 20.1, 20.2)

### Phase 2: Command Enhancement (Q2 2026)
1. Bot mode/settings (Task 2.1, 2.2)
2. Lock advanced features (Task 4.1-4.3)
3. Light effects (Task 6.1)
4. Relay switch power monitoring (Task 5.1, 5.2)
5. Sequence device pattern (Task 21.1)

### Phase 3: New Devices (Q3 2026)
1. Vacuum cleaners (Task 12.1-12.7)
2. Lock variants (Task 13.1-13.4)
3. Climate control (Task 15.1-15.4)
4. Lighting variants (Task 16.1-16.5)

### Phase 4: Advanced Features (Q4 2026)
1. Multi-command sequences (Task 21.3)
2. Override state pattern (Task 21.2)
3. Passive polling (Task 21.6)
4. Cloud device fetching (Task 21.7)

## 🎯 Success Metrics

- **Feature Parity**: 90%+ of pySwitchBot commands implemented
- **Device Coverage**: 95%+ of SwitchBot device types supported
- **Status Accuracy**: Advertisement-based status for all devices
- **Connection Efficiency**: 50% reduction in connection overhead via batching
- **Error Clarity**: Specific error types for all failure modes

## 📚 References

- **pySwitchBot Repository**: https://github.com/Danielhiversen/pySwitchbot
- **SwitchBot BLE API**: https://github.com/OpenWonderLabs/SwitchBotAPI-BLE
- **Current node-switchbot**: v4.0.0 with macOS BLE compatibility
- **Analysis Date**: March 7, 2026
