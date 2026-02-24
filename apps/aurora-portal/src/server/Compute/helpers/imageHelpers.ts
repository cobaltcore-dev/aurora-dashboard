import { TRPCError } from "@trpc/server"
import { ZodError } from "zod"
import { BulkOperationResult, GlanceImage, ListImagesInput } from "../types/image"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"

/**
 * Applies sorting and filtering parameters to URLSearchParams for OpenStack Glance API calls
 * @param queryParams - URLSearchParams object to modify
 * @param input - Input object containing sorting and filtering parameters
 */
export function applyImageQueryParams(queryParams: URLSearchParams, input: ListImagesInput): void {
  const {
    sort_key,
    sort_dir,
    sort,
    limit,
    marker,
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
  // Note: `name` is intentionally excluded here — OpenStack Glance API does not support
  // wildcard or substring name filtering. Name-based filtering is applied server-side
  // after fetching results (see listImagesWithPagination procedure).
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
 * Filters a list of images by name using a case-insensitive substring match.
 * Used in place of the OpenStack Glance `name` query parameter, which only supports
 * exact matches and does not allow wildcard or substring filtering.
 *
 * @param images - Array of GlanceImage objects to filter
 * @param name - Substring to match against each image's name (case-insensitive)
 * @returns Filtered array of images whose names contain the given substring
 */
export function filterImagesByName(images: GlanceImage[], name: string | undefined): GlanceImage[] {
  if (!name) return images
  const nameLower = name.toLowerCase()
  return images.filter((image) => image.name?.toLowerCase().includes(nameLower))
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
 * Validates streaming upload inputs with file size before uploading to OpenStack Glance
 *
 * @param imageId - OpenStack image ID (UUID string)
 * @param fileSize - File size in bytes from Content-Length header (0 if unknown)
 * @param fileStream - File data as Node.js ReadableStream
 *
 * @returns { validatedImageId: string; validatedFileSize: number; validatedFile: NodeJS.ReadableStream }
 *
 * @throws TRPCError(BAD_REQUEST) if imageId/fileStream invalid or fileSize negative
 * @throws TRPCError(INTERNAL_SERVER_ERROR) if fileSize not a finite number
 */
export function validateUploadInput(
  imageId: unknown,
  fileSize: unknown,
  fileStream: unknown
): { validatedImageId: string; validatedFile: NodeJS.ReadableStream; validatedFileSize: number } {
  // Validate imageId
  if (!imageId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "imageId is required",
    })
  }

  if (typeof imageId !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "imageId must be a string",
    })
  }

  if (imageId.trim() === "") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "imageId cannot be empty",
    })
  }

  // Validate fileStream
  if (!fileStream) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "File not uploaded",
    })
  }

  // Check if fileStream is a readable stream
  if (typeof fileStream !== "object" || !("pipe" in fileStream) || typeof fileStream.pipe !== "function") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid file stream format",
    })
  }

  // Validate fileSize (optional, but validate if provided)
  if (fileSize !== undefined && fileSize !== null) {
    if (typeof fileSize !== "number") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invalid fileSize format - must be a number",
      })
    }

    if (fileSize < 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "fileSize cannot be negative",
      })
    }

    if (!Number.isFinite(fileSize)) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "fileSize must be a finite number",
      })
    }
  }

  // Return validated values
  return {
    validatedImageId: imageId.trim(),
    validatedFile: fileStream as NodeJS.ReadableStream,
    validatedFileSize: typeof fileSize === "number" ? fileSize : 0,
  }
}

/**
 * Maps Signal OpenStack API Error to appropriate TRPCError instances
 * @param error - The Signal OpenStack API Error
 * @param context - Additional context for error messages (e.g., imageId, operation type)
 * @returns TRPCError instance with appropriate code and message
 */
