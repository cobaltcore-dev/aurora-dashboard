import {
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketVersioningCommand,
  GetBucketVersioningCommand,
} from "@aws-sdk/client-s3"
import { cephProtectedProcedure, cephProcedure } from "../../cephProcedure"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"
import { projectScopedInputSchema } from "../../../trpc"
import {
  containerSchema,
  listContainersInputSchema,
  createBucketInputSchema,
  deleteBucketInputSchema,
  headBucketInputSchema,
  bucketStateInputSchema,
  bucketStateOutputSchema,
  type Bucket,
  type S3Status,
  type CreateBucketOutput,
  type BucketState,
} from "../../types/ceph"
import { S3_MAX_KEYS_PER_REQUEST, S3_MAX_SCAN_PAGES } from "../../constants"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"

export const containerRouter = {
  status: cephProcedure.input(projectScopedInputSchema).query(async ({ ctx }): Promise<S3Status> => {
    return { hasCredentials: !!ctx.cephCredentials }
  }),

  /**
   * List all buckets with optional metadata (count, bytes, last_modified).
   *
   * When includeMetadata=false (default): Returns basic bucket info only (fast)
   * When includeMetadata=true: Fetches full metadata with controlled concurrency (slower)
   *
   * Note: Metadata fetching makes one ListObjectsV2 request per bucket, which can be
   * expensive for many buckets. Use includeMetadata=true only when necessary.
   */
  list: cephProtectedProcedure.input(listContainersInputSchema).query(async ({ input, ctx }): Promise<Bucket[]> => {
    const s3 = ctx.getCephClient()
    const { includeMetadata, searchTerm } = input
    try {
      const response = await s3.send(new ListBucketsCommand({}))
      const buckets = response.Buckets ?? []

      // If metadata not requested, return buckets with basic info only (fast path)
      if (!includeMetadata) {
        const basicBuckets = buckets.map((bucket) =>
          containerSchema.parse({
            name: bucket.Name ?? "",
            count: 0,
            bytes: 0,
            last_modified: undefined,
            creationDate: bucket.CreationDate?.toISOString(),
          })
        )
        return filterBySearchParams(basicBuckets, searchTerm, ["name"])
      }

      // Fetch metadata for each bucket with controlled concurrency (slow path)
      // Limit concurrent requests to avoid overwhelming S3 API and hitting rate limits
      const CONCURRENCY_LIMIT = 5
      const bucketsWithMetadata: Bucket[] = []

      for (let i = 0; i < buckets.length; i += CONCURRENCY_LIMIT) {
        const batch = buckets.slice(i, i + CONCURRENCY_LIMIT)
        const batchResults = await Promise.all(
          batch.map(async (bucket) => {
            const bucketName = bucket.Name ?? ""

            try {
              // List objects to get count, total size, and last modified
              // IMPORTANT: Using S3_MAX_KEYS_PER_REQUEST means these are ESTIMATES for buckets with >1000 objects:
              //   - count: Will be capped at 1000 (use KeyCount for actual count up to 1000)
              //   - bytes: Only sums first 1000 objects
              //   - last_modified: May miss newer objects beyond the first 1000
              //
              // This is a deliberate trade-off: fast response time for UI > perfect accuracy.
              // Full pagination would be prohibitively expensive for large buckets in a list view.
              const listObjResponse = await s3.send(
                new ListObjectsV2Command({
                  Bucket: bucketName,
                  MaxKeys: S3_MAX_KEYS_PER_REQUEST,
                })
              )

              const objects = listObjResponse.Contents ?? []
              const count = listObjResponse.KeyCount ?? 0
              const bytes = objects.reduce((sum, obj) => sum + (obj.Size ?? 0), 0)

              // Get last modified from most recent object
              // Objects are typically ordered by key, not date, so we need to find the latest
              const lastModified =
                objects.length > 0
                  ? objects
                      .reduce(
                        (latest, obj) => {
                          const objDate = obj.LastModified
                          if (!objDate) return latest
                          if (!latest || objDate > latest) return objDate
                          return latest
                        },
                        undefined as Date | undefined
                      )
                      ?.toISOString()
                  : undefined

              return containerSchema.parse({
                name: bucketName,
                count,
                bytes,
                last_modified: lastModified,
                creationDate: bucket.CreationDate?.toISOString(),
              })
            } catch (error) {
              // If bucket is inaccessible or listing fails, return minimal data
              console.error(`Failed to get metadata for bucket ${bucketName}:`, error)
              return containerSchema.parse({
                name: bucketName,
                count: 0,
                bytes: 0,
                creationDate: bucket.CreationDate?.toISOString(),
              })
            }
          })
        )
        bucketsWithMetadata.push(...batchResults)
      }

      return filterBySearchParams(bucketsWithMetadata, searchTerm, [
        "name",
        "count",
        "bytes",
        "last_modified",
        "creationDate",
      ])
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, { operation: "list containers" })
    }
  }),

  /**
   * Existence probe for a single bucket — one HeadBucket request, no body.
   *
   * Exists for route guards that must answer "is there such a bucket?" before rendering a
   * bucket page. `list` would answer it too, but ListBuckets only returns buckets the
   * caller *owns*: a bucket reachable through a policy would read as missing. HeadBucket
   * asks about the bucket itself, so 404 means 404 and 403 means 403.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist (SDK error name `NotFound`)
   * @throws TRPCError FORBIDDEN - no credentials, or the bucket exists but is not readable
   */
  head: cephProtectedProcedure.input(headBucketInputSchema).query(async ({ ctx, input }): Promise<{ exists: true }> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input

    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucketName }))
      return { exists: true }
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, {
        operation: "head bucket",
        bucket: bucketName,
      })
    }
  }),

  /**
   * Authoritative bucket emptiness/version state.
   *
   * Replaces three separate client-side probes (`useBucketInfo`, `DeleteBucketModal`,
   * `EmptyBucketModal`) that each read only the first page of `objects.list` and derived
   * `isBucketEmpty`/`hasOldVersionsOrDeleteMarkers` from it — silently wrong for buckets whose
   * first 100 (or 1000) entries don't tell the whole story.
   *
   * Cost, honestly:
   *  - unversioned bucket: **exactly two** requests, whatever its size. Without a version
   *    history there is nothing to scan, so both history flags are false by definition.
   *  - versioned bucket with both an old version (or delete marker) and a surviving real
   *    version: **three** — one page settles both history flags and the scan stops.
   *  - versioned bucket whose history is clean: the scan has nothing to find and no way to know
   *    that early, so it runs to the end of the bucket or to `S3_MAX_SCAN_PAGES`.
   *  - versioned bucket holding *only* delete markers, with no surviving non-current version —
   *    what a `NoncurrentVersionExpiration` lifecycle rule leaves behind once it has expired the
   *    real versions: same cost as the clean-history shape, and for the same reason. The scan
   *    sees `hasOldVersionsOrDeleteMarkers` on page one but can only prove `hasOnlyDeleteMarkers`
   *    by reaching the end, since any later page could still hold a real version.
   *
   * The last two are the shapes that cost real round-trips. Both are bounded, and in both the
   * scan is doing work that has an answer to produce — it is not spinning to re-learn something
   * already known. Callers that force `staleTime: 0` (the two destructive modals, deliberately)
   * pay it on every open.
   *
   * `isEmpty` is deliberately established by its own one-key `ListObjectsV2` rather than by the
   * scan: that command lists current objects only, so it answers emptiness exactly, in one
   * request, on a bucket of any size. That matters beyond speed — emptiness gates "Delete
   * Bucket", and deriving it from a scan that may be truncated left large buckets permanently
   * unconfirmable and therefore permanently undeletable, with a "refresh and try again" that
   * could never succeed.
   *
   * Versioning status is read from S3 here, not taken from client input, so the answer can't be
   * computed against a stale client-cached status. It is also returned raw as `status`, so a
   * caller needing the three-way value has no reason to issue a second `GetBucketVersioning`
   * against `versioning.getStatus` alongside this call.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  getState: cephProtectedProcedure.input(bucketStateInputSchema).query(async ({ ctx, input }): Promise<BucketState> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input
    let status: "Enabled" | "Suspended" | "Unversioned"
    let isVersioningEnabled: boolean
    let isEmpty: boolean
    try {
      const [versioningResponse, currentObjectsResponse] = await Promise.all([
        s3.send(new GetBucketVersioningCommand({ Bucket: bucketName }), { abortSignal: ctx.req.signal }),
        s3.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }), { abortSignal: ctx.req.signal }),
      ])
      status = (versioningResponse.Status as "Enabled" | "Suspended" | undefined) ?? "Unversioned"
      isVersioningEnabled = status === "Enabled" || status === "Suspended"
      isEmpty = (currentObjectsResponse.KeyCount ?? currentObjectsResponse.Contents?.length ?? 0) === 0
    } catch (error) {
      console.error("getState: failed to read bucket versioning status or emptiness", {
        bucket: bucketName,
        error,
      })
      throw mapS3ErrorToTRPCError(error, { operation: "get bucket state", bucket: bucketName })
    }

    if (!isVersioningEnabled) {
      return bucketStateOutputSchema.parse({
        status,
        isVersioningEnabled: false,
        isEmpty,
        hasOnlyDeleteMarkers: false,
        hasOldVersionsOrDeleteMarkers: false,
        isPartialScan: false,
      })
    }

    let hasOldVersionOrDeleteMarker = false
    let hasRealVersion = false
    let anyEntrySeen = false
    let keyMarker: string | undefined
    let versionIdMarker: string | undefined
    let pages = 0
    let isPartialScan = false

    while (true) {
      if (ctx.req.signal?.aborted) {
        isPartialScan = true
        break
      }

      let response
      try {
        response = await s3.send(
          new ListObjectVersionsCommand({
            Bucket: bucketName,
            MaxKeys: S3_MAX_KEYS_PER_REQUEST,
            KeyMarker: keyMarker,
            VersionIdMarker: versionIdMarker,
          }),
          { abortSignal: ctx.req.signal }
        )
      } catch (error) {
        if (ctx.req.signal?.aborted) {
          isPartialScan = true
          break
        }
        console.error("getState: version scan failed", { bucket: bucketName, pages, error })
        throw mapS3ErrorToTRPCError(error, { operation: "get bucket state", bucket: bucketName })
      }

      for (const v of response.Versions ?? []) {
        anyEntrySeen = true
        hasRealVersion = true
        if (!v.IsLatest) {
          hasOldVersionOrDeleteMarker = true
        }
      }

      if ((response.DeleteMarkers?.length ?? 0) > 0) {
        anyEntrySeen = true
        hasOldVersionOrDeleteMarker = true
      }

      pages++

      if (hasOldVersionOrDeleteMarker && hasRealVersion) {
        break
      }

      if (!response.IsTruncated) {
        break
      }

      // Truncated, but S3 handed back no continuation marker. Stopping is mandatory —
      // resuming from the same marker would loop on the same page forever — but it is a
      // stop, not a completed scan: the history past this page stays unread. Collapsing
      // the two left hasOnlyDeleteMarkers below asserted off a single page.
      if (!response.NextKeyMarker) {
        isPartialScan = true
        break
      }

      if (pages >= S3_MAX_SCAN_PAGES) {
        isPartialScan = true
        break
      }

      keyMarker = response.NextKeyMarker
      versionIdMarker = response.NextVersionIdMarker
    }

    return bucketStateOutputSchema.parse({
      status,
      isVersioningEnabled,
      isEmpty,
      hasOnlyDeleteMarkers: !isPartialScan && anyEntrySeen && !hasRealVersion,
      hasOldVersionsOrDeleteMarkers: hasOldVersionOrDeleteMarker,
      isPartialScan,
    })
  }),

  /**
   * Create a new S3 bucket.
   *
   * Uses AWS SDK CreateBucketCommand. The AWS SDK automatically adds LocationConstraint
   * based on the region configured in the S3 client (resolved from OpenStack service catalog).
   *
   * If enableVersioning is true, enables versioning immediately after bucket creation using
   * PutBucketVersioningCommand. If versioning fails, the bucket is still created successfully
   * but the response includes a versioningError field with the error message.
   *
   * Bucket naming rules (validated client-side and by S3 API):
   *   - 3-63 characters
   *   - Lowercase letters, numbers, hyphens, periods only
   *   - Must start/end with letter or number
   *   - DNS-safe (no consecutive periods, not IP address format)
   *   - No reserved prefixes/suffixes
   *
   * @throws TRPCError CONFLICT - bucket already exists
   * @throws TRPCError BAD_REQUEST - invalid bucket name
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  create: cephProtectedProcedure
    .input(createBucketInputSchema)
    .mutation(async ({ ctx, input }): Promise<CreateBucketOutput> => {
      const s3 = ctx.getCephClient()
      const { bucketName, enableVersioning } = input

      try {
        // First, check if bucket already exists by listing all buckets
        // This prevents the confusing "success" response when creating a bucket that already exists
        const listResponse = await s3.send(new ListBucketsCommand({}))
        const existingBucket = listResponse.Buckets?.find((b) => b.Name === bucketName)

        if (existingBucket) {
          throw mapS3ErrorToTRPCError(
            Object.assign(new Error("Bucket already exists"), { Code: "BucketAlreadyExists" }),
            { operation: "create bucket", bucket: bucketName }
          )
        }

        // Create the bucket
        await s3.send(
          new CreateBucketCommand({
            Bucket: bucketName,
          })
        )
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, { operation: "create bucket", bucket: bucketName })
      }

      // Enable versioning if requested (treat as best-effort)
      if (enableVersioning) {
        try {
          await s3.send(
            new PutBucketVersioningCommand({
              Bucket: bucketName,
              VersioningConfiguration: {
                Status: "Enabled",
              },
            })
          )
        } catch (error) {
          // Log warning but don't fail the bucket creation
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.warn(
            `[s3] Bucket '${bucketName}' created successfully, but failed to enable versioning:`,
            errorMessage
          )
          return {
            success: true,
            versioningError: `Failed to enable versioning: ${errorMessage}`,
          }
        }
      }

      return { success: true }
    }),

  /**
   * Delete an empty S3 bucket.
   *
   * Uses AWS SDK DeleteBucketCommand. The bucket must be empty before deletion.
   * If the bucket contains objects, S3 returns BucketNotEmpty error (mapped to PRECONDITION_FAILED).
   *
   * Client-side performs a preflight check to verify the bucket is empty and blocks
   * the delete action if objects are found.
   *
   * @throws TRPCError PRECONDITION_FAILED - bucket not empty
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  delete: cephProtectedProcedure.input(deleteBucketInputSchema).mutation(async ({ ctx, input }): Promise<boolean> => {
    const s3 = ctx.getCephClient()
    const { bucketName } = input

    try {
      await s3.send(new DeleteBucketCommand({ Bucket: bucketName }))
      return true
    } catch (error) {
      throw mapS3ErrorToTRPCError(error, {
        operation: "delete bucket",
        bucket: bucketName,
      })
    }
  }),
}
