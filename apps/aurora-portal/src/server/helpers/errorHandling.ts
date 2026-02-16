import { TRPCError } from "@trpc/server"

/**
 * Converts a caught error into a TRPCError for the client.
 * - TRPCErrors are rethrown as-is (e.g., from explicit throws in the operation)
 * - Other errors (network failures, JSON parse errors, etc.) are wrapped as INTERNAL_SERVER_ERROR
 *   with the original error preserved as `cause`
 * - If error is a string, it's included in the message; otherwise the Error's message is used if available
 *
 * @param error - The error to handle
 * @param operation - The operation being performed, for context in error message
 * @returns TRPCError instance
 */
export function wrapError(error: Error | string, operation: string): TRPCError {
  if (error instanceof TRPCError) {
    return error
  }

  const baseErrorMessage = `Error during ${operation}`

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message:
      typeof error === "string"
        ? `${baseErrorMessage}: ${error}`
        : error.message
          ? `${baseErrorMessage}: ${error.message}`
          : baseErrorMessage,
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
    throw wrapError(error as Error | string, operationName)
  }
}
