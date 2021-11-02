# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/)

## [Version 1.1.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.1.1) (2021-11-02)

### Changes

- Change back from @node/noble to @abandonware/noble

## [Version 1.1.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.1.0) (2021-10-26)

### Changes

- Add Contact/Motion Sensor advertisement
- Add Humidifier advertisement
- Correct Model for advertisement

## [Version 1.0.8](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.8) (2021-09-30)

### Changes

- fix extra trace of old noble from @abandonware/noble

## [Version 1.0.7](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.7) (2021-09-24)

### Changes

- Change from @abandonware/noble to @homebridge/noble

## [Version 1.0.6](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.6) (2021-08-29)

### Changes

- Fixes FATAL ERROR: ad_id is not defined

## [Version 1.0.5](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.5) (2021-08-04)

### Changes

- Adding code for Contact and Motion Sensors
  - Not Ready to be used yet though

## [Version 1.0.4](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.4) (2021-08-03)

### Changes

- Support for the discover method with id on macOS

## [Version 1.0.3](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.3) (2021-07-30)

### Changes

- Fixed misspelling.

## [Version 1.0.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.2) (2021-07-29)

### Changes

- Housekeeping and update dependencies

## [Version 1.0.1](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.1) (2021-07-29)

### Changes

- Fixed issue where after switching Bluetooth off and on, would not work properly.

## [Version 1.0.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v1.0.0) (2021-01-21)

### Changes

-   * fix "No device was found" in MacOS

## [Version 0.2.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.2.0) (2020-11-05)

### Changes

- Modify Curtain's action command to support group and running mode. (Thanks to [@SwitchBot-Wonderlabs](https://github.com/OpenWonderLabs/node-switchbot/pull/7/))

## [Version 0.1.0](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.1.0) (2020-10-28)

### Changes

- Added support for SwitchBot Curtain. (Thanks to [@SwitchBot-Wonderlabs](https://github.com/OpenWonderLabs/node-switchbot/pull/6/))
- Added support for running on the Raspberry Pi Zero W. (Thanks to [@zizi4n5](https://github.com/OpenWonderLabs/node-switchbot/pull/5))

## [Version 0.0.5](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.5) (2020-02-19)

### Changes

- Improved the stability of discovering the BLE characteristics. (Thanks to [@dnicolson](https://github.com/OpenWonderLabs/node-switchbot/issues/3))

## [Version 0.0.4](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.4) (2020-02-11)

### Changes

- Fixed the bug that temperature value lower than 0 degC could not be handled. (Thanks to [@musimasami](https://github.com/OpenWonderLabs/node-switchbot/issues/2))

## [Version 0.0.3](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.3) (2020-02-10)

### Changes

- Now the characteristic UUID `0x2a00` (Device Name) is not mandatory. Some models of Bot don't seem to support the characteristic. (Thanks to [@dnicolson](https://github.com/OpenWonderLabs/node-switchbot/issues/1))
- Fixed the bug that the `turnOn()` method returns an error if the "Press mode" is selected on the Bot.

## [Version 0.0.2](https://github.com/OpenWonderLabs/node-switchbot/releases/tag/v0.0.2) (2019-11-20)

### Changes

- First public release