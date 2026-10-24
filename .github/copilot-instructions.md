# node-switchbot Development Guide

TypeScript (ESM) library for controlling SwitchBot devices over Bluetooth LE, with automatic
OpenAPI (cloud) fallback. Consumed by
[homebridge-switchbot](https://github.com/OpenWonderLabs/homebridge-switchbot). Protocol docs live
in [SwitchBotAPI-BLE](https://github.com/OpenWonderLabs/SwitchBotAPI-BLE).

Trust this guide and the source tree. If they disagree, the source tree wins; fix this guide in the
same change.

## Reference Priority

- **BLE behaviour** (advertisement parsing, model bytes, commands): follow
  [sblibs/pySwitchbot](https://github.com/sblibs/pySwitchbot), then SwitchBotAPI-BLE.
- **OpenAPI** (device lists, `deviceType` strings, commands, status fields):
  [OpenWonderLabs/SwitchBotAPI](https://github.com/OpenWonderLabs/SwitchBotAPI).
- If references conflict, prefer the upstream implementation, keep existing behaviour unless it is a
  clear bug, and note any deliberate deviation in the PR.

## Porting a pySwitchbot Release

This library tracks pySwitchbot. To port a release:

1. Read the release notes, then read the diff of every `feat`/`fix` commit in it
   (`git show <sha> -- switchbot/`). Skip `chore(deps)`, `chore(ci)` and pre-commit bumps.
2. Port each change to the matching place (table below). Skip Python-only plumbing (Home Assistant
   glue, bleak specifics) unless it changes behaviour.
3. Add or update tests under `test/` that pin the new behaviour.
4. Run the full check (below).
5. Follow-up PRs, each in its own repo:
   - **homebridge-switchbot**: whatever the plugin needs to use the change (new or renamed device
     types, new characteristics). Its `node-switchbot` dependency is bumped only after this package
     is published.
   - **SwitchBotAPI-BLE**: protocol docs that are now wrong or missing. Docs only.

| pySwitchbot | node-switchbot |
| --- | --- |
| `switchbot/adv_parser.py` `SUPPORTED_TYPES` (advert byte -> model) | `src/settings.ts` `DEVICE_MODEL_MAP` |
| `switchbot/const/__init__.py` `SwitchbotModel` | `src/types/ble.ts` `SwitchBotBLEModel` / `SwitchBotBLEModelName` |
| `switchbot/devices/device.py` `API_MODEL_TO_ENUM` (cloud model codes) | `src/settings.ts` `DEVICE_CLASS_MAP`, resolved by `resolveDeviceClassName` |
| `switchbot/adv_parsers/*.py` (passive status) | `src/ble.ts` `BLEScanner.parseServiceData` |
| `switchbot/devices/*.py` (commands, active status) | `src/devices/wo-*.ts` |

`DEVICE_MODEL_MAP` mirrors pySwitchbot's single-byte `SUPPORTED_TYPES` codes. A few extra codes
(Hub 2 `0x01`, Hub 3 `0x02`, `0x09`, `0x0E`, `0x10`, `0x11`, `k`, `p`) come from earlier
node-switchbot releases and have no pySwitchbot equivalent. `SwitchBotBLEModel` in
`src/types/ble.ts` holds each product's primary pySwitchbot code; changing a value is a breaking
change.

Encrypted devices (relay switches, locks, air purifiers...) use pySwitchbot's
`SwitchbotEncryptedDevice` protocol, implemented by `BLEConnection.sendEncryptedCommand`: set the
account's key id and key with `device.setKey({ keyId, encryptionKey })`. Command replies arrive as
notifications on the notify characteristic, as in pySwitchbot.

OpenAPI command names and parameters must match the device pages in
[SwitchBotAPI](https://github.com/OpenWonderLabs/SwitchBotAPI/tree/latest/devices); add a test in
`test/devices/openapi-commands.test.ts` for each one.

## Commands

Node `^22 || ^24`. Run in this order; every step must pass before committing:

```bash
npm ci
npm run build   # clean dist/, tsc -p tsconfig.build.json
npm test        # vitest run
npm run lint    # eslint src + test, then tsc --noEmit
```

- `npm run lint:fix` fixes most style issues, including import order.
- `npm run docs` regenerates the TypeDoc site in `docs/` (tracked); `npm run lint-docs` checks it.
  Never hand-edit `docs/`.
- `npm run ble:scan` runs a live BLE scan (needs Bluetooth hardware).

### BLE prerequisites (only for real-device testing)

- **Linux:** `sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev`; for non-root use,
  `sudo setcap cap_net_raw+eip $(eval readlink -f $(which node))`.
- **macOS:** Xcode, and Bluetooth permission for the terminal app.
- **Windows:** BLE is not supported; use OpenAPI.

## Project Structure

```
src/
├── index.ts             # Public exports (keep sorted; perfectionist/sort-exports)
├── switchbot.ts         # SwitchBot: the unified entry point; discovery, DEVICE_CLASSES registry
├── ble.ts               # BLEScanner (discovery, parseServiceData) and BLEConnection
├── api.ts               # OpenAPIClient
├── settings.ts          # Constants, DEVICE_MODEL_MAP, DEVICE_CLASS_MAP, resolveDeviceClassName
├── errors.ts
├── devices/
│   ├── base.ts          # SwitchBotDevice, DeviceManager
│   ├── index.ts         # Device class exports
│   └── wo-*.ts          # One file per device class
├── types/               # api.ts, ble.ts (model enums), device.ts
└── utils/               # retry, circuit breaker, fallback, connection tracking, encryption
test/                    # Vitest: apis/, devices/, types/, utils/
```

### Adding a device class

1. Create `src/devices/wo-<model>.ts` extending `SwitchBotDevice` (or the closest existing class).
2. Export it from `src/devices/index.ts` and `src/index.ts`, and register it in `DEVICE_CLASSES` in
   `src/switchbot.ts`.
3. Map its BLE byte(s) in `DEVICE_MODEL_MAP` and its names/codes in `DEVICE_CLASS_MAP`.
4. Add tests under `test/devices/`.

## Conventions

- ESM only (`"type": "module"`); relative imports end in `.js`.
- ESLint is `@antfu/eslint-config` with `perfectionist` import/export sorting. Import Node built-ins
  from `node:` (`import { Buffer } from 'node:buffer'`; using the global `Buffer` fails lint).
- Runtime dependencies are only `@stoprocent/noble` (BLE) and `undici` (HTTP). Ask before adding one.
- Changing or re-mapping a model identity breaks consumers that switch on `modelName`. Keep old enum
  members as `@deprecated` aliases where possible, and say so in the PR.

## Commits, Branches and Releases

- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Use `feat!:` with a
  `BREAKING CHANGE:` footer when public identities, enums or behaviour change.
- Default branch is `latest`. PRs are squash-merged, so the PR title becomes the commit message.
- `.github/workflows/ci.yml` runs build, test and lint on Node 22 and 24 for every PR to `latest`
  or `beta-*`. Run the full check locally first anyway.
- `.github/workflows/release.yml`:
  - push to `beta-*`: build, test, lint, then publish a beta to npm;
  - push to `latest`: bump version, update the changelog and publish a stable release.
- Changes with no effect on the published package (docs, CI, contributor tooling) should not cut a
  release: end the PR title with `[skip ci]` so the merge to `latest` skips `release.yml`. Do not
  put `[skip ci]` in branch commit messages; that also skips the PR's own CI.
- If a `beta-*` branch newer than the current version exists, target it; otherwise target `latest`.
- PR description: what changed, why (link the pySwitchbot release/PR being ported), and any breaking
  changes with migration notes for homebridge-switchbot.
