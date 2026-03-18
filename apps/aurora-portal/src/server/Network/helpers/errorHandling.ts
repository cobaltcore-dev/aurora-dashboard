import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"

/**
 * WORK_IN_PROGRESS:
 * This shared error-handling helper is currently a prototype and is only used for
 * list procedures in Port and Network helpers.
 * list / get procedures in Floating IP
 *
 * The goal is to extend this approach in the future and make it resource-wide
 * across all network procedures (create/update/delete).
 */
type ErrorCodes = 401 | 403 | 404
type ErrorResponse = { status?: number; statusText?: string }
type ErrorHandlerFn = (response: ErrorResponse, resourceId?: string) => TRPCError
type ErrorHandlerMap = Record<ErrorCodes, ErrorHandlerFn>

/**
 * Creates an error handler for the current prototype resources.
 *
 * Default handlers (401, 403, 404) are always handled, while custom handlers
 * can extend/override specific status codes.
 */
export const DEFAULT_HANDLERS: ErrorHandlerMap = {
  401: (response, resourceId) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[401],
      message: `Unauthorized access to ${resourceId || "resource"}: ${response.statusText || "Unknown error"}`,
    }),
  403: (response, resourceId) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[403],
      message: `Access forbidden to ${resourceId || "resource"}: ${response.statusText || "Unknown error"}`,
    }),
  404: (response, resourceId) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[404],
      message: `${resourceId || "Resource"} not found: ${response.statusText || "Unknown error"}`,
    }),
}

type ResourceName = "Port" | "Network" | "Floating IP"

export const ErrorHandler = (resourceName: ResourceName, customHandlers?: Partial<ErrorHandlerMap>) => {
  const handlers = { ...DEFAULT_HANDLERS, ...customHandlers }

  return (response: ErrorResponse, resourceId?: string) => {
    if (response.status && handlers[response.status as ErrorCodes]) {
      return handlers[response.status as ErrorCodes](response, resourceId)
    }

    return new TRPCError({
      code: DEFAULT_ERROR_NAME,
      message: `Failed to fetch ${resourceId ?? resourceName}: ${response.statusText || "Unknown error"}`,
    })
  }
}
