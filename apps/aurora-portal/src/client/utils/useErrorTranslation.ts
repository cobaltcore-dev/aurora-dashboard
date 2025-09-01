import { useLingui } from "@lingui/react/macro"

export const useErrorTranslation = () => {
  const { t } = useLingui()

  const translateError = (errorCode: string): string => {
    switch (errorCode) {
      //List Flavor
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
      // Create Flavor
      case "CREATE_FLAVOR_INVALID_DATA":
        return t`The flavor data provided is invalid. Please check your input.`
      case "CREATE_FLAVOR_UNAUTHORIZED":
        return t`You are not authorized to create flavors. Please log in again.`
      case "CREATE_FLAVOR_FORBIDDEN":
        return t`You don't have permission to create flavors in this project.`
      case "CREATE_FLAVOR_CONFLICT":
        return t`A flavor with this ID or name already exists. Please use different values.`
      case "CREATE_FLAVOR_SERVER_ERROR":
        return t`Server error occurred while creating the flavor. Please try again later.`
      case "CREATE_FLAVOR_FAILED":
        return t`Failed to create the flavor. Please try again.`

      // Delete Flavor
      case "DELETE_FLAVOR_UNAUTHORIZED":
        return t`You are not authorized to delete flavors. Please log in again.`
      case "DELETE_FLAVOR_FORBIDDEN":
        return t`You don't have permission to delete flavors in this project.`
      case "DELETE_FLAVOR_NOT_FOUND":
        return t`The flavor could not be found. It may have already been deleted.`
      case "DELETE_FLAVOR_SERVER_ERROR":
        return t`Server error occurred while deleting the flavor. Please try again later.`
      case "DELETE_FLAVOR_FAILED":
        return t`Failed to delete the flavor. Please try again.`
      case "DELETE_FLAVOR_INVALID_ID":
        return t`Flavor ID is required and cannot be empty.`

      // Service Connection Errors
      case "COMPUTE_SERVICE_UNAVAILABLE":
        return t`The compute service is currently unavailable for this project. Please try again later.`
      case "COMPUTE_SERVICE_CONNECTION_FAILED":
        return t`Unable to connect to the compute service. Please check your connection and try again.`

      default:
        return t`An unexpected error occurred. Please try again.`
    }
  }

  const isRetryableError = (errorCode: string): boolean => {
    return ["FLAVORS_SERVER_ERROR", "FLAVORS_FETCH_FAILED"].includes(errorCode)
  }

  return { translateError, isRetryableError }
}
