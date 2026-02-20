import { z } from "zod"

// ============================================================================
// SERVICE INFO SCHEMAS
// ============================================================================

// Service capabilities schema (from /info endpoint)
export const serviceInfoSchema = z.object({
  swift: z.object({
    version: z.string().optional(),
    // Core capabilities
    allow_account_management: z.boolean().optional(),
    account_autocreate: z.boolean().optional(),

    // Storage policies
    policies: z
      .array(
        z.object({
          name: z.string(),
          default: z.boolean().optional(),
        })
      )
      .optional(),

    // Bulk operations
    bulk_delete: z
      .object({
        max_deletes_per_request: z.number(),
        max_failed_deletes: z.number(),
      })
      .optional(),

    bulk_upload: z
      .object({
        max_containers_per_extraction: z.number(),
        max_failed_extractions: z.number(),
      })
      .optional(),

    // Quotas
    container_quotas: z.object({}).optional(),
    account_quotas: z.object({}).optional(),

    // Large objects
    slo: z
      .object({
        max_manifest_segments: z.number(),
        max_manifest_size: z.number(),
        min_segment_size: z.number(),
      })
      .optional(),

    // Temporary URLs
    tempurl: z
      .object({
        methods: z.array(z.string()),
      })
      .optional(),

    // Listing limits
    container_listing_limit: z.number().optional(),
    account_listing_limit: z.number().optional(),
    max_container_name_length: z.number().optional(),
    max_object_name_length: z.number().optional(),
    max_file_size: z.number().optional(),
    max_meta_name_length: z.number().optional(),
    max_meta_value_length: z.number().optional(),
    max_meta_count: z.number().optional(),
    max_meta_overall_size: z.number().optional(),
    max_header_size: z.number().optional(),

    // Additional features
    container_sync: z.object({}).optional(),
    symlink: z.object({}).optional(),
    versioned_writes: z.object({}).optional(),
  }),
})

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const baseAccountInputSchema = z.object({
  account: z.string().optional(), // Optional account name, defaults to authenticated account
})

const baseContainerInputSchema = baseAccountInputSchema.extend({
  container: z.string().min(1).max(256), // Container name (1-256 chars, UTF-8)
})

const baseObjectInputSchema = baseContainerInputSchema.extend({
  object: z.string().min(1), // Object name (UTF-8 encoded)
})

// ============================================================================
// ACCOUNT SCHEMAS
// ============================================================================

// Account metadata schema
export const accountMetadataSchema = z.record(z.string())

// Account info schema (from response headers)
export const accountInfoSchema = z.object({
  objectCount: z.number(),
  containerCount: z.number(),
  bytesUsed: z.number(),
  metadata: accountMetadataSchema.optional(),
  quotaBytes: z.number().optional(),
  tempUrlKey: z.string().optional(),
  tempUrlKey2: z.string().optional(),
})

// Container summary in account listing
export const containerSummarySchema = z.object({
  name: z.string(),
  count: z.number(), // Number of objects in container
  bytes: z.number(), // Total bytes used by container
  last_modified: z.string().optional(),
})

// List containers input schema
export const listContainersInputSchema = baseAccountInputSchema.extend({
  limit: z.number().min(1).max(10000).optional(),
  marker: z.string().optional(),
  end_marker: z.string().optional(),
  prefix: z.string().optional(),
  delimiter: z.string().optional(),
  reverse: z.boolean().optional(),
  format: z.enum(["json", "xml", "plain"]).optional().default("json"),
  xNewest: z.boolean().optional(), // X-Newest header for getting most recent replica
})

// Update account metadata input schema
export const updateAccountMetadataInputSchema = baseAccountInputSchema.extend({
  metadata: z.record(z.string()), // Custom metadata to set/update
  removeMetadata: z.array(z.string()).optional(), // Metadata keys to remove
  tempUrlKey: z.string().optional(),
  tempUrlKey2: z.string().optional(),
})

// Get account metadata input schema
export const getAccountMetadataInputSchema = baseAccountInputSchema.extend({
  xNewest: z.boolean().optional(),
})

// Delete account input schema
export const deleteAccountInputSchema = baseAccountInputSchema

