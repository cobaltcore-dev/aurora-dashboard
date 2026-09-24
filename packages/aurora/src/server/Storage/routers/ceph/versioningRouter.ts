import {
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3"
import { cephProtectedProcedure } from "../../cephProcedure"
import {
  getVersioningStatusInputSchema,
  setVersioningInputSchema,
  listVersionsInputSchema,
  deleteVersionInputSchema,
  restoreVersionInputSchema,
  listObjectVersionsInputSchema,
  type VersioningStatus,
  type ObjectVersion,
  type RestoreVersionOutput,
  checkDeletedContentInputSchema,
  checkDeletedContentOutputSchema,
  type CheckDeletedContentOutput,
} from "../../types/versioning"
import { mapS3ErrorToTRPCError } from "../../helpers/s3ErrorMapper"
import { folderPrefixOf, isFolderCovered, longestCommonPrefix } from "../../helpers/versionScan"
import { S3_MAX_KEYS_PER_REQUEST, S3_MAX_SCAN_PAGES } from "../../constants"

/**
 * Output from listing versions
 */
export interface ListVersionsOutput {
  versions: ObjectVersion[]
  deleteMarkers: ObjectVersion[]
  isTruncated: boolean
  nextKeyMarker?: string
  nextVersionIdMarker?: string
  prefix?: string
  maxKeys?: number
}

/**
 * tRPC router for S3 bucket versioning operations.
 *
 * Provides endpoints for:
 * - Getting and setting bucket versioning status
 * - Listing all versions in a bucket (with pagination)
 * - Listing versions for a specific object
 * - Permanently deleting specific versions
 * - Restoring previous versions
 *
 * All procedures require EC2 credentials (enforced by cephProtectedProcedure).
 */
export const versioningRouter = {
  /**
   * Get versioning status for a bucket.
   *
   * Returns whether versioning is Enabled, Suspended, or Unversioned.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  getStatus: cephProtectedProcedure
    .input(getVersioningStatusInputSchema)
    .query(async ({ ctx, input }): Promise<VersioningStatus> => {
      const s3 = ctx.getCephClient()

      try {
        const response = await s3.send(
          new GetBucketVersioningCommand({
            Bucket: input.bucket,
          })
        )

        // S3 returns undefined Status when versioning never configured
        const status = response.Status || "Unversioned"

        return {
          status: status as "Enabled" | "Suspended" | "Unversioned",
          mfaDelete: response.MFADelete,
        }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "get versioning status",
          bucket: input.bucket,
        })
      }
    }),

  /**
   * Enable or suspend versioning on a bucket.
   *
   * Important: Once enabled, versioning cannot be fully disabled (only suspended).
   * Suspending versioning preserves existing versions but stops creating new ones.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   * @throws TRPCError BAD_REQUEST - invalid request
   */
  setStatus: cephProtectedProcedure
    .input(setVersioningInputSchema)
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const s3 = ctx.getCephClient()

      try {
        await s3.send(
          new PutBucketVersioningCommand({
            Bucket: input.bucket,
            VersioningConfiguration: {
              Status: input.status,
            },
          })
        )

        return { success: true }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "set versioning status",
          bucket: input.bucket,
        })
      }
    }),

  /**
   * List all versions in a bucket (paginated).
   *
   * Returns both regular versions and delete markers. Use pagination markers
   * for buckets with many versions.
   *
   * Pagination:
   * - First request: don't provide keyMarker or versionIdMarker
   * - Subsequent requests: use nextKeyMarker and nextVersionIdMarker from previous response
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  listVersions: cephProtectedProcedure
    .input(listVersionsInputSchema)
    .query(async ({ ctx, input }): Promise<ListVersionsOutput> => {
      const s3 = ctx.getCephClient()

      try {
        const response = await s3.send(
          new ListObjectVersionsCommand({
            Bucket: input.bucket,
            Prefix: input.prefix,
            KeyMarker: input.keyMarker,
            VersionIdMarker: input.versionIdMarker,
            MaxKeys: input.maxKeys ?? 100,
          })
        )

        // Map regular versions
        const versions: ObjectVersion[] = (response.Versions ?? []).map((v) => ({
          key: v.Key!,
          versionId: v.VersionId!,
          isLatest: v.IsLatest ?? false,
          lastModified: v.LastModified!.toISOString(),
          size: v.Size ?? 0,
          storageClass: v.StorageClass,
          owner: v.Owner
            ? {
                displayName: v.Owner.DisplayName,
                id: v.Owner.ID,
              }
            : undefined,
          etag: v.ETag,
          isDeleteMarker: false,
        }))

        // Map delete markers (special versions created when objects are deleted)
        const deleteMarkers: ObjectVersion[] = (response.DeleteMarkers ?? []).map((dm) => ({
          key: dm.Key!,
          versionId: dm.VersionId!,
          isLatest: dm.IsLatest ?? false,
          lastModified: dm.LastModified!.toISOString(),
          size: 0,
          owner: dm.Owner
            ? {
                displayName: dm.Owner.DisplayName,
                id: dm.Owner.ID,
              }
            : undefined,
          isDeleteMarker: true,
        }))

        return {
          versions,
          deleteMarkers,
          isTruncated: response.IsTruncated ?? false,
          nextKeyMarker: response.NextKeyMarker,
          nextVersionIdMarker: response.NextVersionIdMarker,
          prefix: response.Prefix,
          maxKeys: response.MaxKeys,
        }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "list versions",
          bucket: input.bucket,
        })
      }
    }),

  /**
   * List versions for a specific object.
   *
   * Returns all versions (including delete markers) for a single object key,
   * sorted by date descending (newest first).
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  listObjectVersions: cephProtectedProcedure
    .input(listObjectVersionsInputSchema)
    .query(async ({ ctx, input }): Promise<ObjectVersion[]> => {
      const s3 = ctx.getCephClient()

      try {
        const response = await s3.send(
          new ListObjectVersionsCommand({
            Bucket: input.bucket,
            Prefix: input.key,
          })
        )

        // Map regular versions
        const versions: ObjectVersion[] = (response.Versions ?? []).map((v) => ({
          key: v.Key!,
          versionId: v.VersionId!,
          isLatest: v.IsLatest ?? false,
          lastModified: v.LastModified!.toISOString(),
          size: v.Size ?? 0,
          storageClass: v.StorageClass,
          owner: v.Owner
            ? {
                displayName: v.Owner.DisplayName,
                id: v.Owner.ID,
              }
            : undefined,
          etag: v.ETag,
          isDeleteMarker: false,
        }))

        // Map delete markers
        const deleteMarkers: ObjectVersion[] = (response.DeleteMarkers ?? []).map((dm) => ({
          key: dm.Key!,
          versionId: dm.VersionId!,
          isLatest: dm.IsLatest ?? false,
          lastModified: dm.LastModified!.toISOString(),
          size: 0,
          owner: dm.Owner
            ? {
                displayName: dm.Owner.DisplayName,
                id: dm.Owner.ID,
              }
            : undefined,
          isDeleteMarker: true,
        }))

        // Filter to exact key match (prefix can return more) and combine
        const allVersions = [...versions, ...deleteMarkers].filter((v) => v.key === input.key)

        // Sort by date descending (newest first)
        return allVersions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "list object versions",
          bucket: input.bucket,
          key: input.key,
        })
      }
    }),

  /**
   * Permanently delete a specific version.
   *
   * WARNING: This operation is irreversible. The version will be permanently removed.
   *
   * Use cases:
   * - Removing a delete marker to "undelete" an object
   * - Permanently removing old versions to save space
   * - Compliance requirements (data retention policies)
   *
   * @throws TRPCError NOT_FOUND - version does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  deleteVersion: cephProtectedProcedure
    .input(deleteVersionInputSchema)
    .mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
      const s3 = ctx.getCephClient()

      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: input.bucket,
            Key: input.key,
            VersionId: input.versionId,
          })
        )

        return { success: true }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "delete version",
          bucket: input.bucket,
          key: input.key,
        })
      }
    }),

  /**
   * Restore an old version (makes it the new latest version).
   *
   * How it works:
   * 1. Copies the old version to the same key
   * 2. Creates a new latest version with the old version's content
   * 3. All versions are preserved (including the old and new versions)
   *
   * @returns The new version ID created by the restore operation
   * @throws TRPCError NOT_FOUND - version does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  restoreVersion: cephProtectedProcedure
    .input(restoreVersionInputSchema)
    .mutation(async ({ ctx, input }): Promise<RestoreVersionOutput> => {
      const s3 = ctx.getCephClient()

      try {
        // Copy the old version to the same key - creates new latest version
        // URL-encode both the key and versionId to handle special characters (spaces, +, /, =, etc.)
        const response = await s3.send(
          new CopyObjectCommand({
            Bucket: input.bucket,
            Key: input.key,
            CopySource: `${input.bucket}/${encodeURIComponent(input.key)}?versionId=${encodeURIComponent(input.versionId)}`,
          })
        )

        return {
          success: true,
          versionId: response.VersionId ?? "null",
        }
      } catch (error) {
        throw mapS3ErrorToTRPCError(error, {
          operation: "restore version",
          bucket: input.bucket,
          key: input.key,
        })
      }
    }),

  /**
   * Check if folders contain deleted files (files with delete markers) or if the folder marker itself is deleted.
   *
   * Performs a single paginated, delimiter-less scan of the parent prefix (either the
   * caller-supplied `prefix`, or — for backward compatibility — the longest common prefix of
   * `folders`) and attributes every key it sees to its direct-child folder. This replaces the
   * previous design of one unbounded scan per folder: the union of what N per-folder scans
   * would return is exactly what one scan of their common parent returns, minus "loose" objects
   * that live directly under the parent (which aren't attributed to any folder and are ignored).
   *
   * Cost: at most `S3_MAX_SCAN_PAGES` requests total, independent of how many folders are being
   * checked (as opposed to the old N-scans-for-N-folders behaviour).
   *
   * Honours `ctx.req.signal`: if the caller navigates away mid-scan, the loop stops and returns
   * whatever it has accumulated so far, flagged via `isPartialScan`.
   *
   * `isPartialScan` (per folder) is `true` when the scan hit the page ceiling (or was aborted)
   * before fully covering that folder's key range. It is the caller's job to treat it as
   * "unknown", not as "confirmed empty": `hasDeletedContent: false` together with
   * `isPartialScan: true` means "not fully checked", not "clean". A `true` value for
   * `hasDeletedContent` or `isFolderDeleted` is always reliable, partial scan or not — an
   * incomplete scan can only miss a delete marker, never invent one.
   *
   * @throws TRPCError NOT_FOUND - bucket does not exist
   * @throws TRPCError FORBIDDEN - no credentials or access denied
   */
  checkDeletedContent: cephProtectedProcedure
    .input(checkDeletedContentInputSchema)
    .query(async ({ ctx, input }): Promise<CheckDeletedContentOutput> => {
      const s3 = ctx.getCephClient()
      const scanPrefix = input.prefix ?? longestCommonPrefix(input.folders ?? [])

      interface FolderAccumulator {
        hasDeletedNested: boolean
        isFolderDeleted: boolean
        folderDeleteMarkerVersionId?: string
        folderMarkerVersionId?: string
        folderMarkerLastModified?: number
      }
      const acc = new Map<string, FolderAccumulator>()
      const getOrCreate = (folder: string): FolderAccumulator => {
        let entry = acc.get(folder)
        if (!entry) {
          entry = { hasDeletedNested: false, isFolderDeleted: false }
          acc.set(folder, entry)
        }
        return entry
      }

      let keyMarker: string | undefined
      let versionIdMarker: string | undefined
      let pages = 0
      let stoppedAtKey: string | undefined

      while (true) {
        if (ctx.req.signal?.aborted) {
          stoppedAtKey = keyMarker ?? ""
          break
        }

        let response
        try {
          response = await s3.send(
            new ListObjectVersionsCommand({
              Bucket: input.bucket,
              Prefix: scanPrefix || undefined,
              MaxKeys: S3_MAX_KEYS_PER_REQUEST,
              KeyMarker: keyMarker,
              VersionIdMarker: versionIdMarker,
            }),
            { abortSignal: ctx.req.signal }
          )
        } catch (error) {
          if (ctx.req.signal?.aborted) {
            stoppedAtKey = keyMarker ?? ""
            break
          }
          console.error("checkDeletedContent scan failed", {
            bucket: input.bucket,
            prefix: scanPrefix,
            pages,
            error,
          })
          throw mapS3ErrorToTRPCError(error, {
            operation: "check deleted content",
            bucket: input.bucket,
          })
        }

        for (const v of response.Versions ?? []) {
          const key = v.Key ?? ""
          const folder = folderPrefixOf(key, scanPrefix)
          if (!folder) continue
          if (key === folder) {
            const entry = getOrCreate(folder)
            const lastModified = v.LastModified?.getTime() ?? 0
            if (entry.folderMarkerVersionId === undefined || lastModified > (entry.folderMarkerLastModified ?? -1)) {
              entry.folderMarkerVersionId = v.VersionId
              entry.folderMarkerLastModified = lastModified
            }
          }
        }

        for (const dm of response.DeleteMarkers ?? []) {
          const key = dm.Key ?? ""
          const folder = folderPrefixOf(key, scanPrefix)
          if (!folder) continue
          const entry = getOrCreate(folder)
          if (key === folder) {
            if (dm.IsLatest) {
              entry.isFolderDeleted = true
              entry.folderDeleteMarkerVersionId = dm.VersionId
            }
          } else if (dm.IsLatest === true) {
            entry.hasDeletedNested = true
          }
        }

        pages++

        if (!response.IsTruncated || !response.NextKeyMarker) {
          stoppedAtKey = undefined
          break
        }

        if (pages >= S3_MAX_SCAN_PAGES) {
          stoppedAtKey = response.NextKeyMarker
          break
        }

        keyMarker = response.NextKeyMarker
        versionIdMarker = response.NextVersionIdMarker
      }

      const folders = input.folders ?? [...acc.keys()]

      return checkDeletedContentOutputSchema.parse(
        folders.map((prefix) => {
          const entry = acc.get(prefix)
          return {
            prefix,
            hasDeletedContent: (entry?.isFolderDeleted ?? false) || (entry?.hasDeletedNested ?? false),
            isFolderDeleted: entry?.isFolderDeleted ?? false,
            folderDeleteMarkerVersionId: entry?.folderDeleteMarkerVersionId,
            folderMarkerVersionId: entry?.folderMarkerVersionId,
            isPartialScan: !isFolderCovered(prefix, stoppedAtKey),
          }
        })
      )
    }),
}
