import { TRPCError } from "@trpc/server"
import { securityGroupResponseSchema, securityGroupsResponseSchema } from "../types/securityGroup"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"

/**
 * Handles specific error cases for security group operations with custom messages
 */
export const SecurityGroupErrorHandlers = {
  /**
   * Handles errors specific to security group list operations
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  list: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access",
        })
      case 403:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[403],
          message: `Access forbidden: ${response.statusText || "Unknown error"}`,
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to list security groups: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to security group retrieval by ID
   * @param response - The HTTP response from OpenStack
   * @param securityGroupId - The ID of the security group being retrieved
   * @returns TRPCError with appropriate code and message
   */
  getById: (response: { status?: number; statusText?: string }, securityGroupId: string) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access",
        })
      case 403:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[403],
          message: `Access forbidden: ${response.statusText || "Unknown error"}`,
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[404],
          message: `Security group not found: ${securityGroupId}`,
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to fetch security group: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to security group creation
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  create: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access",
        })
      case 403:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[403],
          message: `Access forbidden: ${response.statusText || "Unknown error"}`,
        })
      case 409:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[409],
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
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access",
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[404],
          message: `Security group not found: ${securityGroupId}`,
        })
      case 409:
        // Security group is in use
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[409],
          message:
            "Cannot delete security group because it is in use by one or more ports. Please remove all associations before deleting.",
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to delete security group: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to security group updates
   * @param response - The HTTP response from OpenStack
   * @param securityGroupId - The ID of the security group being updated
   * @returns TRPCError with appropriate code and message
   */
  update: (response: { status?: number; statusText?: string }, securityGroupId: string) => {
    const errorMessage = response.statusText || ""

    // Check if trying to update stateful on a security group in use
    if (errorMessage.toLowerCase().includes("stateful") && errorMessage.toLowerCase().includes("in use")) {
      return new TRPCError({
        code: "CONFLICT",
        message: "Cannot update the 'stateful' attribute because this security group is in use by one or more ports.",
      })
    }

    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access",
        })
      case 403:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[403],
          message: `Access forbidden: ${errorMessage || "Unknown error"}`,
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[404],
          message: `Security group not found: ${securityGroupId}`,
        })
      case 409:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[409],
          message: `Conflict: ${errorMessage || "Security group conflict"}`,
        })
      case 400:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[400],
          message: `Invalid request: ${errorMessage || "Unknown error"}`,
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to update security group: ${errorMessage || "Unknown error"}`,
        })
    }
  },
}

/**
 * Parses and validates a single security group response from OpenStack
 * @param data - The response data to parse
 * @param operation - The operation name for error context
 * @returns The parsed security group
 * @throws TRPCError if parsing fails
 */
export const parseSecurityGroupResponse = (data: unknown, operation: string) => {
  const parsed = securityGroupResponseSchema.safeParse(data)
  if (!parsed.success) {
    console.error(`Zod Parsing Error in ${operation}:`, parsed.error.format())
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to parse security group response from OpenStack",
    })
  }
  return parsed.data.security_group
}

/**
 * Parses and validates a security groups list response from OpenStack
 * @param data - The response data to parse
 * @param operation - The operation name for error context
 * @returns The parsed security groups array
 * @throws TRPCError if parsing fails
 */
export const parseSecurityGroupsResponse = (data: unknown, operation: string) => {
  const parsed = securityGroupsResponseSchema.safeParse(data)
  if (!parsed.success) {
    console.error(`Zod Parsing Error in ${operation}:`, parsed.error.format())
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to parse security groups response from OpenStack",
    })
  }
  return parsed.data.security_groups
}
