/* eslint-disable import/order */
/* eslint-disable */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

// Mock undici.request in ESM via module mock
vi.mock('undici', async () => {
  const actual = await vi.importActual<typeof import('undici')>('undici')
  return { ...actual, request: vi.fn() }
})
import * as undici from 'undici'

// Alias the mocked request function
const requestMock = undici.request as Mock

import { SwitchBotOpenAPI } from './switchbot-openapi'

describe('switchBotOpenAPI', () => {
  beforeEach(() => {
    // Reset module-level undici.request mock
    requestMock.mockReset()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('controlDevice should send correct request and parse response', async () => {
    const fakeBody = { json: vi.fn().mockResolvedValue({ commandId: 'abc123' }) }
    const statusCode = 200
    requestMock.mockResolvedValue({ body: fakeBody, statusCode })

    const api = new SwitchBotOpenAPI('my-token', 'my-secret')
    const result = await api.controlDevice('dev123', 'turnOn', 'default')

    expect(requestMock).toHaveBeenCalledWith(
      expect.stringContaining('/dev123/commands'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify({ command: 'turnOn', parameter: 'default', commandType: 'command' }),
      }),
    )
    expect(result.response).toEqual({ commandId: 'abc123' })
    expect(result.statusCode).toBe(statusCode)
  })
})
