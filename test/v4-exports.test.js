import { describe, expect, it } from 'vitest'

import * as index from '../src/index.js'

describe('v4 exports', () => {
  it('exports v4 hybrid entry points', () => {
    expect(index.SwitchBot).toBeDefined()
    expect(index.OpenAPIClient).toBeDefined()
    expect(index.BLEScanner).toBeDefined()
    expect(index.BLEConnection).toBeDefined()
    expect(index.SwitchBotDevice).toBeDefined()
    expect(index.DeviceManager).toBeDefined()
  })
  it('does not expose legacy v3 class names', () => {
    expect(index.SwitchBotBLE).toBeUndefined()
    expect(index.SwitchBotOpenAPI).toBeUndefined()
    expect(index.SwitchbotDevice).toBeUndefined()
  })
  it('constructs in BLE-only mode without API credentials', () => {
    const instance = new index.SwitchBot({
      enableBLE: true,
      token: '',
      secret: '',
    })
    expect(instance).toBeDefined()
    expect(instance.isAPIAvailable()).toBe(false)
    expect(instance.getAPIClient()).toBeUndefined()
  })
})
// # sourceMappingURL=v4-exports.test.js.map
