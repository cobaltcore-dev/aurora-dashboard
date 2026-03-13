import { ListErrorHandler } from "./errorHandling"

/**
 * Handles specific error cases for port operations with custom messages
 */
export const PortErrorHandlers = {
  /**
   * Handles errors specific to port list operations.
   *
   * Uses the shared WORK_IN_PROGRESS `ListErrorHandler` prototype
   * (currently list-only and shared across Port, Network, and Floating IP).
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: ListErrorHandler("Port"),
}
