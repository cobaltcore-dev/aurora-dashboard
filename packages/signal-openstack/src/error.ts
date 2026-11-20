export class SignalOpenstackError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SignalOpenstackError"
  }
}

export class SignalOpenstackApiError extends Error {
  statusCode?: number
  /**
   * Parsed JSON error body, for structured inspection by callers.
   * Do not forward it to clients.
   */
  body?: unknown

  constructor(message: string, statusCode?: number, body?: unknown) {
    super(message)
    this.name = "SignalOpenstackApiError"
    this.statusCode = statusCode
    this.body = body
  }
}
