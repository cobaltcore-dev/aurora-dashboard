import { TRPCError } from "@trpc/server"
import { z } from "zod"
import EventEmitter from "node:events"
import { Readable, Transform } from "node:stream"
import { protectedProcedure, projectScopedProcedure, projectScopedInputSchema } from "../../trpc"
import { octetInputParser } from "@trpc/server/http"
import {
  validateSwiftService,
  validateSwiftUploadInput,
  applyContainerQueryParams,
  applyObjectQueryParams,
  parseAccountInfo,
  parseContainerInfo,
  parseObjectMetadata,
  buildAccountMetadataHeaders,
  buildContainerMetadataHeaders,
  buildObjectMetadataHeaders,
  mapErrorResponseToTRPCError,
  handleZodParsingError,
  withErrorHandling,
  normalizeFolderPath,
  isFolderMarker,
  generateTempUrlSignature,
  constructTempUrl,
} from "../helpers/swiftHelpers"
import {
  listContainersInputSchema,
  updateAccountMetadataInputSchema,
  getAccountMetadataInputSchema,
  deleteAccountInputSchema,
  listObjectsInputSchema,
  createContainerInputSchema,
  updateContainerMetadataInputSchema,
  getContainerMetadataInputSchema,
  deleteContainerInputSchema,
  updateObjectMetadataInputSchema,
  copyObjectInputSchema,
  deleteObjectInputSchema,
  getObjectMetadataInputSchema,
  bulkDeleteInputSchema,
  containersResponseSchema,
  objectsResponseSchema,
  ContainerSummary,
  ObjectSummary,
  AccountInfo,
  ContainerInfo,
  ObjectMetadata,
  BulkDeleteResult,
  serviceInfoSchema,
  ServiceInfo,
  createFolderInputSchema,
  listFolderContentsInputSchema,
  FolderContents,
  moveFolderInputSchema,
  deleteFolderInputSchema,
  TempUrl,
  generateTempUrlInputSchema,
  downloadObjectInputSchema,
} from "../types/swift"

// ============================================================================
// UPLOAD PROGRESS TRACKING
// ============================================================================

const uploadProgressEmitter = new EventEmitter()
uploadProgressEmitter.setMaxListeners(0) // 0 = unlimited; shared across all concurrent uploads

type UploadProgress = { uploaded: number; total: number; percent: number }
const uploadProgressMap = new Map<string, UploadProgress>()

// ============================================================================
// DOWNLOAD PROGRESS TRACKING
// ============================================================================

const downloadProgressEmitter = new EventEmitter()
downloadProgressEmitter.setMaxListeners(0) // 0 = unlimited; shared across all concurrent downloads

type DownloadProgress = { downloaded: number; total: number; percent: number }
const downloadProgressMap = new Map<string, DownloadProgress>()

