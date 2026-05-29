import { ErrorHandler } from "./errorHandling"

/**
 * Handles specific error cases for floating IP operations with predefined messages from errorHandling module.
 * @param resourceName - The name of the resource being accessed
 * @returns TRPCError with appropriate code and message
 */
export const FloatingIpErrorHandlers = {
  list: ErrorHandler("Floating IP"),

  create: ErrorHandler("Floating IP"),

  get: ErrorHandler("Floating IP"),

  update: ErrorHandler("Floating IP"),

  delete: ErrorHandler("Floating IP"),
}
