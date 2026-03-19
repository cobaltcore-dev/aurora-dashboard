import { ErrorHandler } from "./errorHandling"

/**
 * Handles specific error cases for port operations with custom messages
 */
export const PortErrorHandlers = {
  /**
   * Handles errors specific to port list operations.
   *
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: ErrorHandler("Port"),
}
