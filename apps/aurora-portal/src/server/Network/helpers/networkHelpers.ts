import { ErrorHandler } from "./errorHandling"

/**
 * Handles specific error cases for Network operations with custom messages
 */
export const NetworkErrorHandlers = {
  /**
   * Handles errors specific to Network list operations.
   *
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: ErrorHandler("Network"),
}
