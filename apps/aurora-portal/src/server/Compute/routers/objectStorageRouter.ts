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
} from "../helpers/objectStorageHelpers"
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
} from "../types/objectStorage"

export const objectStorageRouter = {
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
          .post(url, {
            body,
            headers: {
              "Content-Type": "text/plain",
            },
          })
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "bulk delete objects" })
          })

        const result = await response.json()

        return {
          numberDeleted: result["Number Deleted"] || 0,
          numberNotFound: result["Number Not Found"] || 0,
          errors:
            result.Errors?.map((err: [string, string]) => ({
              path: err[0],
              status: err[1].split(" ")[0],
              error: err[1],
            })) || [],
        }
      }, "bulk delete objects")
    }),
}
