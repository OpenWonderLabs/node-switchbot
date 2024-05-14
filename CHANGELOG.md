# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/)

## [2.1.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v2.1.0) (2024-05-14)

### What's Changed
- Add Full Switchbot Lock Support [#232](https://github.com/OpenWonderLabs/node-switchbot/pull/232), Thanks [@brozef](https://github.com/brozef)
- Fix TypeScript issues & warnings [#239](https://github.com/OpenWonderLabs/node-switchbot/pull/239) [#240](https://github.com/OpenWonderLabs/node-switchbot/pull/240) [#241](https://github.com/OpenWonderLabs/node-switchbot/pull/241), Thanks [@dnicolson](https://github.com/dnicolson)
- Update Noble [#242](https://github.com/OpenWonderLabs/node-switchbot/pull/242), Thanks [@dnicolson](https://github.com/dnicolson)
dnicolson 
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v2.0.3...v2.1.0

## [2.0.3](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v2.0.3) (2024-02-11)

### What's Changed
- Add some TypeScript types [#228](https://github.com/OpenWonderLabs/node-switchbot/pull/228), Thanks [@dnicolson](https://github.com/dnicolson)
- Remove Buffer import [#229](https://github.com/OpenWonderLabs/node-switchbot/pull/229), Thanks [@dnicolson](https://github.com/dnicolson)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v2.0.2...v2.0.3

## [2.0.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v2.0.2) (2024-02-09)

### What's Changed
- Fix various 2.0.0 issues [#224](https://github.com/OpenWonderLabs/node-switchbot/pull/224), Thanks [@dnicolson](https://github.com/dnicolson)
- Code Cleanup [#225](https://github.com/OpenWonderLabs/node-switchbot/pull/225) [#226](https://github.com/OpenWonderLabs/node-switchbot/pull/226), Thanks [@dnicolson](https://github.com/dnicolson)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v2.0.1...v2.0.2

## [2.0.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v2.0.1) (2024-02-06)

### What's Changed
- Fix async constructor [#220](https://github.com/OpenWonderLabs/node-switchbot/pull/220), Thanks [@dnicolson](https://github.com/dnicolson)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v2.0.0...v2.0.1

## [2.0.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v2.0.0) (2024-02-05)

### What's Changed
- Rewrite into Typescript and Convert CommonJS to ES Module
- Fix Linting [#216](https://github.com/OpenWonderLabs/node-switchbot/pull/216), Thanks [@dnicolson](https://github.com/dnicolson)
- Code Cleaup [#217](https://github.com/OpenWonderLabs/node-switchbot/pull/217), Thanks [@dnicolson](https://github.com/dnicolson)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.10.0...v2.0.0

## [1.10.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.10.0) (2024-01-05)

### What's Changed
- Fix reversed bot state reporting [#207](https://github.com/OpenWonderLabs/node-switchbot/pull/207), Thanks [@grelca](https://github.com/grelca)
- Add support for Curtain 3 [#209](https://github.com/OpenWonderLabs/node-switchbot/pull/209), Thanks [@tsia](https://github.com/tsia)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.9.1...v1.10.0

## [1.9.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.9.1) (2023-11-02)

### What's Changed
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.9.0...v1.9.1

## [1.9.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.9.0) (2023-09-16)

### What's Changed
- Add support for the Indoor/Outdoor Thermo-Hygrometer (WoIOSensorTH) [#200](https://github.com/OpenWonderLabs/node-switchbot/pull/200), Thanks [@moritzmhmk](https://github.com/moritzmhmk)
- Handle noble not being "poweredOn" on init [#199](https://github.com/OpenWonderLabs/node-switchbot/pull/199), Thanks [@moritzmhmk](https://github.com/moritzmhmk)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.8.2...v1.9.0

## [1.8.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.8.2) (2023-07-25)

### What's Changed
- Added Lint Script [#195](https://github.com/OpenWonderLabs/node-switchbot/pull/195), Thanks [@dnicolson](https://github.com/dnicolson)
- Fixed a Linting Issues [#196](https://github.com/OpenWonderLabs/node-switchbot/pull/196), Thanks [@dnicolson](https://github.com/dnicolson)
- Fixed 'TypeError: Assignment to constant variable' [#194](https://github.com/OpenWonderLabs/node-switchbot/pull/194), Thanks [@banboobee](https://github.com/banboobee)
- Fix issue of re-assigning to constant for Temperature [#191](https://github.com/OpenWonderLabs/node-switchbot/pull/191), Thanks [@gravity-addiction](https://github.com/gravity-addiction)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.8.1...v1.8.2

## [1.8.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.8.1) (2023-04-08)

### What's Changed
- Use const keyword for immutable variables [#184](https://github.com/OpenWonderLabs/node-switchbot/pull/184), Thanks [@dnicolson](https://github.com/dnicolson/)
- Use Error object for promise rejection [#181](https://github.com/OpenWonderLabs/node-switchbot/pull/181), Thanks [@dnicolson](https://github.com/dnicolson/)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.8.0...v1.8.1

## [1.8.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.8.0) (2023-01-28)

### What's Changed

- Add Support for BlindTilt (Read Only)
- Use Error object for promise rejection [#181](https://github.com/OpenWonderLabs/node-switchbot/pull/181), Thanks [@dnicolson](https://github.com/dnicolson/)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.7.3...v1.8.0

## [1.7.3](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.7.3) (2023-01-05)

### What's Changed

- Improve error handling [#175](https://github.com/OpenWonderLabs/node-switchbot/pull/175), Thanks [@dnicolson](https://github.com/dnicolson/)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.7.2...v1.7.3

## [1.7.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.7.2) (2022-12-26)

### What's Changed

- Fix for @abandonware/nobles breaking changes that cause: `TypeError: this.noble.once is not a function`.

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.7.1...v1.7.2

## [1.7.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.7.1) (2022-12-20)

### What's Changed

- Fix for @abandonware/nobles breaking changes that cause: `TypeError: this.noble.once is not a function`.

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.7.0...v1.7.1

## [1.7.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.7.0) (2022-12-08)

### What's Changed

- Add Read-only Support for Smart Lock.

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.6.1...v1.7.0

## [1.6.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.6.1) (2022-10-18)

### What's Changed

- Fixed Issue where node-switchbot wouldn't be found.

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.6.0...v1.6.1

## [1.6.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.6.0) (2022-10-18)

### What's Changed

- Added Support for Pushing Changes to Color Bulb & Strip Light
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.5.0...v1.6.0

## [1.5.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.5.0) (2022-10-07)

### What's Changed

- Added Support for receiving status updates from Color Bulb & Strip Light
- Fixed issue that caused excessive logging.
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.4.1...v1.5.0

## [1.4.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.4.1) (2022-08-27)

### What's Changed

- Fix Plug Mini (US) implementation
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.4.0...v1.4.1

## [1.4.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.4.0) (2022-08-19)

### What's Changed

- Added support for Plug Mini (j) & (g)
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.3.0...v1.4.0

## [1.3.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.3.0) (2022-06-25)

### What's Changed

- Added more Device Types, not all supported though.
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.2.0...v1.3.0

## [1.2.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.2.0) (2022-03-04)

### What's Changed

- Added support for SwitchBot "Contact" and "Motion"
- Fix for Curtains on Firmware v3.3 and above
- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.1.2...v1.2.0

## [1.1.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.1.2) (2021-11-13)

### What's Changed

- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.1.1...v1.1.2

## [1.1.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.1.1) (2021-11-02)

### What's Changed

- Change back from @node/noble to @abandonware/noble

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.1.0...v1.1.1

## [1.1.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.1.0) (2021-10-26)

### What's Changed

- Add Contact/Motion Sensor advertisement
- Add Humidifier advertisement
- Correct Model for advertisement

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.8...v1.1.0

## [1.0.8](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.8) (2021-09-30)

### What's Changed

- fix extra trace of old noble from @abandonware/noble

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.7...v1.0.8

## [1.0.7](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.7) (2021-09-24)

### What's Changed

- Change from @abandonware/noble to @homebridge/noble

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.6...v1.0.7

## [1.0.6](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.6) (2021-08-29)

### What's Changed

- Fixes FATAL ERROR: ad_id is not defined

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.5...v1.0.6

## [1.0.5](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.5) (2021-08-04)

### What's Changed

- Adding code for Contact and Motion Sensors
  - Not Ready to be used yet though

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.4...v1.0.5

## [1.0.4](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.4) (2021-08-03)

### What's Changed

- Support for the discover method with id on macOS

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.3...v1.0.4

## [1.0.3](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.3) (2021-07-30)

### What's Changed

- Fixed misspelling.

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.2...v1.0.3

## [1.0.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.2) (2021-07-29)

### What's Changed

- Housekeeping and update dependencies

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.1...v1.0.2

## [1.0.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.1) (2021-07-29)

### What's Changed

- Fixed issue where after switching Bluetooth off and on, would not work properly.

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v1.0.0...v1.0.1

## [1.0.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.0) (2021-01-21)

### What's Changed

- - fix "No device was found" in MacOS

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v0.2.0...v1.0.0

## [0.2.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.2.0) (2020-11-05)

### What's Changed

- Modify Curtain's action command to support group and running mode [#7](https://github.com/OpenWonderLabs/node-switchbot/pull/7), Thanks [@SwitchBot-Wonderlabs](https://github.com/SwitchBot-Wonderlabs)

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v0.1.0...v0.2.0

## [0.1.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.1.0) (2020-10-28)

### What's Changed

- Added support for SwitchBot Curtain [#6](https://github.com/OpenWonderLabs/node-switchbot/pull/6), Thanks [@SwitchBot-Wonderlabs](https://github.com/SwitchBot-Wonderlabs)
- Added support for running on the Raspberry Pi Zero W [#5](https://github.com/OpenWonderLabs/node-switchbot/pull/5), Thanks [@Szizi4n5](https://github.com/zizi4n5)

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v0.0.5...v0.1.0

## [0.0.5](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.5) (2020-02-19)

### What's Changed

- Improved the stability of discovering the BLE characteristics [#3](https://github.com/OpenWonderLabs/node-switchbot/pull/3), Thanks [@dnicolson](https://github.com/dnicolson)

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v0.0.4...v0.0.5

## [0.0.4](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.4) (2020-02-11)

### What's Changed

- Fixed the bug that temperature value lower than 0 degC could not be handled [#2](https://github.com/OpenWonderLabs/node-switchbot/pull/2), Thanks [@musimasami](https://github.com/musimasami)

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v0.0.3...v0.0.4

## [0.0.3](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.3) (2020-02-10)

### What's Changed

- Now the characteristic UUID `0x2a00` (Device Name) is not mandatory. Some models of Bot don't seem to support the characteristic [#3](https://github.com/OpenWonderLabs/node-switchbot/pull/1), Thanks [@dnicolson](https://github.com/dnicolson)
- Fixed the bug that the `turnOn()` method returns an error if the "Press mode" is selected on the Bot.

**Full Changelog**: https://github.com/OpenWonderLabs/node-switchbot/compare/v0.0.2...v0.0.3

## [0.0.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.2) (2019-11-20)

### What's Changed

- First public release

## [0.0.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.1) (2019-11-20)

### What's Changed

- Initial commit 
