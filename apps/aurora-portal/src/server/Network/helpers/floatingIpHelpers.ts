import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_CODE_TO_NAME } from "./index"
import { ListErrorHandler } from "./errorHandling"

export const FLOATING_IPS_BASE_URL = "v2.0/floatingips"

/**
 * Handles specific error cases for floating IP operations with custom messages
 */
export const FloatingIpErrorHandlers = {
  /**
   * Handles errors specific to floating IP list operations.
   *
   * Uses the shared WORK_IN_PROGRESS `ListErrorHandler` prototype
   * (currently list-only and shared across Port, Network, and Floating IP).
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: ListErrorHandler("Floating IP"),

  /**
   * Handles errors specific to floating IP creation
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  create: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 400:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[400],
          message: "Invalid request data for creating floating IP",
        })
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[401],
          message: "Unauthorized access to create floating IP",
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[404],
          message: "Specified resource not found for creating floating IP",
        })
      case 409:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[409],
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
   * Handles errors specific to floating IP retrieval by ID
   * @param response - The HTTP response from OpenStack
   * @param floatingIpId - The ID of the floating IP being retrieved
   * @returns TRPCError with appropriate code and message
   */
  get: (response: { status?: number; statusText?: string }, floatingIpId: string) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[401],
          message: `Unauthorized access: ${floatingIpId}`,
        })
      case 403:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[403],
          message: `Access forbidden to floating IP: ${floatingIpId}`,
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[404],
          message: `Floating IP not found: ${floatingIpId}`,
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to fetch floating IP: ${response.statusText || "Unknown error"}`,
        })
    }
  },
  /**
   * Handles errors specific to floating IP update
   * @param response - The HTTP response from OpenStack
   * @param floatingIpId - The ID of the floating IP being updated
   * @returns TRPCError with appropriate code and message
   */
  update: (response: { status?: number; statusText?: string }, floatingIpId: string) => {
    switch (response.status) {
      case 400:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[400],
          message: `Invalid request data for floating IP: ${floatingIpId}`,
        })
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[401],
          message: `Unauthorized access: ${floatingIpId}`,
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[404],
          message: `Floating IP not found: ${floatingIpId}`,
        })
      case 409:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[409],
          message: `Conflict - floating IP is in use: ${floatingIpId}`,
        })
      case 412:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[412],
          message: `Precondition failed - revision number mismatch: ${floatingIpId}`,
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to update floating IP: ${response.statusText || "Unknown error"}`,
        })
    }
  },
  /**
   * Handles errors specific to floating IP deletion
   * @param response - The HTTP response from OpenStack
   * @param floatingIpId - The ID of the floating IP being deleted
   * @returns TRPCError with appropriate code and message
   */
  delete: (response: { status?: number; statusText?: string }, floatingIpId: string) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[401],
          message: `Unauthorized access: ${floatingIpId}`,
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[404],
          message: `Floating IP not found: ${floatingIpId}`,
        })
      case 412:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[412],
          message: `Precondition failed - revision number mismatch: ${floatingIpId}`,
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to delete floating IP: ${response.statusText || "Unknown error"}`,
        })
    }
  },
}
