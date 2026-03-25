import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"

/**
 * WORK_IN_PROGRESS:
 * This shared error-handling helper is currently a prototype and is only used for
 * list procedures in Port and Network helpers.
 * list / get / update / delete procedures in Floating IP
 *
 * The goal is to extend this approach in the future and make it resource-wide
 * across all network procedures (create/update/delete).
 */
type ErrorCodes = 400 | 401 | 403 | 404 | 409 | 412
type ErrorResponse = { status?: number; statusText?: string }
type ErrorHandlerFn = (response: ErrorResponse, resourceLabel?: string) => TRPCError
type ErrorHandlerMap = Record<ErrorCodes, ErrorHandlerFn>

/**
 * Creates an error handler for the current prototype resources.
 *
 * Default handlers (400, 401, 403, 404, 409, 412) are always handled, while custom handlers
 * can extend/override specific status codes.
 */
export const DEFAULT_HANDLERS: ErrorHandlerMap = {
  400: (response, resourceLabel) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[400],
      message: `Invalid request data for ${resourceLabel}: ${response.statusText || "Unknown error"}`,
    }),
  401: (response, resourceLabel) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[401],
      message: `Unauthorized access to ${resourceLabel}: ${response.statusText || "Unknown error"}`,
    }),
  403: (response, resourceLabel) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[403],
      message: `Access forbidden to ${resourceLabel}: ${response.statusText || "Unknown error"}`,
    }),
  404: (response, resourceLabel) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[404],
      message: `${resourceLabel} not found: ${response.statusText || "Unknown error"}`,
    }),
  409: (response, resourceLabel) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[409],
      message: `Conflict - ${resourceLabel} is in use: ${response.statusText || "Unknown error"}`,
    }),
  412: (response, resourceLabel) =>
    new TRPCError({
      code: HTTP_STATUS_ERROR_MAP[412],
      message: `Precondition failed - revision number mismatch in ${resourceLabel}: ${response.statusText || "Unknown error"}`,
    }),
}

type ResourceName = "Port" | "Network" | "Floating IP"

export const ErrorHandler = (resourceName: ResourceName, customHandlers?: Partial<ErrorHandlerMap>) => {
  const handlers = { ...DEFAULT_HANDLERS, ...customHandlers }

  return (response: ErrorResponse, resourceId?: string) => {
    const resourceLabel = resourceId ?? resourceName

    if (response.status && handlers[response.status as ErrorCodes]) {
      return handlers[response.status as ErrorCodes](response, resourceLabel)
    }

    return new TRPCError({
      code: DEFAULT_ERROR_NAME,
      message: `Failed to process ${resourceLabel}: ${response.statusText || "Unknown error"}`,
    })
  }
}
