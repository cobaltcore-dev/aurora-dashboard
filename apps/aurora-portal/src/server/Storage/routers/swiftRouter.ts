import { TRPCError } from "@trpc/server"
import { protectedProcedure } from "../../trpc"
import {
  validateSwiftService,
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
  getObjectInputSchema,
  createObjectInputSchema,
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
  ObjectContentResponse,
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
} from "../types/swift"
export const swiftRouter = {
  // ============================================================================
  // SERVICE OPERATIONS
  // ============================================================================

  /**
   * Gets Swift service information and capabilities from /info endpoint
   * This provides information about supported features, limits, and configuration
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
   * Lists containers in an account with optional filtering and pagination
   */
  listContainers: protectedProcedure
    .input(listContainersInputSchema)
    .query(async ({ input, ctx }): Promise<ContainerSummary[]> => {
      return withErrorHandling(async () => {
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
   * Gets account metadata including container count, object count, and bytes used
   */
  getAccountMetadata: protectedProcedure
    .input(getAccountMetadataInputSchema)
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
   * Updates account metadata
   */
  updateAccountMetadata: protectedProcedure
    .input(updateAccountMetadataInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, metadata, removeMetadata, tempUrlKey, tempUrlKey2 } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers = buildAccountMetadataHeaders(metadata, removeMetadata, tempUrlKey, tempUrlKey2)
        const accountPath = account || ""

        await swift.post(accountPath, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "update account metadata" })
        })

        return true
      }, "update account metadata")
    }),

  /**
   * Deletes an account (requires reseller admin privileges)
   */
  deleteAccount: protectedProcedure
    .input(deleteAccountInputSchema)
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
   * Lists objects in a container with optional filtering and pagination
   */
  listObjects: protectedProcedure
    .input(listObjectsInputSchema)
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
   * Creates a container with optional metadata and settings
   */
  createContainer: protectedProcedure
    .input(createContainerInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container, ...options } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers = buildContainerMetadataHeaders(options)

        const accountPath = account || ""
        const url = accountPath ? `${accountPath}/${encodeURIComponent(container)}` : encodeURIComponent(container)

        await swift.put(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "create container", container })
        })

        return true
      }, "create container")
    }),

  /**
   * Gets container metadata
   */
  getContainerMetadata: protectedProcedure
    .input(getContainerMetadataInputSchema)
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
   * Updates container metadata
   */
  updateContainerMetadata: protectedProcedure
    .input(updateContainerMetadataInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { account, container, ...options } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        const headers = buildContainerMetadataHeaders(options)

        const accountPath = account || ""
        const url = accountPath ? `${accountPath}/${encodeURIComponent(container)}` : encodeURIComponent(container)

        await swift.post(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "update container metadata", container })
        })

        return true
      }, "update container metadata")
    }),

  /**
   * Deletes an empty container
   */
  deleteContainer: protectedProcedure
    .input(deleteContainerInputSchema)
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
   */
  emptyContainer: protectedProcedure
    .input(deleteContainerInputSchema)
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
   * Gets an object's content and metadata
   */
  getObject: protectedProcedure
    .input(getObjectInputSchema)
    .query(async ({ input, ctx }): Promise<ObjectContentResponse> => {
      return withErrorHandling(async () => {
        const {
          account,
          container,
          object,
          range,
          ifMatch,
          ifNoneMatch,
          ifModifiedSince,
          ifUnmodifiedSince,
          multipartManifest,
          symlink,
          xNewest,
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
        if (range) headers["Range"] = range
        if (ifMatch) headers["If-Match"] = ifMatch
        if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch
        if (ifModifiedSince) headers["If-Modified-Since"] = ifModifiedSince
        if (ifUnmodifiedSince) headers["If-Unmodified-Since"] = ifUnmodifiedSince
        if (xNewest !== undefined) headers["X-Newest"] = xNewest.toString()

        const response = await swift.get(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "get object", container, object })
        })

        const content = await response.arrayBuffer()
        const metadata = parseObjectMetadata(response.headers)

        return { content, metadata }
      }, "get object")
    }),

  /**
   * Creates or replaces an object with content and metadata
   */
  createObject: protectedProcedure
    .input(createObjectInputSchema)
    .mutation(async ({ input, ctx }): Promise<ObjectMetadata> => {
      return withErrorHandling(async () => {
        const { account, container, object, content, multipartManifest, ...options } = input
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

        // Convert content to appropriate format
        let body: ArrayBuffer | string
        if (typeof content === "string") {
          // If it's a base64 string, convert to ArrayBuffer
          const binaryString = atob(content)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          body = bytes.buffer
        } else if (content instanceof Uint8Array) {
          body = content.buffer
        } else {
          body = content
        }

        const headers = buildObjectMetadataHeaders(options)
        if (!headers["Content-Length"]) {
          headers["Content-Length"] = body instanceof ArrayBuffer ? body.byteLength.toString() : "0"
        }

        const response = await swift.put(url, { body, headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "create object", container, object })
        })

        return parseObjectMetadata(response.headers)
      }, "create object")
    }),

  /**
   * Gets object metadata without downloading the content
   */
  getObjectMetadata: protectedProcedure
    .input(getObjectMetadataInputSchema)
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
   * Updates object metadata without modifying the content
   */
  updateObjectMetadata: protectedProcedure
    .input(updateObjectMetadataInputSchema)
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

        await swift.post(url, { headers }).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "update object metadata", container, object })
        })

        return true
      }, "update object metadata")
    }),

  /**
   * Copies an object to a new location using PUT with X-Copy-From header
   * This is the recommended approach and equivalent to using the COPY HTTP method
   */
  copyObject: protectedProcedure
    .input(copyObjectInputSchema)
    .mutation(async ({ input, ctx }): Promise<ObjectMetadata> => {
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
        const sourcePath = `/${encodeURIComponent(container)}/${encodeURIComponent(object)}`

        // Build query parameters for source URL
        const queryParams = new URLSearchParams()
        if (multipartManifest) {
          queryParams.append("multipart-manifest", multipartManifest)
        }
        if (symlink) {
          queryParams.append("symlink", symlink)
        }

        // Build destination URL
        const accountPath = account || ""
        const destUrl = accountPath ? `${accountPath}${destination}` : destination

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

        // Use PUT to destination with X-Copy-From header
        const response = await swift
          .put(destUrl, {
            headers,
            body: new ArrayBuffer(0), // Empty body required for PUT
          })
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "copy object", container, object })
          })

        return parseObjectMetadata(response.headers)
      }, "copy object")
    }),

  /**
   * Deletes an object
   */
  deleteObject: protectedProcedure.input(deleteObjectInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
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
   * Deletes multiple objects in a single request (up to 10,000)
   */
  bulkDelete: protectedProcedure
    .input(bulkDeleteInputSchema)
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
   * Creates a pseudo-folder by creating a zero-byte marker object
   * Folder paths should end with a trailing slash (e.g., "documents/2024/")
   */
  createFolder: protectedProcedure.input(createFolderInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
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
   * Lists folder contents (folders and objects at current level)
   * Uses delimiter="/" to get pseudo-hierarchical folder structure
   */
  listFolderContents: protectedProcedure
    .input(listFolderContentsInputSchema)
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
   * Moves a folder by copying all objects with the source prefix to the destination
   * This operation can take time for folders with many objects
   */
  moveFolder: protectedProcedure.input(moveFolderInputSchema).mutation(async ({ input, ctx }): Promise<number> => {
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
   * Deletes a folder by deleting all objects with the folder prefix
   * Uses bulk delete for efficiency
   */
  deleteFolder: protectedProcedure.input(deleteFolderInputSchema).mutation(async ({ input, ctx }): Promise<number> => {
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
   * Generates a temporary URL for time-limited object access
   * Requires temp URL key to be configured at account or container level
   */
  generateTempUrl: protectedProcedure
    .input(generateTempUrlInputSchema)
    .mutation(async ({ input, ctx }): Promise<TempUrl> => {
      return withErrorHandling(async () => {
        const { account, container, object, method, expiresIn, filename } = input
        const openstackSession = ctx.openstack
        const swift = openstackSession?.service("swift")

        validateSwiftService(swift)

        // Get account or container metadata to retrieve temp URL key
        const accountPath = account || ""
        const metadataUrl = accountPath
          ? `${accountPath}/${encodeURIComponent(container)}`
          : encodeURIComponent(container)

        const metadataResponse = await swift.head(metadataUrl).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "get temp URL key", container })
        })

        // Try container-level key first, then account-level
        const tempUrlKey =
          metadataResponse.headers.get("x-container-meta-temp-url-key") ||
          metadataResponse.headers.get("x-account-meta-temp-url-key")

        if (!tempUrlKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Temp URL key not configured for this account or container",
          })
        }

        // Calculate expiration timestamp
        const now = Math.floor(Date.now() / 1000)
        const expiresAt = now + expiresIn

        // Build the path for signature calculation
        const objectPath = accountPath
          ? `/${accountPath}/${container}/${object}`
          : `/v1/AUTH_${account || ""}/${container}/${object}`

        // Generate signature
        const signature = await generateTempUrlSignature(tempUrlKey, method, expiresAt, objectPath)

        // Get Swift base URL from the service endpoints
        const endpoints = swift.availableEndpoints()
        const publicEndpoint = endpoints?.find((ep) => ep.interface === "public")
        const swiftBaseUrl = publicEndpoint?.url || ""

        // Construct the temporary URL
        const tempUrl = constructTempUrl(swiftBaseUrl, accountPath || container, object, signature, expiresAt, filename)

        return {
          url: tempUrl,
          expiresAt,
        }
      }, "generate temp URL")
    }),
}
