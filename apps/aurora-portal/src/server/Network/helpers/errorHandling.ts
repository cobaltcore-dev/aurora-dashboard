import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"

/**
 * WORK_IN_PROGRESS:
 * This shared error-handling helper is currently a prototype and is only used for
 * list operations in Port, Network, and Floating IP helpers.
 *
 * The goal is to extend this approach in the future and make it resource-wide
 * across all network helper operations (get/create/update/delete).
 */

type ErrorCodes = 401 | 403
type ErrorResponse = { status?: number; statusText?: string }
type ErrorHandlerFn = (response: ErrorResponse) => TRPCError
type ErrorHandler = Record<ErrorCodes, ErrorHandlerFn>

export const DEFAULT_HANDLERS: ErrorHandler = {
  401: () =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[401],
      message: "Unauthorized access",
    }),
  403: (response) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[403],
      message: `Access forbidden: ${response.statusText || "Unknown error"}`,
    }),
}

type ResourceName = "Port" | "Network" | "Floating IP"
/**
 * Creates a standard list error handler for the current prototype resources.
 *
 * WORK_IN_PROGRESS:
 * - Scope today: list handlers for Port, Network, Floating IP.
 * - Scope later: expand to a resource-wide error-handling strategy.
 *
 * Default handlers (401, 403) are always handled, while custom handlers
 * can extend/override specific status codes.
 */
export const ListErrorHandler = (resourceName: ResourceName, customHandlers?: Partial<ErrorHandler>) => {
  const handlers = { ...DEFAULT_HANDLERS, ...customHandlers }

  return (response: ErrorResponse) => {
    if (response.status && handlers[response.status as ErrorCodes]) {
      return handlers[response.status as ErrorCodes](response)
    }

    return new TRPCError({
      code: DEFAULT_ERROR_NAME,
      message: `Failed to fetch list: ${resourceName}: ${response.statusText || "Unknown error"}`,
    })
  }
}
