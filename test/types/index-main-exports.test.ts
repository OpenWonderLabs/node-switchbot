import { describe, expect, it } from 'vitest'
import * as publicAPI from '../../src/index.js'

describe('index.js main entry points', () => {
  it('exports main entry points', () => {
    expect(publicAPI.SwitchBot).toBeDefined()
    expect(publicAPI.OpenAPIClient).toBeDefined()
    expect(publicAPI.BLEScanner).toBeDefined()
    expect(publicAPI.BLEConnection).toBeDefined()
    expect(publicAPI.SwitchBotDevice).toBeDefined()
    expect(publicAPI.DeviceManager).toBeDefined()
  })
})
