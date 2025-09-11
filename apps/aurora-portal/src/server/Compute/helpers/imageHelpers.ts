import { TRPCError } from "@trpc/server"
import { ZodError } from "zod"
import { ListImagesInput } from "../types/image"

/**
 * Applies sorting and filtering parameters to URLSearchParams for OpenStack Glance API calls
 * @param queryParams - URLSearchParams object to modify
 * @param input - Input object containing sorting and filtering parameters
 */
export function applyImageQueryParams(queryParams: URLSearchParams, input: Omit<ListImagesInput, "projectId">): void {
  const {
    sort_key,
    sort_dir,
    sort,
    limit,
    marker,
    name,
    status,
    visibility,
    owner,
    protected: isProtected,
    container_format,
    disk_format,
    size_min,
    size_max,
    min_ram,
    min_disk,
    tag,
    os_type,
    os_hidden,
    member_status,
    created_at,
    updated_at,
  } = input

  // Sorting parameters - always use the new sort syntax
  if (sort) {
    queryParams.append("sort", sort)
  } else {
    // Construct sort parameter from sort_key and sort_dir (using defaults if not provided)
    const sortKey = sort_key || "created_at"
    const sortDir = sort_dir || "desc"
    queryParams.append("sort", `${sortKey}:${sortDir}`)
  }

  // Pagination parameters
  if (limit !== undefined) {
    queryParams.append("limit", limit.toString())
  }
  if (marker) {
    queryParams.append("marker", marker)
  }

  // Basic filtering parameters
  if (name) {
    queryParams.append("name", name)
  }
  if (status) {
    queryParams.append("status", status)
  }
  if (visibility) {
    queryParams.append("visibility", visibility)
  }
  if (owner) {
    queryParams.append("owner", owner)
  }
  if (member_status) {
    queryParams.append("member_status", member_status)
  }

  // Boolean parameters
  if (isProtected !== undefined) {
    queryParams.append("protected", isProtected.toString())
  }
  if (os_hidden !== undefined) {
    queryParams.append("os_hidden", os_hidden.toString())
  }

  // Format parameters
  if (container_format) {
    queryParams.append("container_format", container_format)
  }
  if (disk_format) {
    queryParams.append("disk_format", disk_format)
  }

  // Numeric parameters
  if (min_ram !== undefined) {
    queryParams.append("min_ram", min_ram.toString())
  }
  if (min_disk !== undefined) {
    queryParams.append("min_disk", min_disk.toString())
  }
  if (size_min !== undefined) {
    queryParams.append("size_min", size_min.toString())
  }
  if (size_max !== undefined) {
    queryParams.append("size_max", size_max.toString())
  }

  // Tag and OS filtering
  if (tag) {
    queryParams.append("tag", tag)
  }
  if (os_type) {
    queryParams.append("os_type", os_type)
  }

  // Time-based filtering with comparison operators
  if (created_at) {
    queryParams.append("created_at", created_at)
  }
  if (updated_at) {
    queryParams.append("updated_at", updated_at)
  }
}

/**
 * Utility function to parse pagination links from OpenStack Glance API response
 * @param linkUrl - Full URL with pagination parameters
 * @returns Extracted marker and other pagination info, or null if not parseable
 */
export function parsePaginationLink(linkUrl: string): { marker?: string; limit?: number } | null {
  try {
    const url = new URL(linkUrl)
    const marker = url.searchParams.get("marker")
    const limitStr = url.searchParams.get("limit")

    return {
      marker: marker || undefined,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Constructs next page URL for pagination by combining base URL with current parameters and next marker
 * @param baseUrl - The base API URL (e.g., "/v2/images")
 * @param currentParams - Current query parameters
 * @param nextMarker - The marker for the next page
 * @returns Full URL for next page
 */
export function buildNextPageUrl(baseUrl: string, currentParams: URLSearchParams, nextMarker: string): string {
  const nextParams = new URLSearchParams(currentParams)
  nextParams.set("marker", nextMarker)
  return `${baseUrl}?${nextParams.toString()}`
}

/**
 * Extracts marker from the last image in the current page
 * Useful for manual pagination when API doesn't provide next link
 * @param images - Array of images from current page
 * @returns The ID of the last image, or undefined if no images
 */
export function getLastImageMarker(images: Array<{ id: string }>): string | undefined {
  if (images.length === 0) {
    return undefined
  }
  return images[images.length - 1].id
}

/**
 * Validates that the OpenStack Glance service is available
 * @param glance - The OpenStack Glance service instance
 * @throws TRPCError if service is not available
 */
export function validateGlanceService(glance: unknown): asserts glance is NonNullable<typeof glance> {
  if (!glance) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to initialize OpenStack Glance service",
    })
  }
}

