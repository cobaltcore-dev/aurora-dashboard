import { ListErrorHandler } from "./errorHandling"

/**
 * Handles specific error cases for Network operations with custom messages
 */
export const NetworkErrorHandlers = {
  /**
   * Handles errors specific to Network list operations.
   *
   * Uses the shared WORK_IN_PROGRESS `ListErrorHandler` prototype
   * (currently list-only and shared across Port, Network, and Floating IP).
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: ListErrorHandler("Network"),
}
