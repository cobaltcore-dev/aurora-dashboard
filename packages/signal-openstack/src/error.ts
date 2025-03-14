export class SignalOpenstackError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SignalOpenstackError"
  }
}

type ErrorObject = Record<string, object> | undefined
type SignalOpenstackApiErrorOptions = {
  message: string
  statusCode?: number
  errorObject?: ErrorObject
}
export class SignalOpenstackApiError extends Error {
  public statusCode?: number
  public errorObject?: ErrorObject

  constructor(params: SignalOpenstackApiErrorOptions) {
    super(params.message)
    this.name = "SignalOpenstackApiError"
    this.statusCode = params.statusCode
    const parsedError = this.parseErrorObject(params.errorObject)
    if (parsedError) {
      this.message = parsedError
    }
  }

  private parseErrorObject(object: ErrorObject): string | null {
    if (!object) return null
    const candidates = ["message", "description", "type", "faultstring"]

    function recursiveSearch(currentObj: ErrorObject): string | null {
      if (typeof currentObj === "object" && currentObj !== null && !Array.isArray(currentObj)) {
        for (const key of Object.keys(currentObj)) {
          if (candidates.includes(key)) {
            const value = currentObj[key] // No need to redeclare 'value' here
            if (typeof value === "object") {
              return JSON.stringify(value) // Return as string if the value is still an object
            }
            return value // Return the found candidate's value directly
          } else {
            // Continue searching in nested objects
            const foundValue = recursiveSearch(currentObj[key] as ErrorObject)
            if (foundValue) {
              return foundValue // Return the value if found in recursion
            }
          }
        }
      }

      return null // Return null if no candidate keys are found
    }

    return recursiveSearch(object) // Start the recursive search
  }
}