/**
 * Maps OpenStack API HTTP response status codes to appropriate TRPCError instances
 * @param response - The HTTP response from OpenStack API
 * @param context - Additional context for error messages (e.g., imageId, operation type)
 * @returns TRPCError instance with appropriate code and message
 */
export function mapResponseToTRPCError(
  response: { status?: number; statusText?: string },
  context: {
    operation: string
    imageId?: string
    memberId?: string
    additionalInfo?: string
  }
): TRPCError {
  const { operation, imageId, memberId, additionalInfo } = context
  const baseMessage = `Failed to ${operation}`
  const entityInfo = imageId ? ` image: ${imageId}` : ""
  const memberInfo = memberId ? `, member: ${memberId}` : ""
  const extraInfo = additionalInfo ? ` - ${additionalInfo}` : ""

  switch (response.status) {
    case 400:
      return new TRPCError({
        code: "BAD_REQUEST",
        message: `${baseMessage}${entityInfo}${memberInfo}${extraInfo}`,
      })

    case 403:
      return new TRPCError({
        code: "FORBIDDEN",
        message: `Access forbidden - cannot ${operation}${entityInfo}${memberInfo}${extraInfo}`,
      })

    case 404:
      return new TRPCError({
        code: "NOT_FOUND",
        message: `${memberId ? "Image or member" : "Image"} not found${entityInfo}${memberInfo}`,
      })

    case 409:
      return new TRPCError({
        code: "CONFLICT",
        message: `Conflict - ${operation}${entityInfo}${memberInfo}${extraInfo}`,
      })

    case 413:
      return new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: `Request entity too large${entityInfo}${extraInfo}`,
      })

    case 415:
      return new TRPCError({
        code: "BAD_REQUEST",
        message: `Unsupported media type${entityInfo}${extraInfo}`,
      })

    default:
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `${baseMessage}: ${response.statusText || "Unknown error"}`,
      })
  }
}

/**
 * Handles specific error cases for image operations with custom messages
 */
