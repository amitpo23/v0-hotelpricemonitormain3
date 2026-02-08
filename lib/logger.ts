/**
 * Structured Logger
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output in production
 * - Context/metadata support
 * - Request ID tracking
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  requestId?: string
  userId?: string
  hotelId?: string
  action?: string
  duration?: number
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Get minimum log level from environment
const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL]
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    // JSON format for production (easier to parse in log aggregators)
    return JSON.stringify(entry)
  }

  // Human-readable format for development
  const prefix = {
    debug: '\x1b[36m[DEBUG]\x1b[0m',
    info: '\x1b[32m[INFO]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m',
  }[entry.level]

  let output = `${prefix} ${entry.message}`

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`
  }

  if (entry.error) {
    output += `\n  Error: ${entry.error.message}`
    if (entry.error.stack && process.env.NODE_ENV !== 'production') {
      output += `\n  Stack: ${entry.error.stack}`
    }
  }

  return output
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  const formatted = formatLog(entry)

  switch (level) {
    case 'error':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    default:
      console.log(formatted)
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, error?: Error, context?: LogContext) => log('error', message, context, error),

  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) =>
      log('debug', message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      log('info', message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      log('warn', message, { ...baseContext, ...context }),
    error: (message: string, error?: Error, context?: LogContext) =>
      log('error', message, { ...baseContext, ...context }, error),
  }),

  /**
   * Log API request with timing
   */
  request: (method: string, path: string, status: number, durationMs: number, context?: LogContext) => {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    log(level, `${method} ${path} ${status}`, { ...context, duration: durationMs })
  },

  /**
   * Log prediction event
   */
  prediction: (hotelId: string, date: string, price: number, confidence: number, context?: LogContext) => {
    log('info', 'Prediction generated', {
      hotelId,
      date,
      price,
      confidence,
      ...context
    })
  },

  /**
   * Log agent activity
   */
  agent: (agentName: string, action: string, context?: LogContext) => {
    log('info', `Agent: ${agentName}`, { action, ...context })
  },
}

export default logger
