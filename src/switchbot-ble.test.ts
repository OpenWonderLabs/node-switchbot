import { describe, expect, it } from 'vitest'

import { LogLevel, SwitchBotBLE } from './switchbot-ble'

describe('switchBotBLE', () => {
  describe('constructor', () => {
    it('should create an instance without parameters', () => {
      const switchbot = new SwitchBotBLE()
      expect(switchbot).toBeInstanceOf(SwitchBotBLE)
      expect(switchbot.ready).toBeInstanceOf(Promise)
    })

    it('should create an instance with parameters', () => {
      const params = { duration: 5000 }
      const switchbot = new SwitchBotBLE(params)
      expect(switchbot).toBeInstanceOf(SwitchBotBLE)
      expect(switchbot.ready).toBeInstanceOf(Promise)
    })
  })

  it('should emit log events asynchronously', async () => {
    const sw = new SwitchBotBLE()
    // Listen for a single 'log' event
    const eventPromise = new Promise<{ level: string, message: string }>((resolve) => {
      sw.once('log', (event) => {
        resolve(event)
      })
    })
    sw.log(LogLevel.INFO, 'test message')
    const event = (await eventPromise) as { level: string, message: string }
    expect(event.level).toBe('info')
    expect(event.message).toBe('test message')
    expect(event.message).toBe('test message')
  })
})
