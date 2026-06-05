import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"

// ============================================================================
// VERSIONING STATUS SCHEMAS
// ============================================================================

/**
 * Versioning status schema - represents the current versioning state of a bucket
 *
 * States:
 * - Unversioned: Versioning has never been enabled (default state)
 * - Enabled: All new object uploads receive unique version IDs
 * - Suspended: Stops creating new versions, but existing versions are preserved
 *
 * Note: Once versioning is enabled, it cannot be fully disabled (only suspended)
 */
export const versioningStatusSchema = z.object({
  status: z.enum(["Enabled", "Suspended", "Unversioned"]),
  mfaDelete: z.enum(["Enabled", "Disabled"]).optional(),
})

/**
 * Input schema for enabling or suspending versioning on a bucket
 */
export const setVersioningInputSchema = projectScopedInputSchema.extend({
  bucket: z.string().min(1),
  status: z.enum(["Enabled", "Suspended"]),
})

export const getVersioningStatusInputSchema = projectScopedInputSchema.extend({
  bucket: z.string().min(1),
})

// ============================================================================
// OBJECT VERSION SCHEMAS
// ============================================================================

/**
 * Object version schema - represents a single version of an object
 *
 * Each version has:
 * - Unique versionId
 * - isLatest flag indicating if it's the current version
 * - isDeleteMarker flag indicating if it's a soft delete marker
 *
 * Delete markers are special versions created when an object is deleted in a
 * versioned bucket. They can be removed to "undelete" the object.
 */
export const objectVersionSchema = z.object({
  key: z.string(),
  versionId: z.string(),
  isLatest: z.boolean(),
  lastModified: z.date(),
  size: z.number(),
  storageClass: z.string().optional(),
  owner: z
    .object({
      displayName: z.string().optional(),
      id: z.string().optional(),
    })
    .optional(),
  etag: z.string().optional(),
  isDeleteMarker: z.boolean().default(false),
})

/**
 * Input schema for listing all versions in a bucket
 * Supports pagination using keyMarker and versionIdMarker
 */
export const listVersionsInputSchema = projectScopedInputSchema.extend({
  bucket: z.string().min(1),
  prefix: z.string().optional(),
  keyMarker: z.string().optional(),
  versionIdMarker: z.string().optional(),
  maxKeys: z.number().int().positive().max(1000).optional(),
})

/**
 * Output schema for listing versions
 * Returns both regular versions and delete markers separately
 */
export const listVersionsOutputSchema = z.object({
  versions: z.array(objectVersionSchema),
  deleteMarkers: z.array(objectVersionSchema),
  isTruncated: z.boolean(),
  nextKeyMarker: z.string().optional(),
  nextVersionIdMarker: z.string().optional(),
  prefix: z.string().optional(),
  maxKeys: z.number().optional(),
})

/**
 * Input schema for permanently deleting a specific version
 * WARNING: This operation cannot be undone
 */
export const deleteVersionInputSchema = projectScopedInputSchema.extend({
  bucket: z.string().min(1),
  key: z.string().min(1),
  versionId: z.string().min(1),
})

/**
 * Input schema for restoring a previous version
 * Creates a new version that is a copy of the specified old version
 */
export const restoreVersionInputSchema = projectScopedInputSchema.extend({
  bucket: z.string().min(1),
  key: z.string().min(1),
  versionId: z.string().min(1),
})

/**
 * Output schema for restore operation
 * Returns the new version ID created by the restore
 */
export const restoreVersionOutputSchema = z.object({
  success: z.boolean(),
  versionId: z.string(),
})

/**
 * Input schema for listing versions of a specific object
 */
export const listObjectVersionsInputSchema = projectScopedInputSchema.extend({
  bucket: z.string().min(1),
  key: z.string().min(1),
})

// ============================================================================
// VERSIONING TYPES
// ============================================================================

export type VersioningStatus = z.infer<typeof versioningStatusSchema>
export type ObjectVersion = z.infer<typeof objectVersionSchema>
export type RestoreVersionOutput = z.infer<typeof restoreVersionOutputSchema>

// Note: ListVersionsInput and ListVersionsOutput are defined in the service layer
// to avoid the project_id requirement. The router layer uses the schema versions above.
