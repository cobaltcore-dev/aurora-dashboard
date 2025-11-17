import { TRPCError } from "@trpc/server"
import { ZodError } from "zod"
import {
  ListContainersInput,
  ListObjectsInput,
  AccountInfo,
  ContainerInfo,
  ObjectMetadata,
} from "../types/objectStorage"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"

/**
 * Validates that the OpenStack Swift service is available
 * @param swift - The OpenStack Swift service instance
 * @throws TRPCError if service is not available
 */
export function validateSwiftService(swift: unknown): asserts swift is NonNullable<typeof swift> {
  if (!swift) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to initialize OpenStack Swift (Object Storage) service",
    })
  }
}

/**
 * Applies query parameters for listing containers
 * @param queryParams - URLSearchParams object to modify
 * @param input - Input object containing filtering and pagination parameters
 */
export function applyContainerQueryParams(
  queryParams: URLSearchParams,
  input: Omit<ListContainersInput, "account" | "xNewest">
): void {
  const { limit, marker, end_marker, prefix, delimiter, reverse, format } = input

  if (limit !== undefined) {
    queryParams.append("limit", limit.toString())
  }
  if (marker) {
    queryParams.append("marker", marker)
  }
  if (end_marker) {
    queryParams.append("end_marker", end_marker)
  }
  if (prefix) {
    queryParams.append("prefix", prefix)
  }
  if (delimiter) {
    queryParams.append("delimiter", delimiter)
  }
  if (reverse !== undefined) {
    queryParams.append("reverse", reverse ? "true" : "false")
  }
  if (format) {
    queryParams.append("format", format)
  }
}

/**
 * Applies query parameters for listing objects
 * @param queryParams - URLSearchParams object to modify
 * @param input - Input object containing filtering and pagination parameters
 */
export function applyObjectQueryParams(
  queryParams: URLSearchParams,
  input: Omit<ListObjectsInput, "container" | "account" | "xNewest">
): void {
  const { limit, marker, end_marker, prefix, delimiter, path, reverse, format } = input

  if (limit !== undefined) {
    queryParams.append("limit", limit.toString())
  }
  if (marker) {
    queryParams.append("marker", marker)
  }
  if (end_marker) {
    queryParams.append("end_marker", end_marker)
  }
  if (prefix) {
    queryParams.append("prefix", prefix)
  }
  if (delimiter) {
    queryParams.append("delimiter", delimiter)
  }
  if (path) {
    queryParams.append("path", path)
  }
  if (reverse !== undefined) {
    queryParams.append("reverse", reverse ? "true" : "false")
  }
  if (format) {
    queryParams.append("format", format)
  }
}

/**
 * Parses account metadata from response headers
 * @param headers - Response headers
 * @returns AccountInfo object
 */
export function parseAccountInfo(headers: Headers): AccountInfo {
  const accountInfo: AccountInfo = {
    objectCount: parseInt(headers.get("x-account-object-count") || "0", 10),
    containerCount: parseInt(headers.get("x-account-container-count") || "0", 10),
    bytesUsed: parseInt(headers.get("x-account-bytes-used") || "0", 10),
  }

  // Parse custom metadata
  const metadata: Record<string, string> = {}
  headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-account-meta-")) {
      const metaKey = key.substring(15) // Remove "x-account-meta-" prefix
      metadata[metaKey] = value
    }
  })

  if (Object.keys(metadata).length > 0) {
    accountInfo.metadata = metadata
  }

  // Parse optional fields
  const quotaBytes = headers.get("x-account-meta-quota-bytes")
  if (quotaBytes) {
    accountInfo.quotaBytes = parseInt(quotaBytes, 10)
  }

  const tempUrlKey = headers.get("x-account-meta-temp-url-key")
  if (tempUrlKey) {
    accountInfo.tempUrlKey = tempUrlKey
  }

  const tempUrlKey2 = headers.get("x-account-meta-temp-url-key-2")
  if (tempUrlKey2) {
    accountInfo.tempUrlKey2 = tempUrlKey2
  }

  return accountInfo
}

