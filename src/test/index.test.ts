import { describe, expect, it } from 'vitest'

import * as index from '../index.js'

describe('index module exports', () => {
  it('should export switchbot', () => {
    expect(index).toHaveProperty('switchbot')
  })

  it('should export switchbot-openapi', () => {
    expect(index).toHaveProperty('switchbot-openapi')
  })

  it('should export bledevicestatus', () => {
    expect(index).toHaveProperty('bledevicestatus')
  })

  it('should export devicelist', () => {
    expect(index).toHaveProperty('devicelist')
  })

  it('should export devicepush', () => {
    expect(index).toHaveProperty('devicepush')
  })

  it('should export deviceresponse', () => {
    expect(index).toHaveProperty('deviceresponse')
  })

  it('should export devicestatus', () => {
    expect(index).toHaveProperty('devicestatus')
  })

  it('should export devicewebhookstatus', () => {
    expect(index).toHaveProperty('devicewebhookstatus')
  })

  it('should export irdevicelist', () => {
    expect(index).toHaveProperty('irdevicelist')
  })

  it('should export types', () => {
    expect(index).toHaveProperty('types')
  })
})
