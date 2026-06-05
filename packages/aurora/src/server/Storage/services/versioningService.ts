import {
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3"
import type { VersioningStatus, ObjectVersion } from "../types/versioning"

/**
 * Input parameters for listing versions (service layer - without project_id)
 */
export interface ListVersionsInput {
  bucket: string
  prefix?: string
  keyMarker?: string
  versionIdMarker?: string
  maxKeys?: number
}

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
 * Service for managing S3 bucket versioning operations.
 *
 * Versioning allows keeping multiple variants of objects in the same bucket,
 * enabling recovery from accidental deletions and overwrites.
 *
 * Key concepts:
 * - Each object version has a unique VersionId
 * - Deleting an object in a versioned bucket creates a "delete marker" (soft delete)
 * - Versions can be restored by copying them to become the new latest version
 * - Once enabled, versioning cannot be fully disabled (only suspended)
 */
export class VersioningService {
  constructor(private s3Client: S3Client) {}

  /**
   * Get current versioning status for a bucket.
   *
   * Returns one of three states:
   * - Unversioned: Versioning has never been configured (S3 returns undefined Status)
   * - Enabled: All new objects get version IDs
   * - Suspended: Stops creating new versions, existing versions preserved
   *
   * @param bucket - The bucket name to check
   * @returns Current versioning status and MFA delete status (if configured)
   */
  async getVersioningStatus(bucket: string): Promise<VersioningStatus> {
    const command = new GetBucketVersioningCommand({ Bucket: bucket })
    const response = await this.s3Client.send(command)

    // S3 returns undefined Status when versioning never configured
    const status = response.Status || "Unversioned"

    return {
      status: status as "Enabled" | "Suspended" | "Unversioned",
      mfaDelete: response.MFADelete,
    }
  }

  /**
   * Enable or suspend versioning on a bucket.
   *
   * Important notes:
   * - Once enabled, versioning cannot be fully disabled (only suspended)
   * - Suspending versioning preserves existing versions but stops creating new ones
   * - New objects uploaded while suspended get a null version ID
   *
   * @param bucket - The bucket name to configure
   * @param status - Either 'Enabled' or 'Suspended'
   */
  async setVersioningStatus(bucket: string, status: "Enabled" | "Suspended"): Promise<void> {
    const command = new PutBucketVersioningCommand({
      Bucket: bucket,
      VersioningConfiguration: {
        Status: status,
      },
    })

    await this.s3Client.send(command)
  }

  /**
   * List all versions of objects in a bucket.
   *
   * Returns both regular versions and delete markers. Supports pagination using
   * S3's dual-marker system (KeyMarker + VersionIdMarker).
   *
   * Pagination:
   * - For first request: don't provide keyMarker or versionIdMarker
   * - For subsequent requests: use nextKeyMarker and nextVersionIdMarker from previous response
   *
   * @param input - Listing parameters including bucket, prefix, and pagination markers
   * @returns List of versions, delete markers, and pagination info
   */
  async listVersions(input: ListVersionsInput): Promise<ListVersionsOutput> {
    const command = new ListObjectVersionsCommand({
      Bucket: input.bucket,
      Prefix: input.prefix,
      KeyMarker: input.keyMarker,
      VersionIdMarker: input.versionIdMarker,
      MaxKeys: input.maxKeys ?? 100,
    })

    const response = await this.s3Client.send(command)

    // Map regular versions
    const versions: ObjectVersion[] = (response.Versions ?? []).map((v) => ({
      key: v.Key!,
      versionId: v.VersionId!,
      isLatest: v.IsLatest ?? false,
      lastModified: v.LastModified!,
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
      lastModified: dm.LastModified!,
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
  }

  /**
   * Permanently delete a specific version of an object.
   *
   * WARNING: This operation is irreversible. The version will be permanently removed.
   *
   * Use cases:
   * - Removing a delete marker to "undelete" an object
   * - Permanently removing old versions to save space
   * - Compliance requirements (data retention policies)
   *
   * @param bucket - The bucket containing the object
   * @param key - The object key
   * @param versionId - The specific version ID to delete
   */
  async deleteVersion(bucket: string, key: string, versionId: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
      VersionId: versionId,
    })

    await this.s3Client.send(command)
  }

  /**
   * Restore a previous version by copying it to become the latest version.
   *
   * How it works:
   * 1. Copies the old version to the same key (without specifying a version ID)
   * 2. This creates a new latest version with the old version's content
   * 3. All versions are preserved (including the old version and the new restored version)
   *
   * Note: S3 doesn't have a native "promote version" operation. This is the standard
   * approach recommended by AWS for version restoration.
   *
   * @param bucket - The bucket containing the object
   * @param key - The object key
   * @param versionId - The version ID to restore
   * @returns The new version ID created by the restore operation
   */
  async restoreVersion(bucket: string, key: string, versionId: string): Promise<string> {
    // Copy the old version to the same key - creates new latest version
    const command = new CopyObjectCommand({
      Bucket: bucket,
      Key: key,
      CopySource: `${bucket}/${key}?versionId=${versionId}`,
    })

    const response = await this.s3Client.send(command)

    // Return the new version ID
    return response.VersionId ?? "null"
  }

  /**
   * Get all versions for a specific object key.
   *
   * This is a convenience method that:
   * 1. Lists all versions with the object key as prefix
   * 2. Filters to exact key matches
   * 3. Combines versions and delete markers
   * 4. Sorts by date descending (newest first)
   *
   * @param bucket - The bucket containing the object
   * @param key - The exact object key to get versions for
   * @returns Array of versions sorted by date (newest first)
   */
  async listObjectVersions(bucket: string, key: string): Promise<ObjectVersion[]> {
    const result = await this.listVersions({
      bucket,
      prefix: key,
    })

    // Filter to exact key match (prefix can return more)
    const exactMatches = [...result.versions, ...result.deleteMarkers].filter((v) => v.key === key)

    // Sort by date descending (newest first)
    return exactMatches.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  }
}
