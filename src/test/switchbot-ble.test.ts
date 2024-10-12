import * as Noble from '@stoprocent/noble'
import { beforeEach, describe, expect, it } from 'vitest'

import { SwitchBotBLE } from '../switchbot-ble.js'

describe('switchBotBLE', () => {
  let switchBot: SwitchBotBLE

  beforeEach(() => {
    switchBot = new SwitchBotBLE({ noble: Noble })
  })

  it('should initialize noble object', async () => {
    await switchBot.ready
    expect(switchBot.noble).toBeTruthy()
  })

  it('should validate parameters', async () => {
    const params = { duration: 5000, model: 'Bot', id: '123456789012', quick: true }
    await switchBot.validate(params, {
      duration: { required: false, type: 'integer', min: 1, max: 60000 },
      model: { required: false, type: 'string', enum: ['Bot'] },
      id: { required: false, type: 'string', min: 12, max: 17 },
      quick: { required: false, type: 'boolean' },
    })
  })

  it('should start and stop scanning', async () => {
    let discoverListenerCount = 0
    const discoverListener = () => {
      discoverListenerCount++
    }
    switchBot.noble.on('discover', discoverListener)
    await switchBot.startScan()
    expect(discoverListenerCount).toBe(1)
    await switchBot.stopScan()
    switchBot.noble.removeListener('discover', discoverListener)
    expect(discoverListenerCount).toBe(0)
  })

  it('should wait for specified time', async () => {
    const start = Date.now()
    await switchBot.wait(1000)
    const end = Date.now()
    expect(end - start).toBeGreaterThanOrEqual(1000)
  })

  it('should discover devices', async () => {
    const devices = await switchBot.discover({ duration: 1000, quick: true })
    expect(devices).toBeInstanceOf(Array)
  })
})
