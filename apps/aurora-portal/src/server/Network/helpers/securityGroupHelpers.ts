import { z } from "zod"
import {
  securityGroupResponseSchema,
  securityGroupsResponseSchema,
  securityGroupRuleResponseSchema,
} from "../types/securityGroup"
import { TRPCError } from "@trpc/server"
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
 * Handles specific error cases for security group rule operations with custom messages
 */
export const SecurityGroupRuleErrorHandlers = {
  /**
   * Handles errors specific to security group rule creation
   * @param response - The HTTP response from OpenStack
   * @returns TRPCError with appropriate code and message
   */
  create: (response: { status?: number; statusText?: string }) => {
    const statusText = response.statusText || "Unknown error"

    switch (response.status) {
      case 400:
        // Detect specific validation errors from OpenStack
        if (statusText.toLowerCase().includes("cidr")) {
          return new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid CIDR format. Please provide a valid IP address block (e.g., 0.0.0.0/0)",
          })
        }
        if (statusText.toLowerCase().includes("port")) {
          return new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid port range. Ports must be between 1 and 65535, and min must be <= max",
          })
        }
        return new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid request: ${statusText}`,
        })

      case 401:
        return new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        })

      case 403:
        return new TRPCError({
          code: "FORBIDDEN",
          message: `Access forbidden: ${statusText}`,
        })

      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: "Security group not found",
        })

      case 409:
        return new TRPCError({
          code: "CONFLICT",
          message: "A rule with these parameters already exists in this security group",
        })

      case 413:
        // Quota exceeded
        return new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Quota exceeded for security group rules. Please delete existing rules or contact your administrator.",
        })

      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create security group rule: ${statusText}`,
        })
    }
  },

  /**
   * Handles errors specific to security group rule deletion
   * @param response - The HTTP response from OpenStack
   * @param ruleId - The ID of the rule being deleted
   * @returns TRPCError with appropriate code and message
   *
   * Based on OpenStack API documentation:
   * - Normal response: 204
   * - Error responses: 401, 404, 412
   */
  delete: (response: { status?: number; statusText?: string }, ruleId: string) => {
    switch (response.status) {
      case 401:
        return new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
        })
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Security group rule not found: ${ruleId}`,
        })
      case 412:
        // Precondition Failed - typically means the resource state doesn't match expected conditions
        return new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete security group rule: precondition failed`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete security group rule: ${response.statusText || "Unknown error"}`,
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
 * Parses and validates a single security group response from OpenStack
 * @param data - The response data to parse
 * @param operation - The operation name for error context
 * @returns The parsed security group
 * @throws TRPCError if parsing fails
 */
export const parseSecurityGroupResponse = (data: unknown, operation: string) => {
  const parsed = parseOpenStackResponse(
    data,
    securityGroupResponseSchema,
    operation,
    "Failed to parse security group response from OpenStack"
  )
  return parsed.security_group
}

/**
 * Parses and validates a security groups list response from OpenStack
 * @param data - The response data to parse
 * @param operation - The operation name for error context
 * @returns The parsed security groups array
 * @throws TRPCError if parsing fails
 */
export const parseSecurityGroupListResponse = (data: unknown, operation: string) => {
  const parsed = parseOpenStackResponse(
    data,
    securityGroupsResponseSchema,
    operation,
    "Failed to parse security groups list response from OpenStack"
  )
  return parsed.security_groups
}

/**
 * Parses and validates a single security group rule response from OpenStack
 * @param data - The response data to parse
 * @param operation - The operation name for error context
 * @returns The parsed security group rule
 * @throws TRPCError if parsing fails
 */
export const parseSecurityGroupRuleResponse = (data: unknown, operation: string) => {
  const parsed = parseOpenStackResponse(
    data,
    securityGroupRuleResponseSchema,
    operation,
    "Failed to parse security group rule response from OpenStack"
  )
  return parsed.security_group_rule
}

/**
 * Deduplicates security groups by ID
 * @param items - Array of security groups to deduplicate
 * @returns Deduplicated array of security groups
 */
export const deduplicateSecurityGroupsById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Map<string, T>()

  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.set(item.id, item)
    }
  }

  return Array.from(seen.values())
}

/**
 * Sorts security groups by the specified key and direction
 * @param items - Array of security groups to sort
 * @param sortKey - The field to sort by (e.g., 'name', 'id', 'created_at')
 * @param sortDir - Sort direction ('asc' or 'desc')
 * @returns Sorted array of security groups
 */
export const sortSecurityGroups = <T extends Record<string, unknown>>(
  items: T[],
  sortKey?: string,
  sortDir: "asc" | "desc" = "asc"
): T[] => {
  if (!sortKey) return items

  return [...items].sort((a, b) => {
    const aValue = a[sortKey]
    const bValue = b[sortKey]

    // Handle null/undefined values - always place them at the end
    // regardless of sort direction (OpenStack behavior)
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    // String comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue)
      return sortDir === "asc" ? comparison : -comparison
    }

    // Numeric comparison
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDir === "asc" ? aValue - bValue : bValue - aValue
    }

    // Boolean comparison
    if (typeof aValue === "boolean" && typeof bValue === "boolean") {
      return sortDir === "asc" ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
    }

    return 0
  })
}

/**
 * Applies marker-based pagination to a sorted array
 * Mimics OpenStack Neutron marker-based pagination behavior
 *
 * @param items - Sorted array of security groups
 * @param marker - ID of the last item from the previous page
 * @param limit - Maximum number of items to return
 * @param pageReverse - If true, return items before the marker instead of after
 * @returns Paginated array of security groups
 */
export const applyMarkerPagination = <T extends { id: string }>(
  items: T[],
  marker?: string,
  limit?: number,
  pageReverse?: boolean
): T[] => {
  let result = items

  // Apply marker if provided
  if (marker) {
    const markerIndex = items.findIndex((item) => item.id === marker)
    if (markerIndex !== -1) {
      // If page_reverse=true, get items BEFORE marker; otherwise get items AFTER marker
      if (pageReverse) {
        result = items.slice(0, markerIndex).reverse()
      } else {
        result = items.slice(markerIndex + 1)
      }
    } else {
      // Marker not found, return empty array (Neutron behavior)
      return []
    }
  }

  // Apply limit
  if (limit !== undefined && limit > 0) {
    result = result.slice(0, limit)
  }

  // If we reversed for page_reverse, reverse back to maintain sort order
  if (pageReverse && marker) {
    result = result.reverse()
  }

  return result
}
