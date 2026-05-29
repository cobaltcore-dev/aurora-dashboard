import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"
import { rbacPolicyResponseSchema, rbacPoliciesResponseSchema, type RBACPolicy } from "../types/rbacPolicy"

/**
 * Error handlers for RBAC Policy operations
 */
export const RBACPolicyErrorHandlers = {
  /**
   * Handles errors specific to RBAC policy list operations
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
          message: `Failed to list RBAC policies: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to RBAC policy creation
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  create: (response: { status?: number; statusText?: string }) => {
    switch (response.status) {
      case 400:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[400],
          message: `Invalid request: ${response.statusText || "Unknown error"}`,
        })
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access",
        })
      case 403:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[403],
          message: "You don't have permission to share this security group",
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[404],
          message: "Security group not found or target project does not exist",
        })
      case 409:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[409],
          message: "This security group is already shared with the specified project",
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create RBAC policy: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to RBAC policy updates
   * @param response - The HTTP response from OpenStack
   * @param policyId - The ID of the policy being updated
   * @returns TRPCError with appropriate code and message
   */
  update: (response: { status?: number; statusText?: string }, policyId: string) => {
    switch (response.status) {
      case 400:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[400],
          message: `Invalid request: ${response.statusText || "Unknown error"}`,
        })
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
          message: `RBAC policy not found: ${policyId}`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update RBAC policy: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to RBAC policy deletion
   * @param response - The HTTP response from OpenStack
   * @param policyId - The ID of the policy being deleted
   * @returns TRPCError with appropriate code and message
   */
  delete: (response: { status?: number; statusText?: string }, policyId: string) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[401],
          message: "Unauthorized access",
        })
      case 404:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[404],
          message: `RBAC policy not found: ${policyId}`,
        })
      case 409:
        return new TRPCError({
          code: HTTP_STATUS_ERROR_MAP[409],
          message: "Cannot delete RBAC policy because it is in use",
        })
      default:
        return new TRPCError({
          code: DEFAULT_ERROR_NAME,
          message: `Failed to delete RBAC policy: ${response.statusText || "Unknown error"}`,
        })
    }
  },
}

/**
 * Generic parser for OpenStack responses with Zod schema validation
 * @param data - The response data to parse
 * @param schema - The Zod schema to validate against
 * @param operation - The operation name for error context
 * @param errorMessage - The error message to use if parsing fails
 * @returns The parsed data
 * @throws TRPCError if parsing fails
 */
const parseOpenStackResponse = <T>(data: unknown, schema: z.ZodType<T>, operation: string, errorMessage: string): T => {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    console.error(`Zod Parsing Error in ${operation}:`, parsed.error.format())
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: errorMessage,
    })
  }
  return parsed.data
}

/**
 * Parse and validate single RBAC policy response
 * @param data - The response data to parse
 * @param operation - The operation name for error context
 * @returns The parsed RBAC policy
 * @throws TRPCError if parsing fails
 */
export function parseRBACPolicyResponse(data: unknown, operation: string): RBACPolicy {
  const parsed = parseOpenStackResponse(
    data,
    rbacPolicyResponseSchema,
    operation,
    "Failed to parse RBAC policy response from OpenStack"
  )
  return parsed.rbac_policy
}

/**
 * Parse and validate RBAC policies list response
 * @param data - The response data to parse
 * @param operation - The operation name for error context
 * @returns The parsed RBAC policies array
 * @throws TRPCError if parsing fails
 */
export function parseRBACPoliciesListResponse(data: unknown, operation: string): RBACPolicy[] {
  const parsed = parseOpenStackResponse(
    data,
    rbacPoliciesResponseSchema,
    operation,
    "Failed to parse RBAC policies list response from OpenStack"
  )
  return parsed.rbac_policies
}
