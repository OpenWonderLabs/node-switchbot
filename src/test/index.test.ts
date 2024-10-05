import { describe, expect, it } from 'vitest'

import * as index from '../index.js'

describe('index module exports', () => {
  it('should export switchbot-ble', () => {
    expect(index.SwitchBotBLE).toBeDefined()
  })

  it('should export switchbot-openapi', () => {
    expect(index.SwitchBotOpenAPI).toBeDefined()
  })

  it('should export SwitchbotDevice', () => {
    expect(index.SwitchbotDevice).toBeDefined()
  })
})
