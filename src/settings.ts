/**
 * Switchbot BLE API registration settings.
 *
 * © 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 */

/**
 * This is the main url used to access SwitchBot API
 */
export const Devices = 'https://api.switch-bot.com/v1.1/devices'

/**
 * This is the updateWebhook url used to access SwitchBot API
 */
export const setupWebhook = 'https://api.switch-bot.com/v1.1/webhook/setupWebhook'

/**
 * This is the updateWebhook url used to access SwitchBot API
 */
export const queryWebhook = 'https://api.switch-bot.com/v1.1/webhook/queryWebhook'

/**
 * This is the updateWebhook url used to access SwitchBot API
 */
export const updateWebhook = 'https://api.switch-bot.com/v1.1/webhook/updateWebhook'

/**
 * This is the deleteWebhook url used to access SwitchBot API
 */
export const deleteWebhook = 'https://api.switch-bot.com/v1.1/webhook/deleteWebhook'

/**
 * constants used to access SwitchBot BLE API
 */
export const SERV_UUID_PRIMARY = 'cba20d00224d11e69fb80002a5d5c51b'
export const CHAR_UUID_WRITE = 'cba20002224d11e69fb80002a5d5c51b'
export const CHAR_UUID_NOTIFY = 'cba20003224d11e69fb80002a5d5c51b'
export const CHAR_UUID_DEVICE = '2a00'

export const READ_TIMEOUT_MSEC = 3000
export const WRITE_TIMEOUT_MSEC = 3000
export const COMMAND_TIMEOUT_MSEC = 3000

export enum WoSmartLockProCommands {
  GET_CKIV = '570f2103',
  LOCK_INFO = '570f4f8102',
  UNLOCK = '570f4e0101000080',
  UNLOCK_NO_UNLATCH = '570f4e01010000a0',
  LOCK = '570f4e0101000000',
  ENABLE_NOTIFICATIONS = '570e01001e00008101',
  DISABLE_NOTIFICATIONS = '570e00',
}

export enum WoSmartLockCommands {
  GET_CKIV = '570f2103',
  LOCK_INFO = '570f4f8101',
  UNLOCK = '570f4e01011080',
  UNLOCK_NO_UNLATCH = '570f4e010110a0',
  LOCK = '570f4e01011000',
  ENABLE_NOTIFICATIONS = '570e01001e00008101',
  DISABLE_NOTIFICATIONS = '570e00',
}
