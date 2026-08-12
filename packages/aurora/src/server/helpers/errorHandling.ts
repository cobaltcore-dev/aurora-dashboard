import { TRPCError } from "@trpc/server"
import { SignalOpenstackError } from "@cobaltcore-dev/signal-openstack"

/**
 * Converts a caught error into a TRPCError for the client. Used by withErrorHandling so that
 * any non-TRPCError (network failure, JSON parse, etc.) is turned into a consistent INTERNAL_SERVER_ERROR
 * with message and cause, while TRPCErrors (e.g. from explicit throws in the operation) are rethrown as-is.
 * SignalOpenstackErrors (validation failures) are mapped to BAD_REQUEST.
 *
 * @param error - The error to handle
 * @param operation - The operation being performed for context
 * @returns TRPCError instance
 */
export function wrapError(error: Error | string, operation: string): TRPCError {
  if (error instanceof TRPCError) {
    return error
  }

  // Map SignalOpenstackError (validation failures) to BAD_REQUEST
  if (error instanceof SignalOpenstackError) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error,
    })
  }

  const baseErrorMessage = `Error during ${operation}`

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: typeof error !== "string" && error.message ? `${baseErrorMessage}: ${error.message}` : baseErrorMessage,
    cause: error,
  })
}

/**
 * Higher-order function to wrap async operations with consistent error handling.
 * Catches any error thrown during operation execution and passes it through wrapError,
 * ensuring all errors are normalized to TRPCError before reaching the client.
 *
 * @param operation - The async operation to perform
 * @param operationName - Name of the operation for error context
 * @returns Promise that resolves to the operation result or throws TRPCError
 */
export async function withErrorHandling<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw wrapError(error as Error, operationName)
  }
}
