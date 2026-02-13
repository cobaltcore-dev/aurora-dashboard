import { TRPCError } from "@trpc/server"

/**
 * Generic error wrapper that preserves TRPCError instances and wraps other errors
 * @param error - The error to handle
 * @param operation - The operation being performed for context
 * @returns TRPCError instance
 */
export function wrapError(error: Error | string, operation: string): TRPCError {
  if (error instanceof TRPCError) {
    return error
  }

  const baseErrorMessage = `Error during ${operation}`

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: typeof error !== "string" && error.message ? `${baseErrorMessage}: ${error.message}` : baseErrorMessage,
    cause: error,
  })
}

/**
 * Higher-order function to wrap async operations with consistent error handling
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
