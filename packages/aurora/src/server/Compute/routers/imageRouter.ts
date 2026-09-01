import { z } from "zod"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { TRPCError } from "@trpc/server"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import { omit } from "@/server/helpers/object"
import { validateRelativeUrl } from "@/server/helpers/urlValidation"
import EventEmitter from "node:events"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import { projectScopedProcedure, protectedProcedure } from "../../trpc"
import { octetInputParser } from "@trpc/server/http"
import {
  applyImageQueryParams,
  validateGlanceService,
  mapErrorResponseToTRPCError,
  ImageErrorHandlers,
  handleZodParsingError,
  withErrorHandling,
  validateBulkImageIds,
  processBulkOperation,
  validateUploadInput,
  parseMultiValue,
} from "../helpers/imageHelpers"
import {
  imageResponseSchema,
  imageSchema,
  GlanceImage,
  createImageInputSchema,
  updateImageInputSchema,
  updateImageVisibilityInputSchema,
  deleteImageInputSchema,
  ListImagesInput,
  imagesPaginatedResponseSchema,
  ImagesPaginatedResponse,
  imagesPaginatedInputSchema,
  getImageByIdInputSchema,
  deactivateImageInputSchema,
  reactivateImageInputSchema,
  listImageMembersInputSchema,
  getImageMemberInputSchema,
  createImageMemberInputSchema,
  updateImageMemberInputSchema,
  deleteImageMemberInputSchema,
  imageMembersResponseSchema,
  imageMemberSchema,
  ImageMember,
  deleteImagesInputSchema,
  activateImagesInputSchema,
  deactivateImagesInputSchema,
  BulkOperationResult,
  memberStatusSchema,
} from "../types/image"

// Create a global event emitter for upload progress
const uploadProgressEmitter = new EventEmitter()

// Store upload progress
type UploadProgress = { uploaded: number; total: number; percent?: number }
const uploadProgress = new Map<string, UploadProgress>()