// ============================================================================
// CONTAINER SCHEMAS
// ============================================================================

// Container metadata schema
export const containerMetadataSchema = z.record(z.string())

// Container info schema (from response headers)
export const containerInfoSchema = z.object({
  objectCount: z.number(),
  bytesUsed: z.number(),
  metadata: containerMetadataSchema.optional(),
  quotaBytes: z.number().optional(),
  quotaCount: z.number().optional(),
  storagePolicy: z.string().optional(),
  versionsLocation: z.string().optional(),
  historyLocation: z.string().optional(),
  read: z.string().optional(), // Read ACL
  write: z.string().optional(), // Write ACL
  syncTo: z.string().optional(),
  syncKey: z.string().optional(),
  tempUrlKey: z.string().optional(),
  tempUrlKey2: z.string().optional(),
})

// Object summary in container listing
export const objectSummarySchema = z.object({
  name: z.string(),
  hash: z.string(), // MD5 checksum
  bytes: z.number(),
  content_type: z.string(),
  last_modified: z.string(),
  symlink_path: z.string().optional(), // Only for symlinks
})

// List objects input schema
export const listObjectsInputSchema = baseContainerInputSchema.extend({
  limit: z.number().min(1).max(10000).optional(),
  marker: z.string().optional(),
  end_marker: z.string().optional(),
  prefix: z.string().optional(),
  delimiter: z.string().optional(),
  path: z.string().optional(),
  reverse: z.boolean().optional(),
  format: z.enum(["json", "xml", "plain"]).optional().default("json"),
  xNewest: z.boolean().optional(),
})

// Create container input schema
export const createContainerInputSchema = baseContainerInputSchema.extend({
  metadata: z.record(z.string()).optional(),
  read: z.string().optional(), // Read ACL
  write: z.string().optional(), // Write ACL
  storagePolicy: z.string().optional(),
  versionsLocation: z.string().optional(),
  historyLocation: z.string().optional(),
  quotaBytes: z.number().optional(),
  quotaCount: z.number().optional(),
  tempUrlKey: z.string().optional(),
  tempUrlKey2: z.string().optional(),
})

// Update container metadata input schema
export const updateContainerMetadataInputSchema = baseContainerInputSchema.extend({
  metadata: z.record(z.string()).optional(),
  removeMetadata: z.array(z.string()).optional(),
  read: z.string().optional(),
  write: z.string().optional(),
  versionsLocation: z.string().optional(),
  historyLocation: z.string().optional(),
  removeVersionsLocation: z.boolean().optional(),
  removeHistoryLocation: z.boolean().optional(),
  quotaBytes: z.number().optional(),
  quotaCount: z.number().optional(),
  tempUrlKey: z.string().optional(),
  tempUrlKey2: z.string().optional(),
})

// Get container metadata input schema
export const getContainerMetadataInputSchema = baseContainerInputSchema.extend({
  xNewest: z.boolean().optional(),
})

// Delete container input schema
export const deleteContainerInputSchema = baseContainerInputSchema

// ============================================================================
// OBJECT SCHEMAS
// ============================================================================

// Object metadata schema
export const objectMetadataSchema = z.object({
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
  contentEncoding: z.string().optional(),
  contentDisposition: z.string().optional(),
  etag: z.string().optional(),
  lastModified: z.string().optional(),
  deleteAt: z.number().optional(),
  customMetadata: z.record(z.string()).optional(),
  objectManifest: z.string().optional(), // For dynamic large objects
  staticLargeObject: z.boolean().optional(),
  symlinkTarget: z.string().optional(),
  symlinkTargetAccount: z.string().optional(),
})

// Get object input schema
export const getObjectInputSchema = baseObjectInputSchema.extend({
  range: z.string().optional(), // e.g., "bytes=0-1023"
  ifMatch: z.string().optional(),
  ifNoneMatch: z.string().optional(),
  ifModifiedSince: z.string().optional(),
  ifUnmodifiedSince: z.string().optional(),
  multipartManifest: z.enum(["get"]).optional(), // Get manifest instead of concatenated content
  symlink: z.enum(["get"]).optional(), // Get symlink target instead of following it
  xNewest: z.boolean().optional(), // Query all replicas for most recent
})

