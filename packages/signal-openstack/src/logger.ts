/**
 * Logger utility for signal-openstack with colorized output and sensitive data redaction
 */

// Configuration
export const loggerConfig = {
  /** Maximum characters to display for body previews (default: 500) */
  maxBodyPreviewLength: 500,
}

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
}

// Sensitive field patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth_token/i,
  /authorization/i,
  /x-auth-token/i,
  /x-subject-token/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /bearer/i,
]

/**
 * Check if a key name matches any sensitive pattern
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))
}

/**
 * Redact sensitive data in objects, arrays, and nested structures
 */
export function redactSensitiveData<T>(obj: T): T {
  // Handle primitives
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== "object") return obj

  // Handle special types
  if (obj instanceof Date) return obj
  if (obj instanceof RegExp) return obj
  if (obj instanceof ReadableStream) return "[ReadableStream]" as T
  if (obj instanceof FormData) return "[FormData]" as T
  if (obj instanceof Blob) return "[Blob]" as T
  if (obj instanceof ArrayBuffer) return "[ArrayBuffer]" as T
  if (obj instanceof AbortSignal) return "[AbortSignal]" as T

  try {
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => redactSensitiveData(item)) as T
    }

    // Handle objects
    const redacted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        // Redact sensitive values but show type and length hint
        if (typeof value === "string") {
          redacted[key] = value.length > 0 ? `[REDACTED:${value.length} chars]` : "[REDACTED]"
        } else {
          redacted[key] = "[REDACTED]"
        }
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = redactSensitiveData(value)
      } else {
        redacted[key] = value
      }
    }
    return redacted as T
  } catch {
    // Fallback for circular references or serialization issues
    return "[REDACTION_ERROR]" as T
  }
}

/**
 * Format a timestamp for logging
 */
function formatTimestamp(): string {
  const now = new Date()
  return now.toISOString().substring(11, 23) // HH:MM:SS.mmm
}

/**
 * Log levels with associated colors and prefixes
 */
const LOG_LEVELS = {
  debug: { color: colors.gray, prefix: "🔍 DEBUG" },
  info: { color: colors.cyan, prefix: "ℹ️  INFO" },
  warn: { color: colors.yellow, prefix: "⚠️  WARN" },
  error: { color: colors.red, prefix: "❌ ERROR" },
  success: { color: colors.green, prefix: "✅ SUCCESS" },
} as const

type LogLevel = keyof typeof LOG_LEVELS

/**
 * Internal logging function with colorization and formatting
 */
function log(level: LogLevel, message: string, data?: unknown): void {
  const { color, prefix } = LOG_LEVELS[level]
  const timestamp = formatTimestamp()
  const label = `${colors.bright}[signal-openstack]${colors.reset}`

  // Build the log line
  const logLine = `${colors.gray}${timestamp}${colors.reset} ${color}${prefix}${colors.reset} ${label} ${message}`

  // Log the message
  if (level === "error") {
    console.error(logLine)
  } else if (level === "warn") {
    console.warn(logLine)
  } else {
    console.log(logLine)
  }

  // If there's data to log, redact and format it
  if (data !== undefined) {
    const redacted = redactSensitiveData(data)
    try {
      const formatted = JSON.stringify(redacted, null, 2)
      // Indent the data block for better readability
      const indented = formatted
        .split("\n")
        .map((line) => `  ${colors.dim}${line}${colors.reset}`)
        .join("\n")
      console.log(indented)
    } catch {
      console.log(`  ${colors.dim}[Unable to serialize data]${colors.reset}`)
    }
  }
}

/**
 * Logger interface for signal-openstack
 */
export const logger = {
  /**
   * Debug level logging - for detailed diagnostic information
   */
  debug(message: string, data?: unknown): void {
    log("debug", message, data)
  },

  /**
   * Info level logging - for general informational messages
   */
  info(message: string, data?: unknown): void {
    log("info", message, data)
  },

  /**
   * Warning level logging - for potentially problematic situations
   */
  warn(message: string, data?: unknown): void {
    log("warn", message, data)
  },

  /**
   * Error level logging - for error events
   */
  error(message: string, data?: unknown): void {
    log("error", message, data)
  },

  /**
   * Success level logging - for successful operations
   */
  success(message: string, data?: unknown): void {
    log("success", message, data)
  },
}
