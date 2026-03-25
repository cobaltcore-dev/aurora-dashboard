import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"
import { ErrorHandler } from "./errorHandling"

export const FLOATING_IPS_BASE_URL = "v2.0/floatingips"

/**
 * Handles specific error cases for floating IP operations with custom messages
 */
export const FloatingIpErrorHandlers = {
  /**
   * Handles errors specific to floating IP list operations.
   * Uses the shared WORK_IN_PROGRESS `ErrorHandler` prototype
   *
   * @param resourceName - The name of the resource being accessed
   * @returns TRPCError with appropriate code and message
   */
  list: ErrorHandler("Floating IP"),

  /**
   * Handles errors specific to floating IP creation
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  create: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 400:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[400],
          message: "Invalid request data for creating floating IP",
        })
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access to create floating IP",
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[404],
          message: "Specified resource not found for creating floating IP",
        })
      case 409:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[409],
          message: "Conflict - resource already exists or is in use for creating floating IP",
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to create floating IP: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to floating IP retrieval by ID.
   * Uses the shared WORK_IN_PROGRESS `ErrorHandler` prototype
   *
   * @param resourceName - The name of the resource being accessed
   * @returns TRPCError with appropriate code and message
   */
  get: ErrorHandler("Floating IP"),

  /**
   * Handles errors specific to floating IP update
   * Uses the shared WORK_IN_PROGRESS `ErrorHandler` prototype
   *
   * @param resourceName - The name of the resource being accessed
   * @returns TRPCError with appropriate code and message
   */
  update: ErrorHandler("Floating IP"),

  /**
   * Handles errors specific to floating IP deletion
   * Uses the shared WORK_IN_PROGRESS `ErrorHandler` prototype
   *
   * @param resourceName - The name of the resource being accessed
   * @returns TRPCError with appropriate code and message
   */
  delete: ErrorHandler("Floating IP"),
}
