import { EventEmitter } from 'node:events'

export class Logger extends EventEmitter {
  /**
   * Emits a log event with the specified log level and message.
   *
   * @param level - The severity level of the log (e.g., 'info', 'warn', 'error').
   * @param message - The log message to be emitted.
   */
  public async emitLog(level: string, message: string): Promise<void> {
    this.emit('log', { level, message })
  }
}

const logger = new Logger()

export async function emitLog(level: string, message: string): Promise<void> {
  await logger.emitLog(level, message)
}

export { logger }
