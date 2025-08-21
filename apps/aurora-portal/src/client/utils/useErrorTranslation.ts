import { useLingui } from "@lingui/react/macro"

export const useErrorTranslation = () => {
  const { t } = useLingui()

  const translateError = (errorCode: string): string => {
    switch (errorCode) {
      case "FLAVORS_UNAUTHORIZED":
        return t`Your session has expired. Please log in again.`
      case "FLAVORS_FORBIDDEN":
        return t`You don't have permission to access flavors for this project.`
      case "FLAVORS_NOT_FOUND":
        return t`Flavor service is not available for this project.`
      case "FLAVORS_SERVER_ERROR":
        return t`Server is experiencing issues. Please try again later.`
      case "FLAVORS_FETCH_FAILED":
        return t`Failed to fetch flavors from server.`
      case "FLAVORS_PARSE_ERROR":
        return t`Server returned unexpected data format.`
      default:
        return t`An unexpected error occurred. Please try again.`
    }
  }

  const isRetryableError = (errorCode: string): boolean => {
    return ["FLAVORS_SERVER_ERROR", "FLAVORS_FETCH_FAILED"].includes(errorCode)
  }

  return { translateError, isRetryableError }
}