// Create/update object input schema
export const createObjectInputSchema = baseObjectInputSchema.extend({
  content: z.instanceof(ArrayBuffer).or(z.instanceof(Uint8Array)).or(z.string()), // Binary data or base64
  contentType: z.string().optional(),
  contentEncoding: z.string().optional(),
  contentDisposition: z.string().optional(),
  etag: z.string().optional(), // MD5 checksum for verification
  deleteAt: z.number().optional(), // Unix timestamp
  deleteAfter: z.number().optional(), // Seconds from now
  metadata: z.record(z.string()).optional(),
  objectManifest: z.string().optional(), // For dynamic large objects
  multipartManifest: z.enum(["put"]).optional(), // For static large objects
  detectContentType: z.boolean().optional(),
  copyFrom: z.string().optional(), // Copy from another object
  copyFromAccount: z.string().optional(),
  symlinkTarget: z.string().optional(), // Create symlink
  symlinkTargetAccount: z.string().optional(),
})

// Update object metadata input schema
export const updateObjectMetadataInputSchema = baseObjectInputSchema.extend({
  metadata: z.record(z.string()).optional(),
  contentType: z.string().optional(),
  contentEncoding: z.string().optional(),
  contentDisposition: z.string().optional(),
  deleteAt: z.number().optional(),
  deleteAfter: z.number().optional(),
})

// Copy object input schema
export const copyObjectInputSchema = baseObjectInputSchema.extend({
  destination: z.string(), // Format: "/container/object"
  destinationAccount: z.string().optional(),
  metadata: z.record(z.string()).optional(), // New metadata for copied object
  contentType: z.string().optional(),
  contentEncoding: z.string().optional(),
  contentDisposition: z.string().optional(),
  freshMetadata: z.boolean().optional(), // Copy without existing metadata
  multipartManifest: z.enum(["get"]).optional(), // Copy manifest instead of concatenated content
  symlink: z.enum(["get"]).optional(), // Copy symlink instead of target
})

// Delete object input schema
export const deleteObjectInputSchema = baseObjectInputSchema.extend({
  multipartManifest: z.enum(["delete"]).optional(), // Delete segments for static large objects
})

// Get object metadata input schema
export const getObjectMetadataInputSchema = baseObjectInputSchema.extend({
  multipartManifest: z.enum(["get"]).optional(),
  symlink: z.enum(["get"]).optional(),
  xNewest: z.boolean().optional(),
  ifMatch: z.string().optional(),
  ifNoneMatch: z.string().optional(),
  ifModifiedSince: z.string().optional(),
  ifUnmodifiedSince: z.string().optional(),
})

// ============================================================================
// BULK OPERATIONS SCHEMAS
// ============================================================================

// Bulk delete input schema
export const bulkDeleteInputSchema = baseAccountInputSchema.extend({
  objects: z.array(z.string()).min(1).max(10000), // Format: "/container/object"
})

// Bulk delete result schema
export const bulkDeleteResultSchema = z.object({
  numberDeleted: z.number(),
  numberNotFound: z.number(),
  errors: z.array(
    z.object({
      path: z.string(),
      status: z.string(),
      error: z.string(),
    })
  ),
})

// ============================================================================
// FOLDER OPERATIONS SCHEMAS (PSEUDO-HIERARCHICAL)
// ============================================================================

// Create folder input schema
export const createFolderInputSchema = baseContainerInputSchema.extend({
  folderPath: z.string().min(1), // e.g., "documents/2024/reports/" (should end with /)
  metadata: z.record(z.string()).optional(),
})

// List folder contents input schema
export const listFolderContentsInputSchema = baseContainerInputSchema.extend({
  folderPath: z.string().optional(), // Empty string or undefined for root level
  limit: z.number().min(1).max(10000).optional(),
  marker: z.string().optional(),
})

// Folder contents response schema
export const folderContentsSchema = z.object({
  folders: z.array(
    z.object({
      name: z.string(), // Just the folder name
      path: z.string(), // Full path with trailing /
    })
  ),
  objects: z.array(objectSummarySchema),
})