export const swiftRouter = {
  // ============================================================================
  // SERVICE OPERATIONS
  // ============================================================================

  /**
   * Gets Swift service information and capabilities from /info endpoint.
   * This provides information about supported features, limits, and configuration.
   *
   * Uses protectedProcedure (not project-scoped) because:
   * - /info endpoint returns service-level metadata
   * - No project-specific data is accessed
   * - Available to all authenticated users
   */
  getServiceInfo: protectedProcedure.query(async ({ ctx }): Promise<ServiceInfo> => {
    return withErrorHandling(async () => {
      const openstackSession = ctx.openstack
      const swift = openstackSession?.service("swift")

      validateSwiftService(swift)

      const response = await swift.get("/info").catch((error) => {
        throw mapErrorResponseToTRPCError(error, { operation: "get service info" })
      })

      const parsedData = serviceInfoSchema.safeParse(await response.json())
      if (!parsedData.success) {
        throw handleZodParsingError(parsedData.error, "get service info")
      }

      return parsedData.data
    }, "get service info")
  }),

  // ============================================================================
  // ACCOUNT OPERATIONS
  // ============================================================================

  /**
   * Lists containers in an account with optional filtering and pagination.
   *
   * Uses projectScopedProcedure because:
   * - Containers belong to projects (OpenStack maps project → Swift account)
   * - Requires project-scoped token to list containers in that project's account
   * - The optional 'account' parameter allows cross-account access for admin users
   */
  listContainers: projectScopedProcedure
    .input(projectScopedInputSchema.extend(listContainersInputSchema.shape))
    .query(async ({ input, ctx }): Promise<ContainerSummary[]> => {
      return withErrorHandling(async () => {
        // Extract project_id - used for rescoping, not for OpenStack API
        const { account, xNewest, ...queryInput } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Build query parameters
        const queryParams = new URLSearchParams()
        applyContainerQueryParams(queryParams, queryInput)

        // Build headers
        const headers: Record<string, string> = {}
        if (xNewest !== undefined) {
          headers["X-Newest"] = xNewest.toString()
        }

        // Build URL - account is optional, defaults to authenticated account
        const accountPath = account || ""
        const url = accountPath ? `${accountPath}?${queryParams.toString()}` : `?${queryParams.toString()}`

        const response = await swift.get(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list containers" })
        })

        // Handle empty response (204 No Content)
        if (response.status === 204) {
          return []
        }

        const parsedData = containersResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "list containers")
        }

        return parsedData.data
      }, "list containers")
    }),

  /**
   * Gets account metadata including container count, object count, and bytes used.
   *
   * Uses projectScopedProcedure because:
   * - Account metadata reflects the project's storage usage and configuration
   * - Requires project-scoped token to access project-specific account data
   */
  getAccountMetadata: projectScopedProcedure
    .input(projectScopedInputSchema.extend(getAccountMetadataInputSchema.shape))
    .query(async ({ input, ctx }): Promise<AccountInfo> => {
      return withErrorHandling(async () => {
        const { account, xNewest } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers: Record<string, string> = {}
        if (xNewest !== undefined) {
          headers["X-Newest"] = xNewest.toString()
        }

        const accountPath = account || ""
        const response = await swift.head(accountPath, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "get account metadata" })
        })

        return parseAccountInfo(response.headers)
      }, "get account metadata")
    }),

  /**
   * Updates account metadata.
   *
   * Uses projectScopedProcedure because:
   * - Modifies project-specific account settings and metadata
   * - Requires project-scoped token to update account configuration
   */
  updateAccountMetadata: projectScopedProcedure
    .input(projectScopedInputSchema.extend(updateAccountMetadataInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, metadata, removeMetadata, tempUrlKey, tempUrlKey2 } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers = buildAccountMetadataHeaders(metadata, removeMetadata, tempUrlKey, tempUrlKey2)
        const accountPath = account || ""

        await swift.post(accountPath, undefined, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "update account metadata" })
        })

        return true
      }, "update account metadata")
    }),

  /**
   * Deletes an account (requires reseller admin privileges).
   *
   * Uses projectScopedProcedure because:
   * - Deletes a project-specific account
   * - Requires project-scoped token (and admin role) for account deletion
   */
  deleteAccount: projectScopedProcedure
    .input(projectScopedInputSchema.extend(deleteAccountInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const accountPath = account || ""
        await swift.del(accountPath).catch((error) => {
          throw mapErrorResponseToTRPCError(error, {
            operation: "delete account",
            additionalInfo: "requires reseller admin privileges",
          })
        })

        return true
      }, "delete account")
    }),

  // ============================================================================
  // CONTAINER OPERATIONS
  // ============================================================================

  /**
   * Lists objects in a container with optional filtering and pagination.
   *
   * Uses projectScopedProcedure because:
   * - Containers belong to projects
   * - Requires project-scoped token to list objects within a project's container
   */
  listObjects: projectScopedProcedure
    .input(projectScopedInputSchema.extend(listObjectsInputSchema.shape))
    .query(async ({ input, ctx }): Promise<ObjectSummary[]> => {
      return withErrorHandling(async () => {
        const { account, container, xNewest, ...queryInput } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Build query parameters
        const queryParams = new URLSearchParams()
        applyObjectQueryParams(queryParams, queryInput)

        // Build headers
        const headers: Record<string, string> = {}
        if (xNewest !== undefined) {
          headers["X-Newest"] = xNewest.toString()
        }

        // Build URL
        const accountPath = account || ""
        const url = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}?${queryParams.toString()}`
          : `${encodeURIComponent(container)}?${queryParams.toString()}`

        const response = await swift.get(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list objects", container })
        })

        // Handle empty response (204 No Content)
        if (response.status === 204) {
          return []
        }

        const parsedData = objectsResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "list objects")
        }

        return parsedData.data
      }, "list objects")
    }),

  /**
   * Creates a container with optional metadata and settings.
   *
   * Uses projectScopedProcedure because:
   * - Containers are project resources
   * - Requires project-scoped token to create containers
   */
  createContainer: projectScopedProcedure
    .input(projectScopedInputSchema.extend(createContainerInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container, ...options } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers = buildContainerMetadataHeaders(options)

        const accountPath = account || ""
        const url = accountPath ? `${accountPath}/${encodeURIComponent(container)}` : encodeURIComponent(container)

        await swift.put(url, undefined, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "create container", container })
        })

        return true
      }, "create container")
    }),

  /**
   * Gets container metadata.
   *
   * Uses projectScopedProcedure because:
   * - Container metadata is project-specific
   * - Requires project-scoped token to access container information
   */
  getContainerMetadata: projectScopedProcedure
    .input(projectScopedInputSchema.extend(getContainerMetadataInputSchema.shape))
    .query(async ({ input, ctx }): Promise<ContainerInfo> => {
      return withErrorHandling(async () => {
        const { account, container, xNewest } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers: Record<string, string> = {}
        if (xNewest !== undefined) {
          headers["X-Newest"] = xNewest.toString()
        }

        const accountPath = account || ""
        const url = accountPath ? `${accountPath}/${encodeURIComponent(container)}` : encodeURIComponent(container)

        const response = await swift.head(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "get container metadata", container })
        })

        return parseContainerInfo(response.headers)
      }, "get container metadata")
    }),

  /**
   * Updates container metadata.
   *
   * Uses projectScopedProcedure because:
   * - Modifies project-specific container settings
   * - Requires project-scoped token to update container metadata
   */
  updateContainerMetadata: projectScopedProcedure
    .input(projectScopedInputSchema.extend(updateContainerMetadataInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container, ...options } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers = buildContainerMetadataHeaders(options)

        const accountPath = account || ""
        const url = accountPath ? `${accountPath}/${encodeURIComponent(container)}` : encodeURIComponent(container)

        await swift.post(url, undefined, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "update container metadata", container })
        })

        return true
      }, "update container metadata")
    }),

  /**
   * Returns the public URL for a container (derived from the service catalog public endpoint).
   *
   * Uses projectScopedProcedure because:
   * - Container public URLs are project-specific
   * - Requires project-scoped token to access the correct service endpoint
   */
  getContainerPublicUrl: projectScopedProcedure
    .input(projectScopedInputSchema.extend(getContainerMetadataInputSchema.shape))
    .query(async ({ input, ctx }): Promise<string | null> => {
      return withErrorHandling(async () => {
        const { container } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const endpoints = swift.availableEndpoints()
        const publicEndpoint = endpoints?.find((ep) => ep.interface === "public")
        if (!publicEndpoint?.url) return null

        const base = publicEndpoint.url.replace(/\/$/, "")
        return `${base}/${encodeURIComponent(container)}/`
      }, "get container public URL")
    }),

  /**
   * Deletes an empty container.
   *
   * Uses projectScopedProcedure because:
   * - Containers are project resources
   * - Requires project-scoped token to delete project containers
   */
  deleteContainer: projectScopedProcedure
    .input(projectScopedInputSchema.extend(deleteContainerInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const accountPath = account || ""
        const url = accountPath ? `${accountPath}/${encodeURIComponent(container)}` : encodeURIComponent(container)

        await swift.del(url).catch((error) => {
          throw mapErrorResponseToTRPCError(error, {
            operation: "delete container",
            container,
            additionalInfo: "container must be empty",
          })
        })

        return true
      }, "delete container")
    }),

  /**
   * Empties a container by deleting all of its objects.
   * Checks /info to determine if the bulk_delete middleware is enabled —
   * if so, uses bulk delete for efficiency; otherwise falls back to individual
   * DELETE requests. Paginates through all objects to handle large containers.
   * Returns the total number of deleted objects.
   *
   * Uses projectScopedProcedure because:
   * - Operates on project-owned containers and objects
   * - Requires project-scoped token to delete container contents
   */
  emptyContainer: projectScopedProcedure
    .input(projectScopedInputSchema.extend(deleteContainerInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<number> => {
      return withErrorHandling(async () => {
        const { account, container } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Check if bulk_delete middleware is available
        const infoResponse = await swift.get("/info").catch(() => null)
        const serviceInfo = infoResponse ? await infoResponse.json().catch(() => ({})) : {}
        const hasBulkDelete = "bulk_delete" in serviceInfo

        const accountPath = account || ""
        let totalDeleted = 0
        let marker: string | undefined
        let hasMore = true

        while (hasMore) {
          // List next page of objects
          const queryParams = new URLSearchParams()
          queryParams.append("format", "json")
          if (marker) {
            queryParams.append("marker", marker)
          }

          const listUrl = accountPath
            ? `${accountPath}/${encodeURIComponent(container)}?${queryParams.toString()}`
            : `${encodeURIComponent(container)}?${queryParams.toString()}`

          const listResponse = await swift.get(listUrl).catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "list objects for empty container", container })
          })

          if (listResponse.status === 204) {
            break // Container is already empty
          }

          const objects: ObjectSummary[] = await listResponse.json()

          if (objects.length === 0) {
            break
          }

          if (hasBulkDelete) {
            // Bulk delete — one request per page
            const objectPaths = objects.map((obj) => `/${container}/${obj.name}`)
            const bulkDeleteUrl = accountPath ? `${accountPath}?bulk-delete` : "?bulk-delete"
            const bodyText = objectPaths.join("\n")

            const bulkResponse = await swift
              .post(bulkDeleteUrl, bodyText, {
                headers: {
                  "Content-Type": "text/plain",
                  Accept: "text/plain",
                },
              })
              .catch((error) => {
                throw mapErrorResponseToTRPCError(error, {
                  operation: "bulk delete objects for empty container",
                  container,
                })
              })

            const bulkResultText = await bulkResponse.text()
            const match = bulkResultText.match(/Number Deleted:\s*(\d+)/)
            totalDeleted += match ? parseInt(match[1], 10) : 0
          } else {
            // Individual deletes — guaranteed to work without any middleware
            for (const obj of objects) {
              const objectUrl = accountPath
                ? `${accountPath}/${encodeURIComponent(container)}/${encodeURIComponent(obj.name)}`
                : `${encodeURIComponent(container)}/${encodeURIComponent(obj.name)}`

              await swift.del(objectUrl).catch((error) => {
                throw mapErrorResponseToTRPCError(error, {
                  operation: "delete object for empty container",
                  container,
                  object: obj.name,
                })
              })

              totalDeleted++
            }
          }

          marker = objects[objects.length - 1].name
          hasMore = objects.length > 0
        }

        return totalDeleted
      }, "empty container")
    }),

  // ============================================================================
  // OBJECT OPERATIONS
  // ============================================================================

  /**
   * Gets object metadata without downloading the content.
   *
   * Uses projectScopedProcedure because:
   * - Objects are stored in project-owned containers
   * - Requires project-scoped token to access object metadata
   */
  getObjectMetadata: projectScopedProcedure
    .input(projectScopedInputSchema.extend(getObjectMetadataInputSchema.shape))
    .query(async ({ input, ctx }): Promise<ObjectMetadata> => {
      return withErrorHandling(async () => {
        const {
          account,
          container,
          object,
          multipartManifest,
          symlink,
          xNewest,
          ifMatch,
          ifNoneMatch,
          ifModifiedSince,
          ifUnmodifiedSince,
        } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Build URL with query parameters
        const queryParams = new URLSearchParams()
        if (multipartManifest) {
          queryParams.append("multipart-manifest", multipartManifest)
        }
        if (symlink) {
          queryParams.append("symlink", symlink)
        }

        const accountPath = account || ""
        const basePath = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}/${encodeURIComponent(object)}`
          : `${encodeURIComponent(container)}/${encodeURIComponent(object)}`
        const url = queryParams.toString() ? `${basePath}?${queryParams.toString()}` : basePath

        // Build headers
        const headers: Record<string, string> = {}
        if (xNewest !== undefined) headers["X-Newest"] = xNewest.toString()
        if (ifMatch) headers["If-Match"] = ifMatch
        if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch
        if (ifModifiedSince) headers["If-Modified-Since"] = ifModifiedSince
        if (ifUnmodifiedSince) headers["If-Unmodified-Since"] = ifUnmodifiedSince

        const response = await swift.head(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "get object metadata", container, object })
        })

        return parseObjectMetadata(response.headers)
      }, "get object metadata")
    }),

  /**
   * Updates object metadata without modifying the content.
   *
   * Uses projectScopedProcedure because:
   * - Objects belong to project-owned containers
   * - Requires project-scoped token to update object metadata
   */
  updateObjectMetadata: projectScopedProcedure
    .input(projectScopedInputSchema.extend(updateObjectMetadataInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container, object, ...options } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers = buildObjectMetadataHeaders(options)

        const accountPath = account || ""
        const url = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}/${encodeURIComponent(object)}`
          : `${encodeURIComponent(container)}/${encodeURIComponent(object)}`

        await swift.post(url, undefined, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "update object metadata", container, object })
        })

        return true
      }, "update object metadata")
    }),

  /**
   * Copies an object to a new location using PUT with X-Copy-From header.
   * This is the recommended approach and equivalent to using the COPY HTTP method.
   *
   * Uses projectScopedProcedure because:
   * - Source and destination objects are in project-owned containers
   * - Requires project-scoped token to copy objects within project
   */
  copyObject: projectScopedProcedure
    .input(projectScopedInputSchema.extend(copyObjectInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const {
          account,
          container,
          object,
          destination,
          destinationAccount,
          multipartManifest,
          symlink,
          freshMetadata,
          ...options
        } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Build source path for X-Copy-From header
        // Encode each object path segment individually to preserve "/" separators
        // (pseudo-folder structure). encodeURIComponent on the full name would
        // encode "/" to "%2F", breaking X-Copy-From for nested objects.
        const encodedObjectPath = object
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/")
        const sourcePath = `/${encodeURIComponent(container)}/${encodedObjectPath}`

        // Build query parameters for source URL
        const queryParams = new URLSearchParams()
        if (multipartManifest) {
          queryParams.append("multipart-manifest", multipartManifest)
        }
        if (symlink) {
          queryParams.append("symlink", symlink)
        }

        // Build destination URL as a full URL string so the SDK's buildRequestUrl
        // takes the `path.startsWith("http")` branch and uses `new URL(path)` directly,
        // preserving percent-encoding. Using pathname assignment on a URL object would
        // decode %20 back to spaces before the request is made.
        const endpoints = swift.availableEndpoints()
        const publicEndpoint = endpoints?.find((ep: { interface: string }) => ep.interface === "public")
        if (!publicEndpoint?.url) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Swift public endpoint not found" })
        }
        // Encode each segment of the destination path individually
        const encodedDestination = destination
          .replace(/^\//, "")
          .split("/")
          .map((s) => (s ? encodeURIComponent(s) : s))
          .join("/")

        // Build the destination URL by replacing (not appending) the account segment
        // in the public endpoint URL. The endpoint already contains the account path
        // (e.g. /v1/AUTH_test); if `account` overrides it, swap the last path segment.
        const destEndpoint = new URL(publicEndpoint.url)
        const endpointSegments = destEndpoint.pathname.split("/").filter(Boolean)
        if (account) {
          if (endpointSegments.length > 0) {
            endpointSegments[endpointSegments.length - 1] = account
          } else {
            endpointSegments.push(account)
          }
        }
        const basePath = endpointSegments.join("/")
        destEndpoint.pathname = `/${basePath}/${encodedDestination}`.replace(/\/+$/, "")
        const destUrl = destEndpoint.toString()

        // Build headers - using X-Copy-From approach (equivalent to COPY method)
        const headers: Record<string, string> = {
          "X-Copy-From": queryParams.toString() ? `${sourcePath}?${queryParams.toString()}` : sourcePath,
          "Content-Length": "0",
        }

        if (destinationAccount) {
          headers["X-Copy-From-Account"] = destinationAccount
        }

        if (freshMetadata) {
          headers["X-Fresh-Metadata"] = "true"
        }

        // Add metadata headers for the destination object
        const metadataHeaders = buildObjectMetadataHeaders(options)
        Object.assign(headers, metadataHeaders)

        // Use PUT to destination with X-Copy-From header.
        // Body must be undefined/empty — the copy is server-side via X-Copy-From.
        // Swift returns 201 on success with no meaningful response body.
        await swift.put(destUrl, undefined, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "copy object", container, object })
        })

        return true
      }, "copy object")
    }),

  /**
   * Deletes an object.
   *
   * Uses projectScopedProcedure because:
   * - Objects are stored in project-owned containers
   * - Requires project-scoped token to delete objects
   */
  deleteObject: projectScopedProcedure
    .input(projectScopedInputSchema.extend(deleteObjectInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container, object, multipartManifest } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Build URL with query parameters
        const queryParams = new URLSearchParams()
        if (multipartManifest) {
          queryParams.append("multipart-manifest", multipartManifest)
        }

        const accountPath = account || ""
        const basePath = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}/${encodeURIComponent(object)}`
          : `${encodeURIComponent(container)}/${encodeURIComponent(object)}`
        const url = queryParams.toString() ? `${basePath}?${queryParams.toString()}` : basePath

        await swift.del(url).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "delete object", container, object })
        })

        return true
      }, "delete object")
    }),

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Deletes multiple objects in a single request (up to 10,000).
   *
   * Uses projectScopedProcedure because:
   * - Deletes objects from project-owned containers
   * - Requires project-scoped token for bulk delete operations
   */
  bulkDelete: projectScopedProcedure
    .input(projectScopedInputSchema.extend(bulkDeleteInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<BulkDeleteResult> => {
      return withErrorHandling(async () => {
        const { account, objects } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Build URL
        const accountPath = account || ""
        const url = accountPath ? `${accountPath}?bulk-delete` : "?bulk-delete"

        // Build request body (newline-separated list of object paths)
        const body = objects.join("\n")

        const response = await swift
          .post(url, body, {
            headers: {
              "Content-Type": "text/plain",
              Accept: "text/plain",
            },
          })
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "bulk delete objects" })
          })

        const resultText = await response.text()
        const numberDeleted = parseInt(resultText.match(/Number Deleted:\s*(\d+)/)?.[1] ?? "0", 10)
        const numberNotFound = parseInt(resultText.match(/Number Not Found:\s*(\d+)/)?.[1] ?? "0", 10)

        // Parse errors: each line after "Errors:" is "PATH, STATUS_CODE STATUS_TEXT"
        const errorsMatch = resultText.match(/Errors:\n([\s\S]*)$/)
        const errors = errorsMatch
          ? errorsMatch[1]
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const commaIdx = line.lastIndexOf(", ")
                const path = commaIdx >= 0 ? line.substring(0, commaIdx) : line
                const error = commaIdx >= 0 ? line.substring(commaIdx + 2) : ""
                return { path, status: error.split(" ")[0], error }
              })
          : []

        return {
          numberDeleted,
          numberNotFound,
          errors,
        }
      }, "bulk delete objects")
    }),

  // ============================================================================
  // FOLDER OPERATIONS (PSEUDO-HIERARCHICAL)
  // ============================================================================

  /**
   * Creates a pseudo-folder by creating a zero-byte marker object.
   * Folder paths should end with a trailing slash (e.g., "documents/2024/").
   *
   * Uses projectScopedProcedure because:
   * - Folders are objects in project-owned containers
   * - Requires project-scoped token to create folder markers
   */
  createFolder: projectScopedProcedure
    .input(projectScopedInputSchema.extend(createFolderInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container, folderPath, metadata } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Ensure folder path ends with /
        const normalizedPath = normalizeFolderPath(folderPath)

        const headers: Record<string, string> = {
          "Content-Type": "application/directory",
          "Content-Length": "0",
        }

        // Add custom metadata if provided
        if (metadata) {
          Object.entries(metadata).forEach(([key, value]) => {
            headers[`X-Object-Meta-${key}`] = value
          })
        }

        const accountPath = account || ""
        const url = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}/${encodeURIComponent(normalizedPath)}`
          : `${encodeURIComponent(container)}/${encodeURIComponent(normalizedPath)}`

        await swift
          .put(url, {
            headers,
            body: new ArrayBuffer(0), // Zero-byte object
          })
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "create folder", container, object: normalizedPath })
          })

        return true
      }, "create folder")
    }),

  /**
   * Lists folder contents (folders and objects at current level).
   * Uses delimiter="/" to get pseudo-hierarchical folder structure.
   *
   * Uses projectScopedProcedure because:
   * - Lists contents of project-owned containers
   * - Requires project-scoped token to list folder contents
   */
  listFolderContents: projectScopedProcedure
    .input(projectScopedInputSchema.extend(listFolderContentsInputSchema.shape))
    .query(async ({ input, ctx }): Promise<FolderContents> => {
      return withErrorHandling(async () => {
        const { account, container, folderPath, limit, marker } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Build query parameters with delimiter for folder structure
        const queryParams = new URLSearchParams()
        queryParams.append("format", "json")
        queryParams.append("delimiter", "/")

        if (folderPath) {
          queryParams.append("prefix", normalizeFolderPath(folderPath))
        }
        if (limit !== undefined) {
          queryParams.append("limit", limit.toString())
        }
        if (marker) {
          queryParams.append("marker", marker)
        }

        const accountPath = account || ""
        const url = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}?${queryParams.toString()}`
          : `${encodeURIComponent(container)}?${queryParams.toString()}`

        const response = await swift.get(url).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list folder contents", container })
        })

        // Handle empty response
        if (response.status === 204) {
          return { folders: [], objects: [] }
        }

        const data = await response.json()
        const prefix = folderPath ? normalizeFolderPath(folderPath) : ""

        // Separate folders (subdir entries) from objects
        const folders: Array<{ name: string; path: string }> = []
        const objects: ObjectSummary[] = []

        // Swift API returns either subdir entries (folders) or object entries
        type SwiftListItem =
          | { subdir: string }
          | {
              name: string
              hash: string
              bytes: number
              content_type: string
              last_modified: string
              symlink_path?: string
            }

        data.forEach((item: SwiftListItem) => {
          if ("subdir" in item) {
            // This is a folder
            const folderName = item.subdir.substring(prefix.length).replace(/\/$/, "")
            folders.push({
              name: folderName,
              path: item.subdir,
            })
          } else {
            // This is an object
            // Filter out folder marker objects (zero-byte objects with trailing /)
            if (!isFolderMarker(item.name, item.bytes)) {
              objects.push({
                name: item.name,
                hash: item.hash,
                bytes: item.bytes,
                content_type: item.content_type,
                last_modified: item.last_modified,
                symlink_path: item.symlink_path,
              })
            }
          }
        })

        return { folders, objects }
      }, "list folder contents")
    }),

  /**
   * Moves a folder by copying all objects with the source prefix to the destination.
   * This operation can take time for folders with many objects.
   *
   * Uses projectScopedProcedure because:
   * - Copies and deletes objects in project-owned containers
   * - Requires project-scoped token for folder move operations
   */
  moveFolder: projectScopedProcedure
    .input(projectScopedInputSchema.extend(moveFolderInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<number> => {
      return withErrorHandling(async () => {
        const { account, container, sourcePath, destinationPath, destinationContainer } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const normalizedSource = normalizeFolderPath(sourcePath)
        const normalizedDest = normalizeFolderPath(destinationPath)
        const destContainer = destinationContainer || container

        // List all objects with source prefix
        const queryParams = new URLSearchParams()
        queryParams.append("format", "json")
        queryParams.append("prefix", normalizedSource)

        const accountPath = account || ""
        const listUrl = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}?${queryParams.toString()}`
          : `${encodeURIComponent(container)}?${queryParams.toString()}`

        const listResponse = await swift.get(listUrl).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list objects for move", container })
        })

        if (listResponse.status === 204) {
          return 0 // No objects to move
        }

        const objects: ObjectSummary[] = await listResponse.json()
        let movedCount = 0

        // Copy each object to new location
        for (const obj of objects) {
          const relativePath = obj.name.substring(normalizedSource.length)
          const newObjectName = normalizedDest + relativePath

          // Copy object
          const copyHeaders: Record<string, string> = {
            "X-Copy-From": `/${encodeURIComponent(container)}/${encodeURIComponent(obj.name)}`,
            "Content-Length": "0",
          }

          if (destinationContainer && destinationContainer !== container) {
            copyHeaders["X-Copy-From-Account"] = account || ""
          }

          const destUrl = accountPath
            ? `${accountPath}/${encodeURIComponent(destContainer)}/${encodeURIComponent(newObjectName)}`
            : `${encodeURIComponent(destContainer)}/${encodeURIComponent(newObjectName)}`

          await swift
            .put(destUrl, {
              headers: copyHeaders,
              body: new ArrayBuffer(0),
            })
            .catch((error) => {
              throw mapErrorResponseToTRPCError(error, {
                operation: "copy object during folder move",
                container: destContainer,
                object: newObjectName,
              })
            })

          movedCount++
        }

        // Delete original objects using bulk delete
        const objectPaths = objects.map((obj: ObjectSummary) => `/${container}/${obj.name}`)

        if (objectPaths.length > 0) {
          const bulkDeleteUrl = accountPath ? `${accountPath}?bulk-delete` : "?bulk-delete"
          const body = objectPaths.join("\n")

          await swift
            .post(bulkDeleteUrl, body, {
              headers: {
                "Content-Type": "text/plain",
                Accept: "text/plain",
              },
            })
            .catch((error) => {
              throw mapErrorResponseToTRPCError(error, { operation: "delete original objects after move" })
            })
        }

        return movedCount
      }, "move folder")
    }),

  /**
   * Deletes a folder by deleting all objects with the folder prefix.
   * Uses bulk delete for efficiency.
   *
   * Uses projectScopedProcedure because:
   * - Deletes objects from project-owned containers
   * - Requires project-scoped token for folder deletion
   */
  deleteFolder: projectScopedProcedure
    .input(projectScopedInputSchema.extend(deleteFolderInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<number> => {
      return withErrorHandling(async () => {
        const { account, container, folderPath, recursive } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const normalizedPath = normalizeFolderPath(folderPath)

        // List all objects with folder prefix
        const queryParams = new URLSearchParams()
        queryParams.append("format", "json")
        queryParams.append("prefix", normalizedPath)

        if (!recursive) {
          // Only delete objects at this level (use delimiter)
          queryParams.append("delimiter", "/")
        }

        const accountPath = account || ""
        const listUrl = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}?${queryParams.toString()}`
          : `${encodeURIComponent(container)}?${queryParams.toString()}`

        const listResponse = await swift.get(listUrl).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list objects for deletion", container })
        })

        if (listResponse.status === 204) {
          return 0 // No objects to delete
        }

        const objects: ObjectSummary[] = await listResponse.json()
        const objectPaths = objects.map((obj) => `/${container}/${obj.name}`)

        if (objectPaths.length === 0) {
          return 0
        }

        // Use bulk delete
        const bulkDeleteUrl = accountPath ? `${accountPath}?bulk-delete` : "?bulk-delete"
        const body = objectPaths.join("\n")

        const response = await swift
          .post(bulkDeleteUrl, body, {
            headers: {
              "Content-Type": "text/plain",
              Accept: "text/plain",
            },
          })
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "bulk delete folder contents" })
          })

        const bulkResultText = await response.text()
        const match = bulkResultText.match(/Number Deleted:\s*(\d+)/)
        return match ? parseInt(match[1], 10) : 0
      }, "delete folder")
    }),

  // ============================================================================
  // TEMPORARY URL OPERATIONS
  // ============================================================================

  /**
   * Generates a temporary URL for time-limited object access.
   * Requires temp URL key to be configured at account or container level.
   *
   * Uses projectScopedProcedure because:
   * - Generates URLs for objects in project-owned containers
   * - Requires project-scoped token to access temp URL keys
   */
  generateTempUrl: projectScopedProcedure
    .input(projectScopedInputSchema.extend(generateTempUrlInputSchema.shape))
    .mutation(async ({ input, ctx }): Promise<TempUrl> => {
      return withErrorHandling(async () => {
        const { account, container, object, method, expiresIn, filename } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Resolve the Swift base URL with any account override applied first.
        // This must happen before the HEAD requests so that the key lookup
        // hits the correct account/container — passing bare accountPath as a
        // relative path would cause the SDK to append it to the already
        // account-scoped endpoint, hitting the wrong account.
        const endpoints = swift.availableEndpoints()
        const publicEndpoint = endpoints?.find((ep) => ep.interface === "public")
        if (!publicEndpoint?.url) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Swift public endpoint not found" })
        }

        const tempUrlBase = new URL(publicEndpoint.url)
        if (account) {
          const segments = tempUrlBase.pathname.split("/").filter(Boolean)
          segments[segments.length - 1] = account
          tempUrlBase.pathname = `/${segments.join("/")}`
        }
        const swiftBaseUrl = tempUrlBase.toString()
        // swiftBasePath is the pathname without trailing slash, decoded so that
        // HMAC signing uses plain unencoded path segments as Swift expects.
        // e.g. "/v1/AUTH_abc" — used for both HEAD URLs and HMAC path.
        const swiftBasePath = decodeURIComponent(tempUrlBase.pathname).replace(/\/$/, "")

        // Get account or container metadata to retrieve temp URL key.
        // HEAD /container returns only container-level headers — account-level
        // headers are only present on HEAD / (account root), so we need two
        // separate requests when the container key is absent.
        // Use absolute paths derived from swiftBasePath so the account override
        // is correctly reflected in the request URL.
        const containerUrl = `${swiftBasePath}/${encodeURIComponent(container)}`

        const containerMetaResponse = await swift.head(containerUrl).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "get temp URL key", container })
        })

        // Helper: returns the primary key, falling back to the secondary key (-2).
        // Swift supports two keys per container/account for zero-downtime rotation.
        const getTempUrlKey = (headers: Headers, scope: "container" | "account") =>
          headers.get(`x-${scope}-meta-temp-url-key`) ?? headers.get(`x-${scope}-meta-temp-url-key-2`)

        let tempUrlKey = getTempUrlKey(containerMetaResponse.headers, "container")

        // Fall back to account-level key — HEAD the account root
        if (!tempUrlKey) {
          const accountMetaResponse = await swift.head(swiftBasePath).catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "get account temp URL key" })
          })
          tempUrlKey = getTempUrlKey(accountMetaResponse.headers, "account")
        }

        if (!tempUrlKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Temp URL key not configured for this account or container",
          })
        }

        // Calculate expiration timestamp
        const now = Math.floor(Date.now() / 1000)
        const expiresAt = now + expiresIn

        // Derive the object path for HMAC signing from the (possibly overridden) base URL.
        // Swift verifies the signature against the decoded URL path, so this string
        // must contain no percent-encoding — plain slash-separated segments only.
        const objectPath = `${swiftBasePath}/${container}/${object}`

        // Generate signature
        const signature = await generateTempUrlSignature(tempUrlKey, method, expiresAt, objectPath)

        // Construct the temporary URL
        const tempUrl = constructTempUrl(swiftBaseUrl, container, object, signature, expiresAt, filename)

        return {
          url: tempUrl,
          expiresAt,
        }
      }, "generate temp URL")
    }),

  // ============================================================================
  // UPLOAD OPERATIONS
  // ============================================================================

  /**
   * Uploads a file to a Swift container via octet-stream.
   *
   * Uses `octetInputParser` so tRPC passes the request body as a true
   * ReadableStream — never buffered — enabling per-chunk progress tracking
   * via the Transform pipeline identical to imageRouter.uploadImage.
   *
   * Metadata is sent as custom request headers:
   *   - x-upload-project-id (string) — project ID for rescoping (required)
   *   - x-upload-container  (string) — target container name
   *   - x-upload-object     (string) — full object path, e.g. "folder/file.txt"
   *   - x-upload-type       (string, optional) — MIME type detected client-side
   *   - x-upload-size       (string, optional) — file size in bytes
   *   - x-upload-id         (string) — client-computed upload ID for watchUploadProgress
   *   - x-upload-account    (string, optional) — OpenStack account override
   *
   * Progress is tracked via a Node.js Transform stream and emitted through
   * `uploadProgressEmitter` so that concurrent `watchUploadProgress` subscriptions
   * can receive real-time byte counts without polling.
   *
   * The client computes `uploadId` as `"<container>:<objectPath>:<uuid>"` before calling
   * this mutation so the subscription can be opened in advance. The UUID suffix ensures
   * concurrent uploads of the same object do not collide in the progress map.
   * On the BFF, the ID is further scoped with the Keystone project ID before storage.
   *
   * Uses protectedProcedure (not projectScopedProcedure) because:
   * - Special handling required for octetInputParser (file upload streams)
   * - Manual project rescoping performed using x-upload-project-id header
   * - Cannot use standard input schema with binary stream data
   */
  uploadObject: protectedProcedure
    .input(octetInputParser)
    .mutation(async ({ input, ctx }): Promise<{ success: boolean }> => {
      return withErrorHandling(async () => {
        // Manual project rescoping for upload operations
        const headers = ctx.req.headers
        const uploadProjectId = headers["x-upload-project-id"] as string | undefined

        if (!uploadProjectId || uploadProjectId.trim().length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "x-upload-project-id header is required for file uploads",
          })
        }

        // Rescope session to the specified project
        const openstackSession = await ctx.rescopeSession({ projectId: uploadProjectId })
        if (!openstackSession) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to scope session to project. User may not have access to this project.",
          })
        }

        const swift = openstackSession?.service("swift")
        validateSwiftService(swift)

        // Metadata arrives as custom headers — the body is the raw file stream.
        const container = headers["x-upload-container"] as string | undefined
        const object = headers["x-upload-object"] as string | undefined
        const contentType = headers["x-upload-type"] as string | undefined
        const fileSize = headers["x-upload-size"] as string | undefined
        const uploadId = (headers["x-upload-id"] as string | undefined)?.trim()
        const uploadAccount = headers["x-upload-account"] as string | undefined

        // input is a Web ReadableStream — convert to Node.js Readable for .pipe()
        const fileStream = Readable.fromWeb(input as import("stream/web").ReadableStream)

        const { validatedContainer, validatedObject, validatedFileSize, validatedFile } = validateSwiftUploadInput(
          container,
          object,
          fileSize,
          fileStream
        )

        if (!uploadId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "x-upload-id header is required" })
        }

        // Scope the progress key to the project so cross-tenant observation is impossible
        const uploadToken = openstackSession.getToken()
        const scopedProjectId = uploadToken?.tokenData.project?.id ?? "unknown"
        const scopedUploadId = `${scopedProjectId}:${uploadId}`

        uploadProgressMap.set(scopedUploadId, { uploaded: 0, total: validatedFileSize, percent: 0 })

        try {
          const progress = uploadProgressMap.get(scopedUploadId)!

          // Transform stream that observes bytes as they flow through to Swift.
          // No buffering — chunks are passed unmodified; we only count bytes.
          // True streaming because octetInputParser passes the raw HTTP body stream.
          const progressTracker = new Transform({
            async transform(chunk: Buffer, _encoding, callback) {
              progress.uploaded += chunk.length
              progress.percent = progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0

              uploadProgressEmitter.emit(`progress:${scopedUploadId}`, { ...progress })

              // Yield to the event loop so subscriptions can flush between chunks
              await new Promise((resolve) => setTimeout(resolve, 0))

              callback(null, chunk)
            },
          })

          const trackedStream = validatedFile.pipe(progressTracker)
          const webStream = Readable.toWeb(trackedStream)

          // Encode each segment individually to preserve slash separators
          const encodedObject = validatedObject.split("/").map(encodeURIComponent).join("/")
          const url = uploadAccount
            ? `${uploadAccount}/${encodeURIComponent(validatedContainer)}/${encodedObject}`
            : `${encodeURIComponent(validatedContainer)}/${encodedObject}`

          const uploadResponse = await swift.put(url, webStream, {
            headers: {
              "Content-Type": contentType ?? "application/octet-stream",
              ...(validatedFileSize > 0 ? { "Content-Length": validatedFileSize.toString() } : {}),
            },
          })

          if (!uploadResponse?.ok) {
            throw mapErrorResponseToTRPCError(
              uploadResponse as unknown as Parameters<typeof mapErrorResponseToTRPCError>[0],
              {
                operation: "upload object",
                container: validatedContainer,
                object: validatedObject,
              }
            )
          }

          uploadProgressEmitter.emit(`progress:${scopedUploadId}:complete`)

          return { success: true }
        } catch (error) {
          uploadProgressEmitter.emit(`progress:${scopedUploadId}:error`, error)
          throw mapErrorResponseToTRPCError(error as Parameters<typeof mapErrorResponseToTRPCError>[0], {
            operation: "upload object",
            container: container,
            object: object,
          })
        } finally {
          uploadProgressMap.delete(scopedUploadId)
        }
      }, "upload object")
    }),

  /**
   * Subscribes to real-time upload progress for a given `uploadId`.
   *
   * The `uploadId` is computed client-side as `"<container>:<objectPath>:<uuid>"` before
   * the upload mutation is called, so the subscription can be opened in advance.
   * The BFF scopes it with the Keystone project ID so subscribers can only observe
   * their own project's transfers.
   *
   * Yields `{ uploaded, total, percent }` as bytes flow through the server.
   * Completes when the upload finishes or throws if the upload errors.
   */
  watchUploadProgress: protectedProcedure.input(z.object({ uploadId: z.string() })).subscription(async function* ({
    input,
    ctx,
  }) {
    const { uploadId } = input

    // Scope to the project so a user can only observe their own transfers
    const watchUploadToken = ctx.openstack?.getToken()
    const watchUploadProjectId = watchUploadToken?.tokenData.project?.id ?? "unknown"
    const scopedUploadId = `${watchUploadProjectId}:${uploadId}`

    // Emit current snapshot immediately so late subscribers don't miss state
    const current = uploadProgressMap.get(scopedUploadId)
    if (current) {
      yield { ...current }
    }

    const queue: Array<UploadProgress> = []
    let isComplete = false
    let isError = false
    let caughtError: Error | undefined
    let waitResolver: ((value?: unknown) => void) | null = null

    const onProgress = (data: UploadProgress) => {
      queue.push(data)
      waitResolver?.()
      waitResolver = null
    }

    const onComplete = () => {
      isComplete = true
      waitResolver?.()
      waitResolver = null
    }

    const onError = (err: unknown) => {
      isError = true
      caughtError = err instanceof Error ? err : new Error(String(err))
      waitResolver?.()
      waitResolver = null
    }

    uploadProgressEmitter.on(`progress:${scopedUploadId}`, onProgress)
    uploadProgressEmitter.on(`progress:${scopedUploadId}:complete`, onComplete)
    uploadProgressEmitter.on(`progress:${scopedUploadId}:error`, onError)

    try {
      while (!isComplete && !isError) {
        while (queue.length > 0) {
          yield { ...queue.shift()! }
        }

        if (!isComplete && !isError) {
          // Bounded wait: if no events arrive within 30 s the upload has likely
          // already completed and the map entry was deleted before we subscribed.
          // Break rather than hanging forever.
          const timeout = new Promise((resolve) => setTimeout(resolve, 30_000))
          await Promise.race([
            new Promise((resolve) => {
              waitResolver = resolve
            }),
            timeout,
          ])
          if (!isComplete && !isError && queue.length === 0) break
        }
      }

      // Drain any final events that arrived while we were awaiting
      while (queue.length > 0) {
        yield { ...queue.shift()! }
      }

      if (isError && caughtError) {
        throw caughtError
      }
    } finally {
      uploadProgressEmitter.off(`progress:${scopedUploadId}`, onProgress)
      uploadProgressEmitter.off(`progress:${scopedUploadId}:complete`, onComplete)
      uploadProgressEmitter.off(`progress:${scopedUploadId}:error`, onError)
    }
  }),

  // ============================================================================
  // DOWNLOAD OPERATIONS
  // ============================================================================

  /**
   * Downloads a Swift object via the BFF, streaming the content as chunks of
   * base64-encoded data using an async iterable.
   *
   * Why chunked base64 instead of raw binary:
   *   tRPC uses JSON-based SSE transport for iterables, so each yielded value
   *   must be JSON-serializable. We encode each Uint8Array chunk as base64 and
   *   include the content-type + filename only in the first chunk so the client
   *   can begin processing the download immediately, while the server avoids
   *   buffering the full file in memory.
   *
   * Progress tracking:
   *   Per-chunk progress (`downloaded`, `total`, `percent`) is stored in
   *   `downloadProgressMap` and emitted via `downloadProgressEmitter` so that
   *   a concurrent `watchDownloadProgress` subscription can drive a progress bar.
   *   The client computes `downloadId` as `"<container>:<objectPath>:<uuid>"` and passes
   *   it as input before calling this mutation so the subscription can be opened in advance.
   *   The BFF scopes it with the Keystone project ID to prevent cross-tenant observation.
   *
   * Client-side assembly:
   *   Collect all base64 chunks → decode each → concatenate into a single
   *   Uint8Array → wrap in a Blob → trigger <a download>.
   *
   * Current behavior / trade-offs:
   *   - Server never holds the full file in memory
   *   - Data is delivered to the client progressively, enabling download progress
   *   - The current client implementation still buffers the full file before
   *     creating the Blob, so client-side memory usage remains O(file size)
   *
   * Uses projectScopedProcedure because:
   * - Downloads objects from project-owned containers
   * - Requires project-scoped token to access and stream object data
   */
  downloadObject: projectScopedProcedure
    .input(projectScopedInputSchema.extend(downloadObjectInputSchema.shape))
    .mutation(async function* ({ input, ctx }): AsyncGenerator<{
      chunk: string // base64-encoded Uint8Array chunk
      downloaded: number // cumulative bytes received so far
      total: number // total file size in bytes (0 if unknown)
      contentType?: string // only present in first chunk
      filename?: string // only present in first chunk
    }> {
      const { container, object, filename, account, downloadId } = input
      const swift = ctx.openstack?.service("swift")

      validateSwiftService(swift)

      const accountPath = account || ""
      // Encode each segment of the object name individually so that slashes
      // acting as path separators (e.g. "folder/file.txt") are preserved,
      // while other special characters in segment names are still percent-encoded.
      const encodedObject = object.split("/").map(encodeURIComponent).join("/")
      const url = accountPath
        ? `${accountPath}/${encodeURIComponent(container)}/${encodedObject}`
        : `${encodeURIComponent(container)}/${encodedObject}`

      const response = await swift.get(url).catch((error) => {
        throw mapErrorResponseToTRPCError(error, { operation: "download object", container, object })
      })

      const contentType = response.headers.get("content-type") ?? "application/octet-stream"
      // Content-Length may be absent for chunked-transfer responses; treat 0 as unknown
      const total = parseInt(response.headers.get("content-length") ?? "0", 10) || 0

      if (!response.body) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Swift response has no body" })
      }

      // Scope to the project so cross-tenant observation is impossible
      const downloadToken = ctx.openstack?.getToken()
      const downloadProjectId = downloadToken?.tokenData.project?.id ?? "unknown"
      const scopedDownloadId = `${downloadProjectId}:${downloadId}`

      downloadProgressMap.set(scopedDownloadId, { downloaded: 0, total, percent: 0 })

      const reader = response.body.getReader()
      let isFirst = true
      let downloaded = 0

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          downloaded += value.byteLength

          const progress = downloadProgressMap.get(scopedDownloadId)!
          progress.downloaded = downloaded
          progress.percent = total > 0 ? Math.round((downloaded / total) * 100) : 0
          downloadProgressEmitter.emit(`progress:${scopedDownloadId}`, { ...progress })

          // Yield to the event loop so subscriptions can flush between chunks
          await new Promise((resolve) => setTimeout(resolve, 0))

          yield {
            chunk: Buffer.from(value).toString("base64"),
            downloaded,
            total,
            ...(isFirst ? { contentType, filename } : {}),
          }

          isFirst = false
        }

        downloadProgressEmitter.emit(`progress:${scopedDownloadId}:complete`)
      } catch (error) {
        downloadProgressEmitter.emit(`progress:${scopedDownloadId}:error`, error)
        throw mapErrorResponseToTRPCError(error as Parameters<typeof mapErrorResponseToTRPCError>[0], {
          operation: "download object",
          container,
          object,
        })
      } finally {
        downloadProgressMap.delete(scopedDownloadId)
        await reader.cancel()
        reader.releaseLock()
      }
    }),

  /**
   * Subscribes to real-time download progress for a given `downloadId`.
   *
   * The `downloadId` is computed client-side as `"<container>:<objectPath>:<uuid>"` and
   * passed as input to `downloadObject` before the mutation starts, so this subscription
   * is active from the very first byte. The BFF scopes it with the Keystone project ID
   * so subscribers can only observe their own project's transfers.
   *
   * Yields `{ downloaded, total, percent }` as bytes flow through the server.
   * `percent` is 0 when Swift does not send a Content-Length header.
   * Completes when the download finishes or throws if it errors.
   */
  watchDownloadProgress: protectedProcedure.input(z.object({ downloadId: z.string() })).subscription(async function* ({
    input,
    ctx,
  }) {
    const { downloadId } = input

    // Scope to the project so a user can only observe their own transfers
    const watchDownloadToken = ctx.openstack?.getToken()
    const watchDownloadProjectId = watchDownloadToken?.tokenData.project?.id ?? "unknown"
    const scopedDownloadId = `${watchDownloadProjectId}:${downloadId}`

    // Yield current snapshot immediately for late subscribers
    const current = downloadProgressMap.get(scopedDownloadId)
    if (current) {
      yield { ...current }
    }

    const queue: Array<DownloadProgress> = []
    let isComplete = false
    let isError = false
    let caughtError: Error | undefined
    let waitResolver: ((value?: unknown) => void) | null = null

    const onProgress = (data: DownloadProgress) => {
      queue.push(data)
      waitResolver?.()
      waitResolver = null
    }

    const onComplete = () => {
      isComplete = true
      waitResolver?.()
      waitResolver = null
    }

    const onError = (err: unknown) => {
      isError = true
      caughtError = err instanceof Error ? err : new Error(String(err))
      waitResolver?.()
      waitResolver = null
    }

    downloadProgressEmitter.on(`progress:${scopedDownloadId}`, onProgress)
    downloadProgressEmitter.on(`progress:${scopedDownloadId}:complete`, onComplete)
    downloadProgressEmitter.on(`progress:${scopedDownloadId}:error`, onError)

    try {
      while (!isComplete && !isError) {
        while (queue.length > 0) {
          yield { ...queue.shift()! }
        }

        if (!isComplete && !isError) {
          // Bounded wait: if no events arrive within 30 s the download has likely
          // already completed and the map entry was deleted before we subscribed.
          // Break rather than hanging forever.
          const timeout = new Promise((resolve) => setTimeout(resolve, 30_000))
          await Promise.race([
            new Promise((resolve) => {
              waitResolver = resolve
            }),
            timeout,
          ])
          if (!isComplete && !isError && queue.length === 0) break
        }
      }

      // Drain any final events that arrived while we were awaiting
      while (queue.length > 0) {
        yield { ...queue.shift()! }
      }

      if (isError && caughtError) {
        throw caughtError
      }
    } finally {
      downloadProgressEmitter.off(`progress:${scopedDownloadId}`, onProgress)
      downloadProgressEmitter.off(`progress:${scopedDownloadId}:complete`, onComplete)
      downloadProgressEmitter.off(`progress:${scopedDownloadId}:error`, onError)
    }
  }),
}