export const imageRouter = {
  listImagesWithSearch: projectScopedProcedure
    .input(imagesPaginatedInputSchema)
    .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse> => {
      return withErrorHandling(async () => {
        const { marker, ...queryInput } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Configuration for intelligent pagination
        const FRONTEND_PAGE_SIZE = 50
        const OPENSTACK_PAGE_SIZE = 100
        const MAX_PAGES_TO_SEARCH = 1000 // Safety limit to prevent infinite loops

        const allImages: GlanceImage[] = []
        const hasSearchTerm = queryInput.name && queryInput.name.trim()

        // Build query params - ALWAYS start from beginning (no marker) to get accurate total count
        const queryParams = new URLSearchParams()
        const minimalQuery = {
          sort_key: queryInput.sort_key,
          sort_dir: queryInput.sort_dir,
          sort: queryInput.sort,
          limit: OPENSTACK_PAGE_SIZE,
          // Don't use marker here - we need to fetch ALL images for total count
        }
        applyImageQueryParams(queryParams, minimalQuery as ListImagesInput)

        let currentUrl: string | undefined = `v2/images?${queryParams.toString()}`
        let pageCount = 0

        // Fetch pages from OpenStack - fetch ALL pages to get accurate total count
        while (currentUrl && pageCount < MAX_PAGES_TO_SEARCH) {
          const response = await glance.get(currentUrl).catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "list images" })
          })

          const parsedData = imagesPaginatedResponseSchema.safeParse(await response.json())
          if (!parsedData.success) {
            throw handleZodParsingError(parsedData.error, "list images")
          }

          allImages.push(...parsedData.data.images)
          pageCount++

          // Continue fetching all pages for accurate total count
          currentUrl = parsedData.data.next
        }

        // Apply BFF-side filtering to all collected images
        let filteredImages = allImages

        // Filter by name (search)
        if (hasSearchTerm) {
          filteredImages = filterBySearchParams(filteredImages, queryInput.name, ["name"])
        }

        // Filter by visibility (unless "all")
        if (queryInput.visibility && queryInput.visibility !== "all") {
          filteredImages = filteredImages.filter((img) => img.visibility === queryInput.visibility)
        }

        // Filter by status (supports multi-value "in:active,queued" format)
        if (queryInput.status) {
          const statusValues = parseMultiValue(queryInput.status)
          filteredImages = filteredImages.filter((img) => statusValues.includes(img.status ?? ""))
        }

        // Filter by disk_format (supports multi-value "in:qcow2,raw" format)
        if (queryInput.disk_format) {
          const diskFormatValues = parseMultiValue(queryInput.disk_format)
          filteredImages = filteredImages.filter((img) => diskFormatValues.includes(img.disk_format ?? ""))
        }

        // Filter by container_format (supports multi-value "in:bare,ovf" format)
        if (queryInput.container_format) {
          const containerFormatValues = parseMultiValue(queryInput.container_format)
          filteredImages = filteredImages.filter((img) => containerFormatValues.includes(img.container_format ?? ""))
        }

        // Filter by protected ("true" / "false" string)
        if (queryInput.protected !== undefined && queryInput.protected !== null) {
          const wantProtected = queryInput.protected === "true"
          filteredImages = filteredImages.filter((img) => !!img.protected === wantProtected)
        }

        // Filter by owner
        if (queryInput.owner) {
          filteredImages = filteredImages.filter((img) => img.owner === queryInput.owner)
        }

        // Apply marker-based pagination: if marker provided, skip all images before it
        let startIndex = 0
        if (marker) {
          const markerIndex = filteredImages.findIndex((img) => img.id === marker)
          // Start from the image AFTER the marker
          startIndex = markerIndex >= 0 ? markerIndex + 1 : 0
        }

        // Implement frontend pagination
        const endIndex = startIndex + FRONTEND_PAGE_SIZE
        const paginatedImages = filteredImages.slice(startIndex, endIndex)

        // We have all images, so we know the exact total
        const hasMore = endIndex < filteredImages.length
        const nextPageMarker = hasMore ? filteredImages[endIndex - 1]?.id : undefined

        return {
          images: paginatedImages,
          first: undefined,
          next: hasMore ? nextPageMarker : undefined,
          schema: "/v2/schemas/images",
          totalCount: filteredImages.length,
        }
      }, "list images")
    }),

  listImagesWithPagination: projectScopedProcedure
    .input(imagesPaginatedInputSchema)
    .query(async ({ input, ctx }): Promise<ImagesPaginatedResponse> => {
      return withErrorHandling(async () => {
        const { first, next, ...queryInput } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Security: Reject absolute (or scheme-relative) URLs to prevent SSRF attacks
        validateRelativeUrl(first, "pagination URL")
        validateRelativeUrl(next, "pagination URL")

        // Always fetch ALL images from OpenStack (no pagination)
        const allImages: GlanceImage[] = []

        // Fetch all images without filters (except sorting) - we'll filter in BFF
        const queryParams = new URLSearchParams()
        const minimalQuery = {
          sort_key: queryInput.sort_key,
          sort_dir: queryInput.sort_dir,
          sort: queryInput.sort,
          limit: undefined, // Remove limit to fetch all pages
        }
        applyImageQueryParams(queryParams, minimalQuery as ListImagesInput)

        // Use first, next, or build URL from params
        let currentUrl: string | undefined = first || next || `v2/images?${queryParams.toString()}`
        let pageCount = 0
        const MAX_PAGES = 1000 // Safety limit to prevent infinite loops

        // Fetch all pages from OpenStack
        while (currentUrl && pageCount < MAX_PAGES) {
          const response = await glance.get(currentUrl).catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "list images with pagination" })
          })

          const parsedData = imagesPaginatedResponseSchema.safeParse(await response.json())
          if (!parsedData.success) {
            throw handleZodParsingError(parsedData.error, "list images with pagination")
          }

          allImages.push(...parsedData.data.images)
          currentUrl = parsedData.data.next
          pageCount++
        }

        // Apply BFF-side filtering
        let filteredImages = allImages

        // Filter by name (search)
        if (queryInput.name && queryInput.name.trim()) {
          filteredImages = filterBySearchParams(filteredImages, queryInput.name, ["name"])
        }

        // Filter by visibility (unless "all")
        if (queryInput.visibility && queryInput.visibility !== "all") {
          filteredImages = filteredImages.filter((img) => img.visibility === queryInput.visibility)
        }

        // Filter by status (supports multi-value "in:active,queued" format)
        if (queryInput.status) {
          const statusValues = parseMultiValue(queryInput.status)
          filteredImages = filteredImages.filter((img) => statusValues.includes(img.status ?? ""))
        }

        // Filter by disk_format (supports multi-value "in:qcow2,raw" format)
        if (queryInput.disk_format) {
          const diskFormatValues = parseMultiValue(queryInput.disk_format)
          filteredImages = filteredImages.filter((img) => diskFormatValues.includes(img.disk_format ?? ""))
        }

        // Filter by container_format (supports multi-value "in:bare,ovf" format)
        if (queryInput.container_format) {
          const containerFormatValues = parseMultiValue(queryInput.container_format)
          filteredImages = filteredImages.filter((img) => containerFormatValues.includes(img.container_format ?? ""))
        }

        // Filter by protected ("true" / "false" string)
        if (queryInput.protected !== undefined && queryInput.protected !== null) {
          const wantProtected = queryInput.protected === "true"
          filteredImages = filteredImages.filter((img) => !!img.protected === wantProtected)
        }

        // Filter by owner
        if (queryInput.owner) {
          filteredImages = filteredImages.filter((img) => img.owner === queryInput.owner)
        }

        // Return all filtered results (no pagination)
        return {
          images: filteredImages,
          first: undefined,
          next: undefined,
          schema: "/v2/schemas/images",
        }
      }, "list images with pagination")
    }),

  getImageById: projectScopedProcedure
    .input(getImageByIdInputSchema)
    .query(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.get(`v2/images/${imageId}`).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "fetch image", imageId })
        })

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "fetch image by ID")
        }

        return parsedData.data
      }, "fetch image by ID")
    }),

  createImage: projectScopedProcedure
    .input(createImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const imageData = omit(input, "project_id")
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.post("v2/images", imageData).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "create image" })
        })

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "create image")
        }

        return parsedData.data
      }, "create image")
    }),

  uploadImage: protectedProcedure
    .input(octetInputParser)
    .mutation(async ({ input, ctx }): Promise<{ success: boolean; imageId: string }> => {
      return withErrorHandling(async () => {
        // Metadata arrives as custom headers — the body is the raw file stream.
        // octetInputParser passes the request body as a true ReadableStream without buffering.
        const headers = ctx.req.headers
        const projectId = headers["x-project-id"] as string | undefined
        const imageId = headers["x-upload-id"] as string | undefined
        const fileSize = headers["x-upload-size"] ? parseInt(headers["x-upload-size"] as string, 10) : undefined

        // Validate project_id is present
        if (!projectId || projectId.trim().length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "x-project-id header is required and must be a non-empty string",
          })
        }

        // Rescope the session to the specified project
        // This ensures the upload uses the correct project-scoped token
        const openstackSession = await ctx.rescopeSession({ projectId: projectId.trim() })

        if (!openstackSession) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Failed to rescope session to the specified project. This may happen if the project does not exist or the user does not have access to it.",
          })
        }

        const glance = openstackSession.service("glance")

        // Validate Glance service is available
        validateGlanceService(glance)

        // input is a Web ReadableStream — convert to Node.js Readable for .pipe()
        const fileStream = Readable.fromWeb(input as import("stream/web").ReadableStream)

        // Validate required inputs (imageId, file size and type)
        const { validatedImageId, validatedFileSize, validatedFile } = validateUploadInput(
          imageId,
          fileSize,
          fileStream
        )

        // Initialize progress tracking with project scoping
        const token = openstackSession.getToken()
        const tokenProjectId = token?.tokenData.project?.id

        if (!tokenProjectId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Project scope required for upload progress tracking",
          })
        }

        const scopedUploadId = `${tokenProjectId}:${validatedImageId}`

        uploadProgress.set(scopedUploadId, {
          uploaded: 0,
          total: validatedFileSize,
        })

        try {
          const progress = uploadProgress.get(scopedUploadId)!

          const progressTracker = new Transform({
            transform(chunk: Buffer, _encoding, callback) {
              progress.uploaded += chunk.length
              uploadProgressEmitter.emit(`progress:${scopedUploadId}`, {
                uploaded: progress.uploaded,
                total: progress.total,
                percent: progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0,
              })
              callback(null, chunk)
            },
          })

          // pipeline() propagates stream errors into passthrough → web stream → glance.put,
          // so a read failure reliably rejects the mutation.
          const passthrough = new Transform({
            transform(chunk, _enc, cb) {
              cb(null, chunk)
            },
          })
          const pipelinePromise = pipeline(validatedFile, progressTracker, passthrough)
          // Suppress unhandled-rejection for the case where glance.put throws first
          pipelinePromise.catch(() => {})
          const webStream = Readable.toWeb(passthrough)

          let uploadResponse: Awaited<ReturnType<typeof glance.put>>
          try {
            uploadResponse = await glance.put(`v2/images/${validatedImageId}/file`, webStream, {
              headers: { "Content-Type": "application/octet-stream" },
            })
          } catch (err) {
            // Glance rejected — destroy streams so no further progress events are emitted
            passthrough.destroy()
            progressTracker.destroy()
            throw err
          }

          if (!uploadResponse?.ok) {
            passthrough.destroy()
            progressTracker.destroy()
            throw ImageErrorHandlers.upload(
              uploadResponse as unknown as SignalOpenstackApiError,
              validatedImageId,
              "application/octet-stream"
            )
          }

          uploadProgressEmitter.emit(`progress:${scopedUploadId}:complete`)

          return {
            success: true,
            imageId: validatedImageId,
          }
        } catch (error) {
          uploadProgressEmitter.emit(`progress:${scopedUploadId}:error`, error)

          throw ImageErrorHandlers.upload(
            error as SignalOpenstackApiError,
            validatedImageId,
            "application/octet-stream"
          )
        } finally {
          uploadProgress.delete(scopedUploadId)
        }
      }, "upload image")
    }),

  watchUploadProgress: projectScopedProcedure.input(z.object({ uploadId: z.string() })).subscription(async function* ({
    input,
    ctx,
  }) {
    const uploadId = input.uploadId

    // Security: Reject uploadId containing colons to prevent double-scoping
    if (uploadId.includes(":")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid uploadId format",
      })
    }

    // Security: Verify ownership by scoping to project
    const token = ctx.openstack?.getToken()
    const projectId = token?.tokenData.project?.id

    if (!projectId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Project scope required for upload progress tracking",
      })
    }

    const scopedUploadId = `${projectId}:${uploadId}`

    // Emit current progress state immediately (no delay)
    const current = uploadProgress.get(scopedUploadId)
    if (current) {
      yield {
        ...current,
        percent: current.total > 0 ? Math.round((current.uploaded / current.total) * 100) : 0,
      }
    }

    // Create a queue to bridge EventEmitter events to async generator
    const queue: Array<UploadProgress> = []
    let isComplete = false
    let isError = false
    let error: Error | undefined
    let waitResolver: ((value?: unknown) => void) | null = null

    const onProgress = (data: UploadProgress) => {
      queue.push(data)
      // Wake up the generator immediately when event arrives
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
      error = err instanceof Error ? err : new Error(String(err))
      waitResolver?.()
      waitResolver = null
    }

    // Listen to events from upload chunks (real-time, no polling)
    uploadProgressEmitter.on(`progress:${scopedUploadId}`, onProgress)
    uploadProgressEmitter.on(`progress:${scopedUploadId}:complete`, onComplete)
    uploadProgressEmitter.on(`progress:${scopedUploadId}:error`, onError)

    try {
      // Yield queued events as they arrive
      while (!isComplete && !isError) {
        // Yield all queued events first
        while (queue.length > 0) {
          const progress = queue.shift()!
          yield {
            ...progress,
            percent: progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0,
          }
        }

        // Wait for next event without timeout (truly real-time)
        if (!isComplete && !isError) {
          await new Promise((resolve) => {
            waitResolver = resolve
          })
        }
      }

      // Yield any final queued events
      while (queue.length > 0) {
        const progress = queue.shift()!
        yield {
          ...progress,
          percent: progress.total > 0 ? Math.round((progress.uploaded / progress.total) * 100) : 0,
        }
      }

      // If there was an error, throw it
      if (isError && error) {
        throw error
      }
    } finally {
      // Cleanup listeners
      uploadProgressEmitter.off(`progress:${scopedUploadId}`, onProgress)
      uploadProgressEmitter.off(`progress:${scopedUploadId}:complete`, onComplete)
      uploadProgressEmitter.off(`progress:${scopedUploadId}:error`, onError)
    }
  }),

  updateImage: projectScopedProcedure
    .input(updateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { imageId, operations } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Correct signature: patch(path, values, options)
        // - path: the API endpoint
        // - values: the body content (will be JSON.stringified by client)
        // - options: request options including headers
        const response = await glance
          .patch(
            `v2/images/${imageId}`,
            operations, // Pass operations array directly as the body
            {
              headers: {
                "Content-Type": "application/openstack-images-v2.1-json-patch",
              },
            }
          )
          .catch((error) => {
            throw mapErrorResponseToTRPCError(error, { operation: "update image", imageId })
          })

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "update image")
        }

        return parsedData.data
      }, "update image")
    }),

  updateImageVisibility: projectScopedProcedure
    .input(updateImageVisibilityInputSchema)
    .mutation(async ({ input, ctx }): Promise<GlanceImage> => {
      return withErrorHandling(async () => {
        const { imageId, visibility } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const operations = [
          {
            op: "replace" as const,
            path: "/visibility",
            value: visibility,
          },
        ]

        // Correct signature: patch(path, values, options)
        const response = await glance.patch(
          `v2/images/${imageId}`,
          operations, // Pass operations array directly
          {
            headers: {
              "Content-Type": "application/openstack-images-v2.1-json-patch",
            },
          }
        )

        if (!response?.ok) {
          throw ImageErrorHandlers.visibility(response, imageId, visibility)
        }

        const parsedData = imageSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "update image visibility")
        }

        return parsedData.data
      }, "update image visibility")
    }),

  deleteImage: projectScopedProcedure
    .input(deleteImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.del(`v2/images/${imageId}`)

        if (!response?.ok) {
          throw ImageErrorHandlers.delete(response, imageId)
        }

        return true
      }, "delete image")
    }),

  deactivateImage: projectScopedProcedure
    .input(deactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        await glance.post(`v2/images/${imageId}/actions/deactivate`, undefined).catch((error) => {
          throw mapErrorResponseToTRPCError(error, {
            operation: "deactivate image",
            imageId,
            additionalInfo: "typically admin-only operation",
          })
        })

        return true
      }, "deactivate image")
    }),

  reactivateImage: projectScopedProcedure
    .input(reactivateImageInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        await glance.post(`v2/images/${imageId}/actions/reactivate`, undefined).catch((error) => {
          throw mapErrorResponseToTRPCError(error, {
            operation: "reactivate image",
            imageId,
            additionalInfo: "typically admin-only operation",
          })
        })

        return true
      }, "reactivate image")
    }),

  listImageMembers: projectScopedProcedure
    .input(listImageMembersInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember[]> => {
      return withErrorHandling(async () => {
        const { imageId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.get(`v2/images/${imageId}/members`)

        if (!response?.ok) {
          throw ImageErrorHandlers.member.list(response, imageId)
        }

        const parsedData = imageMembersResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "list image members")
        }

        return parsedData.data.members
      }, "list image members")
    }),

  getImageMember: projectScopedProcedure
    .input(getImageMemberInputSchema)
    .query(async ({ input, ctx }): Promise<ImageMember> => {
      return withErrorHandling(async () => {
        const { imageId, memberId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.get(`v2/images/${imageId}/members/${memberId}`)

        if (!response?.ok) {
          throw ImageErrorHandlers.member.get(response, imageId, memberId)
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "get image member")
        }

        return parsedData.data
      }, "get image member")
    }),

  createImageMember: projectScopedProcedure
    .input(createImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember> => {
      return withErrorHandling(async () => {
        const { imageId, member } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.post(`v2/images/${imageId}/members`, { member })

        if (!response?.ok) {
          throw ImageErrorHandlers.member.create(response, imageId, member)
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "create image member")
        }

        return parsedData.data
      }, "create image member")
    }),

  updateImageMember: projectScopedProcedure
    .input(updateImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<ImageMember> => {
      return withErrorHandling(async () => {
        const { imageId, memberId, status } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.put(`v2/images/${imageId}/members/${memberId}`, { status })

        if (!response?.ok) {
          throw ImageErrorHandlers.member.update(response, imageId, memberId, status)
        }

        const parsedData = imageMemberSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "update image member")
        }

        return parsedData.data
      }, "update image member")
    }),

  deleteImageMember: projectScopedProcedure
    .input(deleteImageMemberInputSchema)
    .mutation(async ({ input, ctx }): Promise<boolean> => {
      return withErrorHandling(async () => {
        const { imageId, memberId } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        const response = await glance.del(`v2/images/${imageId}/members/${memberId}`)

        if (!response?.ok) {
          throw ImageErrorHandlers.member.delete(response, imageId, memberId)
        }

        return true
      }, "delete image member")
    }),

  deleteImages: projectScopedProcedure
    .input(deleteImagesInputSchema)
    .mutation(async ({ input, ctx }): Promise<BulkOperationResult> => {
      return withErrorHandling(async () => {
        const { imageIds } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)
        validateBulkImageIds(imageIds, "delete images")

        // Transform imageIds to items with id property for processBulkOperation
        const items = imageIds.map((id) => ({ id }))

        // Use helper to process deletions in parallel
        return await processBulkOperation(
          items,
          async (item) => {
            const response = await glance.del(`v2/images/${item.id}`)

            if (!response?.ok) {
              throw new Error(`${response?.status || "Unknown error"}`)
            }
          },
          { operation: "delete" }
        )
      }, "delete images")
    }),

  activateImages: projectScopedProcedure
    .input(activateImagesInputSchema)
    .mutation(async ({ input, ctx }): Promise<BulkOperationResult> => {
      return withErrorHandling(async () => {
        const { imageIds } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)
        validateBulkImageIds(imageIds, "activate images")

        // Transform imageIds to items with id property for processBulkOperation
        const items = imageIds.map((id) => ({ id }))

        // Use helper to process activations in parallel
        return await processBulkOperation(
          items,
          async (item) => {
            await glance.post(`v2/images/${item.id}/actions/reactivate`, undefined)
          },
          { operation: "activate" }
        )
      }, "activate images")
    }),

  deactivateImages: projectScopedProcedure
    .input(deactivateImagesInputSchema)
    .mutation(async ({ input, ctx }): Promise<BulkOperationResult> => {
      return withErrorHandling(async () => {
        const { imageIds } = input
        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)
        validateBulkImageIds(imageIds, "deactivate images")

        // Transform imageIds to items with id property for processBulkOperation
        const items = imageIds.map((id) => ({ id }))

        // Use helper to process deactivations in parallel
        return await processBulkOperation(
          items,
          async (item) => {
            await glance.post(`v2/images/${item.id}/actions/deactivate`, undefined)
          },
          { operation: "deactivate" }
        )
      }, "deactivate images")
    }),

  listSharedImagesByMemberStatus: projectScopedProcedure
    .input(
      z.object({
        memberStatus: memberStatusSchema,
        name: z.string().optional(),
        status: z.string().optional(),
        disk_format: z.string().optional(),
        container_format: z.string().optional(),
        protected: z.string().optional(),
        sort: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }): Promise<GlanceImage[]> => {
      return withErrorHandling(async () => {
        const { memberStatus, name, status, disk_format, container_format, protected: protectedFilter, sort } = input

        const openstackSession = ctx.openstack
        const glance = openstackSession?.service("glance")

        validateGlanceService(glance)

        // Get current project ID from token
        const token = openstackSession?.getToken()

        if (!token) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "No valid OpenStack token found" })
        }

        const projectId = token.tokenData.project?.id

        if (!projectId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unable to determine current project ID from OpenStack token",
          })
        }

        // Step 1: Fetch all images with visibility=shared and member_status=("pending" | "accepted" | "rejected")
        const queryParams = new URLSearchParams()
        queryParams.append("visibility", "shared")
        queryParams.append("member_status", memberStatus)
        if (sort) queryParams.append("sort", sort)

        const url = `v2/images?${queryParams.toString()}`
        const response = await glance.get(url).catch((error) => {
          throw mapErrorResponseToTRPCError(error, { operation: "list shared images by member status" })
        })

        const parsedData = imageResponseSchema.safeParse(await response.json())
        if (!parsedData.success) {
          throw handleZodParsingError(parsedData.error, "list shared images by member status")
        }

        // Step 2: Filter out images owned by current project
        let filteredImages = parsedData.data.images.filter((image) => image.owner !== projectId)

        if (filteredImages.length === 0) {
          return []
        }

        // Step 3: Fetch member data for all remaining images using Promise.all
        const imageMembersPromises = filteredImages.map(
          (image) =>
            glance
              .get(`v2/images/${image.id}/members/${projectId}`)
              .then(async (response) => {
                if (response?.ok) {
                  const parsed = imageMemberSchema.safeParse(await response.json())
                  return parsed.success ? parsed.data : null
                }
                return null
              })
              .catch(() => null) // Handle cases where the image member doesn't exist
        )

        const imageMembers = await Promise.all(imageMembersPromises)

        // Step 4: Filter images by member_status
        filteredImages = filteredImages.filter((image, index) => {
          const member = imageMembers[index]
          return member?.status === memberStatus
        })

        // Step 5: Apply BFF-side filters (name search, status, disk_format, container_format, protected)
        if (name) {
          filteredImages = filterBySearchParams(filteredImages, name, ["name"])
        }
        if (status) {
          const statusValues = parseMultiValue(status)
          filteredImages = filteredImages.filter((img) => statusValues.includes(img.status ?? ""))
        }
        if (disk_format) {
          const diskFormatValues = parseMultiValue(disk_format)
          filteredImages = filteredImages.filter((img) => diskFormatValues.includes(img.disk_format ?? ""))
        }
        if (container_format) {
          const containerFormatValues = parseMultiValue(container_format)
          filteredImages = filteredImages.filter((img) => containerFormatValues.includes(img.container_format ?? ""))
        }
        if (protectedFilter !== undefined && protectedFilter !== null) {
          const wantProtected = protectedFilter === "true"
          filteredImages = filteredImages.filter((img) => !!img.protected === wantProtected)
        }

        return filteredImages
      }, "list shared images by member status")
    }),

  getImageMetadataExcludedProperties: projectScopedProcedure.query(({ ctx }): string[] => {
    return ctx.imageMetadataExcludedProperties
  }),
}