export const ImageErrorHandlers = {
  /**
   * Handles errors specific to image upload operations
   */
  upload: (response: { status?: number; statusText?: string }, imageId: string, contentType?: string) => {
    switch (response.status) {
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Image not found: ${imageId}`,
        })
      case 403:
        return new TRPCError({
          code: "FORBIDDEN",
          message: `Access forbidden - cannot upload to image: ${imageId}`,
        })
      case 409:
        return new TRPCError({
          code: "CONFLICT",
          message: `Image is not in a valid state for upload: ${imageId}`,
        })
      case 400:
        return new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid upload data for image: ${imageId}`,
        })
      case 413:
        return new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `Image data too large for upload: ${imageId}`,
        })
      case 415:
        return new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported content type for image upload: ${contentType || "unknown"}`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload image: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to image member operations
   */
  member: {
    create: (response: { status?: number; statusText?: string }, imageId: string, member: string) => {
      switch (response.status) {
        case 404:
          return new TRPCError({
            code: "NOT_FOUND",
            message: `Image not found: ${imageId}`,
          })
        case 403:
          return new TRPCError({
            code: "FORBIDDEN",
            message: `Access forbidden - must be image owner to add members: ${imageId}`,
          })
        case 400:
          return new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid request - check image visibility is 'shared' and member ID is valid: ${imageId}`,
          })
        case 409:
          return new TRPCError({
            code: "CONFLICT",
            message: `Member already exists for image: ${imageId}, ${member}`,
          })
        default:
          return new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create image member: ${response.statusText || "Unknown error"}`,
          })
      }
    },

    update: (response: { status?: number; statusText?: string }, imageId: string, memberId: string, status: string) => {
      switch (response.status) {
        case 404:
          return new TRPCError({
            code: "NOT_FOUND",
            message: `Image or member not found: ${imageId}, ${memberId}`,
          })
        case 403:
          return new TRPCError({
            code: "FORBIDDEN",
            message: `Access forbidden - only the member can update their own status: ${imageId}, ${memberId}`,
          })
        case 400:
          return new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid status value: ${status}`,
          })
        default:
          return new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update image member: ${response.statusText || "Unknown error"}`,
          })
      }
    },

    delete: (response: { status?: number; statusText?: string }, imageId: string, memberId: string) => {
      switch (response.status) {
        case 404:
          return new TRPCError({
            code: "NOT_FOUND",
            message: `Image or member not found: ${imageId}, ${memberId}`,
          })
        case 403:
          return new TRPCError({
            code: "FORBIDDEN",
            message: `Access forbidden - must be image owner to delete members: ${imageId}, ${memberId}`,
          })
        default:
          return new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete image member: ${response.statusText || "Unknown error"}`,
          })
      }
    },

    list: (response: { status?: number; statusText?: string }, imageId: string) => {
      switch (response.status) {
        case 404:
          return new TRPCError({
            code: "NOT_FOUND",
            message: `Image not found: ${imageId}`,
          })
        case 403:
          return new TRPCError({
            code: "FORBIDDEN",
            message: `Access forbidden - only shared images have members: ${imageId}`,
          })
        default:
          return new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch image members: ${response.statusText || "Unknown error"}`,
          })
      }
    },

    get: (response: { status?: number; statusText?: string }, imageId: string, memberId: string) => {
      switch (response.status) {
        case 404:
          return new TRPCError({
            code: "NOT_FOUND",
            message: `Image or member not found: ${imageId}, ${memberId}`,
          })
        case 403:
          return new TRPCError({
            code: "FORBIDDEN",
            message: `Access forbidden to image member: ${imageId}, ${memberId}`,
          })
        default:
          return new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch image member: ${response.statusText || "Unknown error"}`,
          })
      }
    },
  },

  /**
   * Handles errors specific to image visibility updates
   */
  visibility: (response: { status?: number; statusText?: string }, imageId: string, visibility: string) => {
    switch (response.status) {
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Image not found: ${imageId}`,
        })
      case 403:
        return new TRPCError({
          code: "FORBIDDEN",
          message: `Access forbidden - cannot update image visibility: ${imageId}`,
        })
      case 409:
        return new TRPCError({
          code: "CONFLICT",
          message: `Image is not in a valid state for visibility update: ${imageId}`,
        })
      case 400:
        return new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid visibility value for image: ${visibility}`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update image visibility: ${response.statusText || "Unknown error"}`,
        })
    }
  },

  /**
   * Handles errors specific to image deletion
   */
  delete: (response: { status?: number; statusText?: string }, imageId: string) => {
    switch (response.status) {
      case 403:
        return new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot delete protected image: ${imageId}`,
        })
      case 404:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Image not found: ${imageId}`,
        })
      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete image: ${response.statusText || "Unknown error"}`,
        })
    }
  },
}

/**
 * Handles Zod parsing errors and converts them to TRPCError
 * @param error - The Zod parsing error
 * @param operation - The operation being performed for context
 * @returns TRPCError with parsing error details
 */
export function handleZodParsingError(error: ZodError, operation: string): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Invalid response format from OpenStack Glance API during ${operation}`,
    cause: error,
  })
}

/**
 * Generic error wrapper that preserves TRPCError instances and wraps other errors
 * @param error - The error to handle
 * @param operation - The operation being performed for context
 * @returns TRPCError instance
 */
export function wrapError(error: unknown, operation: string): TRPCError {
  if (error instanceof TRPCError) {
    return error
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Error during ${operation}`,
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
    throw wrapError(error, operationName)
  }
}
