import { describe, expect, it } from 'vitest'

import * as publicAPI from '../../src/index.js'

describe('switchBot BLE-only mode', () => {
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
