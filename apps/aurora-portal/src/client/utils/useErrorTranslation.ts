import { useLingui } from "@lingui/react/macro"

export const useErrorTranslation = () => {
  const { t } = useLingui()

  const translateError = (errorCode: string): string => {
    switch (errorCode) {
      // List Flavor
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

      // Create Extra Specs
      case "CREATE_EXTRA_SPECS_UNAUTHORIZED":
        return t`You are not authorized to create extra specs. Please log in again.`
      case "CREATE_EXTRA_SPECS_FORBIDDEN":
        return t`You don't have permission to create extra specs for this flavor.`
      case "CREATE_EXTRA_SPECS_NOT_FOUND":
        return t`The flavor could not be found. It may have been deleted.`
      case "CREATE_EXTRA_SPECS_CONFLICT":
        return t`This extra spec keys already exist. Please use different keys.`
      case "CREATE_EXTRA_SPECS_INVALID_DATA":
        return t`The extra spec data provided is invalid. Please check your input.`
      case "CREATE_EXTRA_SPECS_SERVER_ERROR":
        return t`Server error occurred while creating extra specs. Please try again later.`
      case "CREATE_EXTRA_SPECS_PARSE_ERROR":
        return t`Server returned unexpected data format for extra specs.`
      case "CREATE_EXTRA_SPECS_FAILED":
        return t`Failed to create extra specs. Please try again.`

      // Get Extra Specs
      case "GET_EXTRA_SPECS_UNAUTHORIZED":
        return t`You are not authorized to view extra specs. Please log in again.`
      case "GET_EXTRA_SPECS_FORBIDDEN":
        return t`You don't have permission to view extra specs for this flavor.`
      case "GET_EXTRA_SPECS_NOT_FOUND":
        return t`The flavor could not be found or has no extra specs.`
      case "GET_EXTRA_SPECS_SERVER_ERROR":
        return t`Server error occurred while fetching extra specs. Please try again later.`
      case "GET_EXTRA_SPECS_PARSE_ERROR":
        return t`Server returned unexpected data format for extra specs.`
      case "GET_EXTRA_SPECS_FAILED":
        return t`Failed to load extra specs. Please try again.`

      // Delete Extra Spec
      case "DELETE_EXTRA_SPEC_UNAUTHORIZED":
        return t`You are not authorized to delete extra specs. Please log in again.`
      case "DELETE_EXTRA_SPEC_FORBIDDEN":
        return t`You don't have permission to delete extra specs for this flavor.`
      case "DELETE_EXTRA_SPEC_NOT_FOUND":
        return t`The extra spec could not be found. It may have already been deleted.`
      case "DELETE_EXTRA_SPEC_SERVER_ERROR":
        return t`Server error occurred while deleting the extra spec. Please try again later.`
      case "DELETE_EXTRA_SPEC_INVALID_KEY":
        return t`Extra spec key is required and cannot be empty.`
      case "DELETE_EXTRA_SPEC_FAILED":
        return t`Failed to delete the extra spec. Please try again.`

      // Get Flavor Access
      case "GET_FLAVOR_ACCESS_UNAUTHORIZED":
        return t`You are not authorized to access flavor access information. Please log in again.`
      case "GET_FLAVOR_ACCESS_FORBIDDEN":
        return t`You don't have permission to access flavor access information for this flavor.`
      case "GET_FLAVOR_ACCESS_NOT_FOUND":
        return t`The flavor could not be found. It may have been deleted.`
      case "GET_FLAVOR_ACCESS_SERVER_ERROR":
        return t`Server error occurred while fetching flavor access information. Please try again later.`
      case "GET_FLAVOR_ACCESS_FAILED":
        return t`Failed to fetch flavor access information. Please try again.`

      // Add Tenant Access
      case "ADD_TENANT_ACCESS_FAILED":
        return t`Failed to add tenant access to flavor. Please try again.`
      case "ADD_TENANT_ACCESS_INVALID_DATA":
        return t`The tenant ID provided is invalid. Please check your input.`
      case "ADD_TENANT_ACCESS_UNAUTHORIZED":
        return t`You are not authorized to add tenant access. Please log in again.`
      case "ADD_TENANT_ACCESS_FORBIDDEN":
        return t`You don't have permission to add tenant access to this flavor.`
      case "ADD_TENANT_ACCESS_NOT_FOUND":
        return t`The flavor or tenant could not be found. Please verify they exist.`
      case "ADD_TENANT_ACCESS_CONFLICT":
        return t`This tenant already has access to the flavor.`
      case "ADD_TENANT_ACCESS_SERVER_ERROR":
        return t`Server error occurred while adding tenant access. Please try again later.`

      // Remove Tenant Access
      case "REMOVE_TENANT_ACCESS_FAILED":
        return t`Failed to remove tenant access from flavor. Please try again.`
      case "REMOVE_TENANT_ACCESS_INVALID_DATA":
        return t`The tenant ID provided is invalid. Please check your input.`
      case "REMOVE_TENANT_ACCESS_UNAUTHORIZED":
        return t`You are not authorized to remove tenant access. Please log in again.`
      case "REMOVE_TENANT_ACCESS_FORBIDDEN":
        return t`You don't have permission to remove tenant access from this flavor.`
      case "REMOVE_TENANT_ACCESS_NOT_FOUND":
        return t`The flavor or tenant could not be found. It may have already been removed.`
      case "REMOVE_TENANT_ACCESS_CONFLICT":
        return t`This tenant does not have access to the flavor.`
      case "REMOVE_TENANT_ACCESS_SERVER_ERROR":
        return t`Server error occurred while removing tenant access. Please try again later.`

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
