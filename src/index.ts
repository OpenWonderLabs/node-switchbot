/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * index.ts: Switchbot BLE API registration.
 */
// Primary module exports
export * from './device.js'
export { ParameterChecker, parameterChecker } from './parameter-checker.js'
export { updateBaseURL, urls } from './settings.js'
export * from './switchbot-ble.js'
export * from './switchbot-openapi.js'

// Type definitions
export * from './types/ble.js'
export * from './types/openapi.js'
