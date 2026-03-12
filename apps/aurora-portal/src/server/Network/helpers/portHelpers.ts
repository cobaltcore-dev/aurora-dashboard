import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_CODE_TO_NAME } from "./index"

/**
 * Handles specific error cases for port operations with custom messages
 */
export const PortErrorHandlers = {
  /**
   * Handles errors specific to port list operations
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_CODE_TO_NAME[401],
          message: `Unauthorized access`,
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to fetch list: ${response.statusText || "Unknown error"}`,
        })
    }
  },
}