/**
 * Parses container metadata from response headers
 * @param headers - Response headers
 * @returns ContainerInfo object
 */
export function parseContainerInfo(headers: Headers): ContainerInfo {
  const containerInfo: ContainerInfo = {
    objectCount: parseInt(headers.get("x-container-object-count") || "0", 10),
    bytesUsed: parseInt(headers.get("x-container-bytes-used") || "0", 10),
  }

  // Parse custom metadata
  const metadata: Record<string, string> = {}
  headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-container-meta-")) {
      const metaKey = key.substring(17) // Remove "x-container-meta-" prefix
      if (!metaKey.startsWith("quota-") && !metaKey.startsWith("temp-url-") && !metaKey.startsWith("access-control-")) {
        metadata[metaKey] = value
      }
    }
  })

  if (Object.keys(metadata).length > 0) {
    containerInfo.metadata = metadata
  }

  // Parse optional fields
  const quotaBytes = headers.get("x-container-meta-quota-bytes")
  if (quotaBytes) {
    containerInfo.quotaBytes = parseInt(quotaBytes, 10)
  }

  const quotaCount = headers.get("x-container-meta-quota-count")
  if (quotaCount) {
    containerInfo.quotaCount = parseInt(quotaCount, 10)
  }

  const storagePolicy = headers.get("x-storage-policy")
  if (storagePolicy) {
    containerInfo.storagePolicy = storagePolicy
  }

  const versionsLocation = headers.get("x-versions-location")
  if (versionsLocation) {
    containerInfo.versionsLocation = versionsLocation
  }

  const historyLocation = headers.get("x-history-location")
  if (historyLocation) {
    containerInfo.historyLocation = historyLocation
  }

  const read = headers.get("x-container-read")
  if (read) {
    containerInfo.read = read
  }

  const write = headers.get("x-container-write")
  if (write) {
    containerInfo.write = write
  }

  const syncTo = headers.get("x-container-sync-to")
  if (syncTo) {
    containerInfo.syncTo = syncTo
  }

  const syncKey = headers.get("x-container-sync-key")
  if (syncKey) {
    containerInfo.syncKey = syncKey
  }

  const tempUrlKey = headers.get("x-container-meta-temp-url-key")
  if (tempUrlKey) {
    containerInfo.tempUrlKey = tempUrlKey
  }

  const tempUrlKey2 = headers.get("x-container-meta-temp-url-key-2")
  if (tempUrlKey2) {
    containerInfo.tempUrlKey2 = tempUrlKey2
  }

  return containerInfo
}

/**
 * Parses object metadata from response headers
 * @param headers - Response headers
 * @returns ObjectMetadata object
 */
export function parseObjectMetadata(headers: Headers): ObjectMetadata {
  const metadata: ObjectMetadata = {}

  const contentType = headers.get("content-type")
  if (contentType) {
    metadata.contentType = contentType
  }

  const contentLength = headers.get("content-length")
  if (contentLength) {
    metadata.contentLength = parseInt(contentLength, 10)
  }

  const contentEncoding = headers.get("content-encoding")
  if (contentEncoding) {
    metadata.contentEncoding = contentEncoding
  }

  const contentDisposition = headers.get("content-disposition")
  if (contentDisposition) {
    metadata.contentDisposition = contentDisposition
  }

  const etag = headers.get("etag")
  if (etag) {
    metadata.etag = etag
  }

  const lastModified = headers.get("last-modified")
  if (lastModified) {
    metadata.lastModified = lastModified
  }

  const deleteAt = headers.get("x-delete-at")
  if (deleteAt) {
    metadata.deleteAt = parseInt(deleteAt, 10)
  }

  const objectManifest = headers.get("x-object-manifest")
  if (objectManifest) {
    metadata.objectManifest = objectManifest
  }

  const staticLargeObject = headers.get("x-static-large-object")
  if (staticLargeObject) {
    metadata.staticLargeObject = staticLargeObject.toLowerCase() === "true"
  }

  const symlinkTarget = headers.get("x-symlink-target")
  if (symlinkTarget) {
    metadata.symlinkTarget = symlinkTarget
  }

  const symlinkTargetAccount = headers.get("x-symlink-target-account")
  if (symlinkTargetAccount) {
    metadata.symlinkTargetAccount = symlinkTargetAccount
  }

  // Parse custom metadata
  const customMetadata: Record<string, string> = {}
  headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-object-meta-")) {
      const metaKey = key.substring(14) // Remove "x-object-meta-" prefix
      customMetadata[metaKey] = value
    }
  })

  if (Object.keys(customMetadata).length > 0) {
    metadata.customMetadata = customMetadata
  }

  return metadata
}