export function mapErrorResponseToTRPCError(
  error: SignalOpenstackApiError,
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

  switch (error.statusCode) {
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
        message: `${baseMessage}: ${error.message || "Unknown error"}`,
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
  upload: (response: { statusCode?: number; message?: string }, imageId: string, contentType?: string) => {
    switch (response.statusCode) {
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
          message: `Failed to upload image: ${response.message || "Unknown error"}`,
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

/**
 * Helper to format bulk operation error messages
 * @param imageId - The image ID that failed
 * @param error - The error that occurred
 * @param operation - The operation being performed (e.g., "delete", "activate")
 * @returns Formatted error message
 */
export function formatBulkOperationError(imageId: string, error: unknown, operation: string): string {
  if (error instanceof TRPCError) {
    return error.message
  }
  if (error instanceof Error) {
    return `Failed to ${operation} image: ${error.message}`
  }
  if (typeof error === "string") {
    return `Failed to ${operation} image: ${error}`
  }
  return `Failed to ${operation} image: Unknown error`
}

/**
 * Validates that an array of image IDs is not empty
 * @param imageIds - Array of image IDs to validate
 * @param operation - The operation being performed for error context
 * @throws TRPCError if array is empty
 */
export function validateBulkImageIds(imageIds: string[], operation: string): void {
  if (imageIds.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot ${operation} - at least one image ID is required`,
    })
  }
}

/**
 * Chunks an array into smaller arrays of specified size
 * Useful for processing large batches in smaller groups
 * @param array - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Processes bulk operations with optional chunking and rate limiting
 * @param items - Items to process
 * @param processor - Async function to process each item
 * @param options - Processing options
 * @returns BulkOperationResult with successful and failed items
 */
export async function processBulkOperation<T extends { id: string }>(
  items: T[],
  processor: (item: T) => Promise<void>,
  options: {
    chunkSize?: number
    delayBetweenChunks?: number
    operation?: string // Operation name for error messages (e.g., "delete", "activate")
  } = {}
): Promise<BulkOperationResult> {
  const { chunkSize, delayBetweenChunks, operation = "process" } = options
  const results: BulkOperationResult = {
    successful: [],
    failed: [],
  }

  // If chunking is enabled, process in chunks
  if (chunkSize && chunkSize > 0) {
    const chunks = chunkArray(items, chunkSize)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkPromises = chunk.map(async (item) => {
        try {
          await processor(item)
          return { status: "success" as const, id: item.id }
        } catch (error) {
          return {
            status: "failed" as const,
            id: item.id,
            error: formatBulkOperationError(item.id, error, operation),
          }
        }
      })

      const chunkResults = await Promise.allSettled(chunkPromises)

      chunkResults.forEach((result) => {
        if (result.status === "fulfilled") {
          const value = result.value
          if (value.status === "success") {
            results.successful.push(value.id)
          } else {
            results.failed.push({ imageId: value.id, error: value.error })
          }
        }
      })

      // Add delay between chunks if specified
      if (delayBetweenChunks && i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks))
      }
    }
  } else {
    // Process all items in parallel
    const promises = items.map(async (item) => {
      try {
        await processor(item)
        return { status: "success" as const, id: item.id }
      } catch (error) {
        return {
          status: "failed" as const,
          id: item.id,
          error: formatBulkOperationError(item.id, error, operation),
        }
      }
    })

    const settledResults = await Promise.allSettled(promises)

    settledResults.forEach((result) => {
      if (result.status === "fulfilled") {
        const value = result.value
        if (value.status === "success") {
          results.successful.push(value.id)
        } else {
          results.failed.push({ imageId: value.id, error: value.error })
        }
      }
    })
  }

  return results
}

/**
 * OpenStack Glance Image Format Compatibility Matrix
 * Official reference: https://docs.openstack.org/glance/latest/
 *
 * disk_format: The actual format of the underlying virtual machine image
 * container_format: The container format used to encapsulate the disk image
 */

/**
 * Official OpenStack Glance compatibility matrix
 * Maps each disk_format to its compatible container_formats
 *
 * Reference table:
 * ┌────────────┬──────────────────────────────────┬─────────────┐
 * │disk_format │ compatible container_formats     │ Recommended │
 * ├────────────┼──────────────────────────────────┼─────────────┤
 * │ qcow2      │ bare, ova, docker                │ bare        │
 * │ raw        │ bare, ova, docker                │ bare        │
 * │ vmdk       │ bare, ova                        │ bare        │
 * │ vhd        │ bare, ova                        │ bare        │
 * │ vhdx       │ bare, ova                        │ bare        │
 * │ vdi        │ bare, ova                        │ bare        │
 * │ iso        │ bare                             │ bare        │
 * │ ami        │ ami                              │ ami         │
 * │ aki        │ aki                              │ aki         │
 * │ ari        │ ari                              │ ari         │
 * │ ploop      │ bare                             │ bare        │
 * └────────────┴──────────────────────────────────┴─────────────┘
 */
export const diskFormatCompatibility: Record<string, string[]> = {
  // QEMU Emulator - Recommended for OpenStack/KVM
  qcow2: ["bare", "ova", "docker"],

  // Uncompressed disk image
  raw: ["bare", "ova", "docker"],

  // VMware Virtual Machine Disk format
  vmdk: ["bare", "ova"],

  // Microsoft Virtual Hard Disk format
  vhd: ["bare", "ova"],

  // Microsoft Virtual Hard Disk Extended format
  vhdx: ["bare", "ova"],

  // Oracle VirtualBox Virtual Disk Image
  vdi: ["bare", "ova"],

  // Optical Disk Image - only bare container
  iso: ["bare"],

  // Amazon Machine Image - only ami container
  ami: ["ami"],

  // Amazon Kernel Image - only aki container
  aki: ["aki"],

  // Amazon Ramdisk Image - only ari container
  ari: ["ari"],

  // Virtuozzo/Parallels Loopback Disk
  ploop: ["bare"],
}

/**
 * Default (recommended) container_format for each disk_format
 * These are the best practice selections based on OpenStack documentation
 */
export const defaultContainerFormat: Record<string, string> = {
  // QEMU - Recommended bare for OpenStack KVM deployments
  qcow2: "bare",

  // Raw - Bare is most compatible
  raw: "bare",

  // VMware - Bare for OpenStack compatibility
  vmdk: "bare",

  // Hyper-V - Bare for OpenStack compatibility
  vhd: "bare",

  // Hyper-V Extended - Bare for OpenStack compatibility
  vhdx: "bare",

  // VirtualBox - Bare for OpenStack compatibility
  vdi: "bare",

  // ISO - Only bare available
  iso: "bare",

  // Amazon - Only ami available
  ami: "ami",

  // Amazon - Only aki available
  aki: "aki",

  // Amazon - Only ari available
  ari: "ari",

  // Parallels - Bare is the only option
  ploop: "bare",
}

/**
 * Get all compatible container formats for a given disk format
 * @param diskFormat - The disk format to check
 * @returns Array of compatible container formats, empty array if disk_format not found
 *
 * @example
 * getCompatibleContainerFormats('qcow2') // Returns: ['bare', 'ova', 'docker']
 * getCompatibleContainerFormats('iso')   // Returns: ['bare']
 * getCompatibleContainerFormats('ami')   // Returns: ['ami']
 */
export function getCompatibleContainerFormats(diskFormat: string): string[] {
  return diskFormatCompatibility[diskFormat] || []
}

/**
 * Get the recommended (default) container format for a given disk format
 * @param diskFormat - The disk format to check
 * @returns The recommended container format, or empty string if disk_format not found
 *
 * @example
 * getDefaultContainerFormat('qcow2') // Returns: 'bare'
 * getDefaultContainerFormat('vmdk')  // Returns: 'bare'
 * getDefaultContainerFormat('ami')   // Returns: 'ami'
 */
export function getDefaultContainerFormat(diskFormat: string): string {
  return defaultContainerFormat[diskFormat] || ""
}

/**
 * Check if a disk_format and container_format combination is valid
 * @param diskFormat - The disk format to validate
 * @param containerFormat - The container format to validate
 * @returns true if the combination is valid, false otherwise
 *
 * @example
 * isValidFormatCombination('qcow2', 'bare')   // Returns: true
 * isValidFormatCombination('qcow2', 'ova')    // Returns: true
 * isValidFormatCombination('iso', 'docker')   // Returns: false
 */
export function isValidFormatCombination(diskFormat: string, containerFormat: string): boolean {
  const compatible = getCompatibleContainerFormats(diskFormat)
  return compatible.includes(containerFormat)
}
