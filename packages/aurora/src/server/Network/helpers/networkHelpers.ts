import { TRPCError } from "@trpc/server"
import { ErrorHandler } from "./errorHandling"

/**
 * Error handlers for Network operations.
 * Uses the shared error handling pattern with resource-specific messages.
 */
export const NetworkErrorHandlers = {
  list: ErrorHandler("Network"),
  get: ErrorHandler("Network"),
  create: ErrorHandler("Network", {
    400: (response) =>
      new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid network configuration: ${response.statusText || "Unknown error"}`,
      }),
    409: (response) =>
      new TRPCError({
        code: "CONFLICT",
        message: `Network creation conflict: ${response.statusText || "A network with this name may already exist"}`,
      }),
  }),
  update: ErrorHandler("Network", {
    400: (response) =>
      new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid network update: ${response.statusText || "Unknown error"}`,
      }),
    404: (response) =>
      new TRPCError({
        code: "NOT_FOUND",
        message: `Network not found or has been deleted: ${response.statusText || "Unknown error"}`,
      }),
    409: (response) =>
      new TRPCError({
        code: "CONFLICT",
        message: `Network update conflict: ${response.statusText || "Network may be in use"}`,
      }),
  }),
  delete: ErrorHandler("Network", {
    404: (response) =>
      new TRPCError({
        code: "NOT_FOUND",
        message: `Network not found or has already been deleted: ${response.statusText || "Unknown error"}`,
      }),
    409: (response) =>
      new TRPCError({
        code: "CONFLICT",
        message: `Cannot delete network: ${response.statusText || "Network may have active subnets or ports attached"}`,
      }),
  }),
}
