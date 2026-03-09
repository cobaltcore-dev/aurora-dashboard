import { TRPCError } from "@trpc/server"

/**
 * Handles specific error cases for security group operations with custom messages
 */
export const SecurityGroupErrorHandlers = {
  /**
   * Handles errors specific to security group creation
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  create: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        })
      case 403:
        return new TRPCError({
          code: "FORBIDDEN",
          message: `Access forbidden: ${response.statusText || "Unknown error"}`,
        })
      case 409:
        return new TRPCError({
          code: "CONFLICT",
          message: `Conflict: ${response.statusText || "Security group already exists"}`,
        })
      case 413:
        // Quota exceeded
        return new TRPCError({
          code: "BAD_REQUEST",
          message: `Quota exceeded for security groups. Please delete an existing security group or contact your administrator to increase your quota.`,
        })
      case 400:
        return new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid request: ${response.statusText || "Unknown error"}`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create security group: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to security group deletion
   * @param response - The HTTP response from OpenStack
   * @param securityGroupId - The ID of the security group being deleted
   * @returns TRPCError with appropriate code and message
   */
  delete: (response: { status?: number; statusText?: string }, securityGroupId: string) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        })
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Security group not found: ${securityGroupId}`,
        })
      case 409:
        // Security group is in use
        return new TRPCError({
          code: "CONFLICT",
          message:
            "Cannot delete security group because it is in use by one or more ports. Please remove all associations before deleting.",
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete security group: ${response.statusText || "Unknown error"}`,
        })
    }
  },
}