/**
 * Builds metadata headers for account operations
 * @param metadata - Metadata object
 * @returns Headers object
 */
export function buildAccountMetadataHeaders(
  metadata?: Record<string, string>,
  removeMetadata?: string[],
  tempUrlKey?: string,
  tempUrlKey2?: string
): Record<string, string> {
  const headers: Record<string, string> = {}

  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      headers[`X-Account-Meta-${key}`] = value
    })
  }

  if (removeMetadata) {
    removeMetadata.forEach((key) => {
      headers[`X-Remove-Account-Meta-${key}`] = "x"
    })
  }

  if (tempUrlKey !== undefined) {
    headers["X-Account-Meta-Temp-URL-Key"] = tempUrlKey
  }

  if (tempUrlKey2 !== undefined) {
    headers["X-Account-Meta-Temp-URL-Key-2"] = tempUrlKey2
  }

  return headers
}

/**
 * Builds metadata headers for container operations
 * @param options - Container metadata options
 * @returns Headers object
 */
export function buildContainerMetadataHeaders(options: {
  metadata?: Record<string, string>
  removeMetadata?: string[]
  read?: string
  write?: string
  versionsLocation?: string
  historyLocation?: string
  removeVersionsLocation?: boolean
  removeHistoryLocation?: boolean
  quotaBytes?: number
  quotaCount?: number
  tempUrlKey?: string
  tempUrlKey2?: string
  storagePolicy?: string
}): Record<string, string> {
  const headers: Record<string, string> = {}

  if (options.metadata) {
    Object.entries(options.metadata).forEach(([key, value]) => {
      headers[`X-Container-Meta-${key}`] = value
    })
  }

  if (options.removeMetadata) {
    options.removeMetadata.forEach((key) => {
      headers[`X-Remove-Container-Meta-${key}`] = "x"
    })
  }

  if (options.read !== undefined) {
    headers["X-Container-Read"] = options.read
  }

  if (options.write !== undefined) {
    headers["X-Container-Write"] = options.write
  }

  if (options.versionsLocation !== undefined) {
    headers["X-Versions-Location"] = options.versionsLocation
  }

  if (options.historyLocation !== undefined) {
    headers["X-History-Location"] = options.historyLocation
  }

  if (options.removeVersionsLocation) {
    headers["X-Remove-Versions-Location"] = "x"
  }

  if (options.removeHistoryLocation) {
    headers["X-Remove-History-Location"] = "x"
  }

  if (options.quotaBytes !== undefined) {
    headers["X-Container-Meta-Quota-Bytes"] = options.quotaBytes.toString()
  }

  if (options.quotaCount !== undefined) {
    headers["X-Container-Meta-Quota-Count"] = options.quotaCount.toString()
  }

  if (options.tempUrlKey !== undefined) {
    headers["X-Container-Meta-Temp-URL-Key"] = options.tempUrlKey
  }

  if (options.tempUrlKey2 !== undefined) {
    headers["X-Container-Meta-Temp-URL-Key-2"] = options.tempUrlKey2
  }

  if (options.storagePolicy !== undefined) {
    headers["X-Storage-Policy"] = options.storagePolicy
  }

  return headers
}

/**
 * Builds metadata headers for object operations
 * @param options - Object metadata options
 * @returns Headers object
 */
