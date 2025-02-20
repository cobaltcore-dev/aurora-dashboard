export class AuroraSignalError extends Error {
  constructor(message: string) {
    super("AuroraSignalError: " + message)
    this.name = "AuroraSignalError"
  }
}

export class AuroraSignalApiError extends Error {
  statusCode?: number

  constructor(message: string, statusCode?: number) {
    super("AuroraSignalApiError: " + message)
    this.name = "AuroraSignalApiError"
    this.statusCode = statusCode
  }
}