// Move folder input schema
export const moveFolderInputSchema = baseContainerInputSchema.extend({
  sourcePath: z.string().min(1),
  destinationPath: z.string().min(1),
  destinationContainer: z.string().optional(),
})

// Delete folder input schema
export const deleteFolderInputSchema = baseContainerInputSchema.extend({
  folderPath: z.string().min(1),
  recursive: z.boolean().optional().default(true),
})

// ============================================================================
// TEMPORARY URL SCHEMAS
// ============================================================================

// Generate temporary URL input schema
export const generateTempUrlInputSchema = baseObjectInputSchema.extend({
  method: z.enum(["GET", "PUT", "POST", "DELETE"]),
  expiresIn: z.number().min(1), // seconds
  filename: z.string().optional(), // Optional Content-Disposition filename
})

// Temporary URL response schema
export const tempUrlSchema = z.object({
  url: z.string(),
  expiresAt: z.number(), // Unix timestamp
})

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const containersResponseSchema = z.array(containerSummarySchema)

export const objectsResponseSchema = z.array(objectSummarySchema)

export const accountInfoResponseSchema = accountInfoSchema

export const containerInfoResponseSchema = containerInfoSchema

export const objectMetadataResponseSchema = objectMetadataSchema

// Object content response (for GET operations)
export const objectContentResponseSchema = z.object({
  content: z.instanceof(ArrayBuffer).or(z.instanceof(Uint8Array)),
  metadata: objectMetadataSchema,
})

// Service info response
export const serviceInfoResponseSchema = serviceInfoSchema

// Folder contents response
export const folderContentsResponseSchema = folderContentsSchema

// Temporary URL response
export const tempUrlResponseSchema = tempUrlSchema

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ServiceInfo = z.infer<typeof serviceInfoSchema>
export type AccountInfo = z.infer<typeof accountInfoSchema>
export type AccountMetadata = z.infer<typeof accountMetadataSchema>
export type ContainerSummary = z.infer<typeof containerSummarySchema>
export type ContainerInfo = z.infer<typeof containerInfoSchema>
export type ContainerMetadata = z.infer<typeof containerMetadataSchema>
export type ObjectSummary = z.infer<typeof objectSummarySchema>
export type ObjectMetadata = z.infer<typeof objectMetadataSchema>
export type ObjectContentResponse = z.infer<typeof objectContentResponseSchema>
export type FolderContents = z.infer<typeof folderContentsSchema>
export type TempUrl = z.infer<typeof tempUrlSchema>

export type ListContainersInput = z.infer<typeof listContainersInputSchema>
export type UpdateAccountMetadataInput = z.infer<typeof updateAccountMetadataInputSchema>
export type GetAccountMetadataInput = z.infer<typeof getAccountMetadataInputSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>

export type ListObjectsInput = z.infer<typeof listObjectsInputSchema>
export type CreateContainerInput = z.infer<typeof createContainerInputSchema>
export type UpdateContainerMetadataInput = z.infer<typeof updateContainerMetadataInputSchema>
export type GetContainerMetadataInput = z.infer<typeof getContainerMetadataInputSchema>
export type DeleteContainerInput = z.infer<typeof deleteContainerInputSchema>

export type GetObjectInput = z.infer<typeof getObjectInputSchema>
export type CreateObjectInput = z.infer<typeof createObjectInputSchema>
export type UpdateObjectMetadataInput = z.infer<typeof updateObjectMetadataInputSchema>
export type CopyObjectInput = z.infer<typeof copyObjectInputSchema>
export type DeleteObjectInput = z.infer<typeof deleteObjectInputSchema>
export type GetObjectMetadataInput = z.infer<typeof getObjectMetadataInputSchema>

export type BulkDeleteInput = z.infer<typeof bulkDeleteInputSchema>
export type BulkDeleteResult = z.infer<typeof bulkDeleteResultSchema>

export type CreateFolderInput = z.infer<typeof createFolderInputSchema>
export type ListFolderContentsInput = z.infer<typeof listFolderContentsInputSchema>
export type MoveFolderInput = z.infer<typeof moveFolderInputSchema>
export type DeleteFolderInput = z.infer<typeof deleteFolderInputSchema>

export type GenerateTempUrlInput = z.infer<typeof generateTempUrlInputSchema>
