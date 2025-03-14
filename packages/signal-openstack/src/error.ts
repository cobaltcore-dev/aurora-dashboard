export class SignalOpenstackError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SignalOpenstackError"
  }
}

export class SignalOpenstackApiError extends Error {
  statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = "SignalOpenstackApiError"
    this.statusCode = statusCode
  }
}
