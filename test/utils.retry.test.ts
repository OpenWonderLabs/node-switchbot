import { describe, expect, it, vi } from 'vitest'
import { RetryExecutor } from '../src/utils/retry.js'

const RETRY_FAILED_REGEX = /Retry failed after 2 attempts/
const BLEAK_ERROR_REGEX = /BleakError/
const CONNECTION_RESET_REGEX = /Connection reset by peer/

// Helper to throw error with custom message
function errorThrower(msg: string, name = 'Error') {
  const err = new Error(msg)
  err.name = name
  throw err
}

describe('retryExecutor (enhanced)', () => {
  it('retries on DBus error with 250ms backoff', async () => {
    const executor = new RetryExecutor({ maxAttempts: 2, initialDelayMs: 10, maxDelayMs: 20 })
    const fn = vi.fn()
      .mockImplementationOnce(() => errorThrower('org.freedesktop.DBus.Error.Failed', 'DBusError'))
      .mockResolvedValue('ok')
    const start = Date.now()
    const result = await executor.execute(fn, 'DBus test')
    const elapsed = Date.now() - start
    expect(result.success).toBe(true)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(elapsed).toBeGreaterThanOrEqual(250) // DBus backoff
  })

  it('retries on BLEAK_RETRY_EXCEPTIONS error', async () => {
    const executor = new RetryExecutor({ maxAttempts: 2, initialDelayMs: 10, maxDelayMs: 20 })
    const fn = vi.fn()
      .mockImplementationOnce(() => errorThrower('Device with address not found', 'BleakError'))
      .mockResolvedValue('ok')
    const result = await executor.execute(fn, 'BLEAK test')
    expect(result.success).toBe(true)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('returns enhanced error context on failure', async () => {
    const executor = new RetryExecutor({ maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 2 })
    const fn = vi.fn().mockImplementation(() => errorThrower('Connection reset by peer', 'BleakError'))
    const result = await executor.execute(fn, 'Fail test')
    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toMatch(RETRY_FAILED_REGEX)
    expect(result.error?.message).toMatch(BLEAK_ERROR_REGEX)
    expect(result.error?.message).toMatch(CONNECTION_RESET_REGEX)
    expect(result.attemptsCount).toBe(2)
  })
})
