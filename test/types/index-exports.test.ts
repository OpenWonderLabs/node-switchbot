import { describe, expect, it } from 'vitest'

import * as publicAPI from '../../src/index.js'

describe('index.js public API surface', () => {
  it('exports main entry points', () => {
    expect(publicAPI.SwitchBot).toBeDefined()
    expect(publicAPI.OpenAPIClient).toBeDefined()
    expect(publicAPI.BLEScanner).toBeDefined()
    expect(publicAPI.BLEConnection).toBeDefined()
    expect(publicAPI.SwitchBotDevice).toBeDefined()
    expect(publicAPI.DeviceManager).toBeDefined()
  })

  it('does not export legacy v3 class names', () => {
    expect((publicAPI as any).SwitchBotBLE).toBeUndefined()
    expect((publicAPI as any).SwitchBotOpenAPI).toBeUndefined()
    expect((publicAPI as any).SwitchbotDevice).toBeUndefined()
  })

  it('can construct SwitchBot in BLE-only mode', () => {
    const instance = new publicAPI.SwitchBot({
      enableBLE: true,
      token: '',
      secret: '',
    })
    expect(instance).toBeDefined()
    expect(instance.isAPIAvailable()).toBe(false)
    expect(instance.getAPIClient()).toBeUndefined()
  })
})
