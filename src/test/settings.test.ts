import {
  CHAR_UUID_DEVICE,
  CHAR_UUID_NOTIFY,
  CHAR_UUID_WRITE,
  COMMAND_TIMEOUT_MSEC,
  deleteWebhook,
  Devices,
  queryWebhook,
  READ_TIMEOUT_MSEC,
  SERV_UUID_PRIMARY,
  setupWebhook,
  updateWebhook,
  WoSmartLockCommands,
  WoSmartLockProCommands,
  WRITE_TIMEOUT_MSEC,
} from '../settings.js'

describe('switchBot API Settings', () => {
  it('should have correct Devices URL', () => {
    expect(Devices).toBe('https://api.switch-bot.com/v1.1/devices')
  })

  it('should have correct setupWebhook URL', () => {
    expect(setupWebhook).toBe('https://api.switch-bot.com/v1.1/webhook/setupWebhook')
  })

  it('should have correct queryWebhook URL', () => {
    expect(queryWebhook).toBe('https://api.switch-bot.com/v1.1/webhook/queryWebhook')
  })

  it('should have correct updateWebhook URL', () => {
    expect(updateWebhook).toBe('https://api.switch-bot.com/v1.1/webhook/updateWebhook')
  })

  it('should have correct deleteWebhook URL', () => {
    expect(deleteWebhook).toBe('https://api.switch-bot.com/v1.1/webhook/deleteWebhook')
  })

  it('should have correct BLE API constants', () => {
    expect(SERV_UUID_PRIMARY).toBe('cba20d00224d11e69fb80002a5d5c51b')
    expect(CHAR_UUID_WRITE).toBe('cba20002224d11e69fb80002a5d5c51b')
    expect(CHAR_UUID_NOTIFY).toBe('cba20003224d11e69fb80002a5d5c51b')
    expect(CHAR_UUID_DEVICE).toBe('2a00')
  })

  it('should have correct timeout constants', () => {
    expect(READ_TIMEOUT_MSEC).toBe(3000)
    expect(WRITE_TIMEOUT_MSEC).toBe(3000)
    expect(COMMAND_TIMEOUT_MSEC).toBe(3000)
  })

  it('should have correct WoSmartLockProCommands', () => {
    expect(WoSmartLockProCommands.GET_CKIV).toBe('570f2103')
    expect(WoSmartLockProCommands.LOCK_INFO).toBe('570f4f8102')
    expect(WoSmartLockProCommands.UNLOCK).toBe('570f4e0101000080')
    expect(WoSmartLockProCommands.UNLOCK_NO_UNLATCH).toBe('570f4e01010000a0')
    expect(WoSmartLockProCommands.LOCK).toBe('570f4e0101000000')
    expect(WoSmartLockProCommands.ENABLE_NOTIFICATIONS).toBe('570e01001e00008101')
    expect(WoSmartLockProCommands.DISABLE_NOTIFICATIONS).toBe('570e00')
  })

  it('should have correct WoSmartLockCommands', () => {
    expect(WoSmartLockCommands.GET_CKIV).toBe('570f2103')
    expect(WoSmartLockCommands.LOCK_INFO).toBe('570f4f8101')
    expect(WoSmartLockCommands.UNLOCK).toBe('570f4e01011080')
    expect(WoSmartLockCommands.UNLOCK_NO_UNLATCH).toBe('570f4e010110a0')
    expect(WoSmartLockCommands.LOCK).toBe('570f4e01011000')
    expect(WoSmartLockCommands.ENABLE_NOTIFICATIONS).toBe('570e01001e00008101')
    expect(WoSmartLockCommands.DISABLE_NOTIFICATIONS).toBe('570e00')
  })
})