export function buildObjectMetadataHeaders(options: {
  metadata?: Record<string, string>
  contentType?: string
  contentEncoding?: string
  contentDisposition?: string
  etag?: string
  deleteAt?: number
  deleteAfter?: number
  objectManifest?: string
  detectContentType?: boolean
  copyFrom?: string
  copyFromAccount?: string
  symlinkTarget?: string
  symlinkTargetAccount?: string
}): Record<string, string> {
  const headers: Record<string, string> = {}

  if (options.metadata) {
    Object.entries(options.metadata).forEach(([key, value]) => {
      headers[`X-Object-Meta-${key}`] = value
    })
  }

  if (options.contentType !== undefined) {
    headers["Content-Type"] = options.contentType
  }

  if (options.contentEncoding !== undefined) {
    headers["Content-Encoding"] = options.contentEncoding
  }

  if (options.contentDisposition !== undefined) {
    headers["Content-Disposition"] = options.contentDisposition
  }

  if (options.etag !== undefined) {
    headers["ETag"] = options.etag
  }

  if (options.deleteAt !== undefined) {
    headers["X-Delete-At"] = options.deleteAt.toString()
  }

  if (options.deleteAfter !== undefined) {
    headers["X-Delete-After"] = options.deleteAfter.toString()
  }

  if (options.objectManifest !== undefined) {
    headers["X-Object-Manifest"] = options.objectManifest
  }

  if (options.detectContentType !== undefined) {
    headers["X-Detect-Content-Type"] = options.detectContentType.toString()
  }

  if (options.copyFrom !== undefined) {
    headers["X-Copy-From"] = options.copyFrom
  }

  if (options.copyFromAccount !== undefined) {
    headers["X-Copy-From-Account"] = options.copyFromAccount
  }

  if (options.symlinkTarget !== undefined) {
    headers["X-Symlink-Target"] = options.symlinkTarget
  }

  if (options.symlinkTargetAccount !== undefined) {
    headers["X-Symlink-Target-Account"] = options.symlinkTargetAccount
  }

  return headers
}

/**
 * Maps Signal OpenStack API Error to appropriate TRPCError instances
 * @param error - The Signal OpenStack API Error
 * @param context - Additional context for error messages
 * @returns TRPCError instance with appropriate code and message
 */
export function mapErrorResponseToTRPCError(
  error: SignalOpenstackApiError,
  context: {
    operation: string
    container?: string
    object?: string
    additionalInfo?: string
  }
): TRPCError {
  const { operation, container, object, additionalInfo } = context
  const baseMessage = `Failed to ${operation}`
  const containerInfo = container ? ` container: ${container}` : ""
  const objectInfo = object ? `, object: ${object}` : ""
  const extraInfo = additionalInfo ? ` - ${additionalInfo}` : ""

  switch (error.statusCode) {
    case 400:
      return new TRPCError({
        code: "BAD_REQUEST",
        message: `${baseMessage}${containerInfo}${objectInfo}${extraInfo}`,
      })

    case 401:
      return new TRPCError({
        code: "UNAUTHORIZED",
        message: `Unauthorized - cannot ${operation}${containerInfo}${objectInfo}`,
      })

    case 403:
      return new TRPCError({
        code: "FORBIDDEN",
        message: `Access forbidden - cannot ${operation}${containerInfo}${objectInfo}${extraInfo}`,
      })

    case 404:
      return new TRPCError({
        code: "NOT_FOUND",
        message: `Resource not found${containerInfo}${objectInfo}`,
      })

    case 409:
      return new TRPCError({
        code: "CONFLICT",
        message: `Conflict - ${operation}${containerInfo}${objectInfo}${extraInfo}`,
      })

    case 413:
      return new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: `Request entity too large${containerInfo}${objectInfo}${extraInfo}`,
      })

    case 422:
      return new TRPCError({
        code: "BAD_REQUEST",
        message: `Unprocessable entity - ETag mismatch${containerInfo}${objectInfo}${extraInfo}`,
      })

    default:
      return new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `${baseMessage}: ${error.message || "Unknown error"}`,
      })
  }
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
    message: `Invalid response format from OpenStack Swift API during ${operation}`,
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
