import { TRPCError } from "@trpc/server"

/**
 * Handles specific error cases for floating IP operations with custom messages
 */
export const FloatingIpErrorHandlers = {
  /**
   * Handles errors specific to floating IP list operations
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: "UNAUTHORIZED",
          message: `Unauthorized access`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch list: ${response.statusText || "Unknown error"}`,
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
          code: "UNAUTHORIZED",
          message: `Unauthorized access: ${floatingIpId}`,
        })
      case 403:
        return new TRPCError({
          code: "FORBIDDEN",
          message: `Access forbidden to floating IP: ${floatingIpId}`,
        })
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Floating IP not found: ${floatingIpId}`,
        })

      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch floating IP: ${response.statusText || "Unknown error"}`,
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
          code: "UNAUTHORIZED",
          message: `Unauthorized access: ${floatingIpId}`,
        })
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Floating IP not found: ${floatingIpId}`,
        })
      case 412:
        return new TRPCError({
          code: "CONFLICT",
          message: `Precondition failed - revision number mismatch: ${floatingIpId}`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete floating IP: ${response.statusText || "Unknown error"}`,
        })
    }
  },
}
