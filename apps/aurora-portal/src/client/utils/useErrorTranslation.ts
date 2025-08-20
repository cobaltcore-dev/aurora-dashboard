import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react"

export const useErrorTranslation = () => {
  const { _ } = useLingui()

  const translateError = (errorCode: string): string => {
    switch (errorCode) {
      case "FLAVORS_UNAUTHORIZED":
        return _(msg`Your session has expired. Please log in again.`)
      case "FLAVORS_FORBIDDEN":
        return _(msg`You don't have permission to access flavors for this project.`)
      case "FLAVORS_NOT_FOUND":
        return _(msg`Flavor service is not available for this project.`)
      case "FLAVORS_SERVER_ERROR":
        return _(msg`Server is experiencing issues. Please try again later.`)
      case "FLAVORS_FETCH_FAILED":
        return _(msg`Failed to fetch flavors from server.`)
      case "FLAVORS_PARSE_ERROR":
        return _(msg`Server returned unexpected data format.`)
      default:
        return _(msg`An unexpected error occurred. Please try again.`)
    }
  }

  const isRetryableError = (errorCode: string): boolean => {
    return ["FLAVORS_SERVER_ERROR", "FLAVORS_FETCH_FAILED"].includes(errorCode)
  }

  return { translateError, isRetryableError }
}
