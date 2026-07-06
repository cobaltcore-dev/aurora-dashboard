import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"

// ============================================================================
// EC2 CREDENTIAL SCHEMAS
// ============================================================================

export const ec2CredentialSchema = z.object({
  id: z.string(),
  access: z.string(),
  user_id: z.string(),
  project_id: z.string(),
})

export const ec2CredentialWithSecretSchema = ec2CredentialSchema.extend({
  secret: z.string(),
})

export const listEc2CredentialsInputSchema = projectScopedInputSchema

export const createEc2CredentialInputSchema = projectScopedInputSchema

export const deleteEc2CredentialInputSchema = projectScopedInputSchema.extend({
  credentialId: z.string().min(1),
})

// ============================================================================
// EC2 CREDENTIAL TYPES
// ============================================================================

export type Ec2Credential = z.infer<typeof ec2CredentialSchema>
export type Ec2CredentialWithSecret = z.infer<typeof ec2CredentialWithSecretSchema>

// ============================================================================
// CONTAINER SCHEMAS
// ============================================================================

/**
 * Container schema - aligned with Swift ContainerSummary structure
 * Includes count, bytes, and last_modified for consistent UI rendering
 *
 * IMPORTANT: count, bytes, and last_modified are ESTIMATES when buckets contain >1000 objects.
 * The list endpoint uses S3_MAX_KEYS_PER_REQUEST for performance, so these values are based on
 * a sample of objects. For accurate counts, pagination would be needed (expensive).
 */
export const containerSchema = z.object({
  name: z.string(),
  count: z.number().default(0), // Estimated number of objects (based on first 1000)
  bytes: z.number().default(0), // Estimated total size in bytes (based on first 1000)
  last_modified: z.string().optional(), // ISO date string (may not be the absolute latest if >1000 objects)
  creationDate: z.string().optional(), // Bucket creation date (Ceph-specific, accurate)
})

export const listContainersInputSchema = projectScopedInputSchema.extend({
  includeMetadata: z.boolean().optional().default(false),
})

/**
 * S3-compliant bucket name validation for CREATING new buckets:
 * - 3-63 characters
 * - Lowercase letters, numbers, hyphens, periods
 * - Must start/end with letter or number
 * - No consecutive periods
 * - Not an IP address format
 *
 * Note: Use this only for bucket creation. For operations on existing buckets,
 * use existingBucketNameSchema which is permissive (buckets may have been
 * created via Swift API or with relaxed naming rules).
 */
export const bucketNameSchema = z
  .string()
  .min(3, "Bucket name must be at least 3 characters")
  .max(63, "Bucket name must be at most 63 characters")
  .regex(
    /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
    "Bucket name must contain only lowercase letters, numbers, hyphens, and periods"
  )
  .refine((name) => !name.includes(".."), "Bucket name cannot contain consecutive periods")
  .refine((name) => !/^\d+\.\d+\.\d+\.\d+$/.test(name), "Bucket name cannot be formatted as an IP address")

/**
 * Permissive bucket name validation for operations on EXISTING buckets.
 *
 * Buckets may have been created via:
 * - Swift API (allows spaces and other characters)
 * - Ceph RGW with rgw_relaxed_s3_bucket_names=true (up to 255 chars)
 * - Legacy systems with different naming rules
 *
 * We only validate that the name is non-empty and within reasonable bounds.
 * The actual bucket existence is validated by S3 operations themselves.
 */
export const existingBucketNameSchema = z
  .string()
  .min(1, "Bucket name is required")
  .max(255, "Bucket name exceeds maximum length")

export const createBucketInputSchema = projectScopedInputSchema.extend({
  bucketName: bucketNameSchema,
  enableVersioning: z.boolean().optional().default(false),
})

export const createBucketOutputSchema = z.object({
  success: z.boolean(),
  versioningError: z.string().optional(),
})

export const deleteBucketInputSchema = projectScopedInputSchema.extend({
  bucketName: z.string().min(1),
})

// ============================================================================
// BUCKET TYPES
// ============================================================================

export type Bucket = z.infer<typeof containerSchema>
export type CreateBucketOutput = z.infer<typeof createBucketOutputSchema>

// ============================================================================
// S3 STATUS SCHEMAS
// ============================================================================

export const s3StatusSchema = z.object({
  hasCredentials: z.boolean(),
})

// ============================================================================
// S3 STATUS TYPES
// ============================================================================

export type S3Status = z.infer<typeof s3StatusSchema>

// ============================================================================
// S3 OBJECT SCHEMAS
// ============================================================================

export const s3ObjectSchema = z.object({
  key: z.string(), // Full path: "photos/2024/img.jpg"
  lastModified: z.string().optional(), // ISO date string
  size: z.number(), // bytes
  etag: z.string().optional(),
  storageClass: z.string().optional(),
})

export const s3ObjectVersionSchema = z.object({
  key: z.string(), // Full path: "photos/2024/img.jpg"
  versionId: z.string(), // Version ID
  isLatest: z.boolean(), // Is this the latest version?
  lastModified: z.string().optional(), // ISO date string
  size: z.number(), // bytes (0 for delete markers)
  etag: z.string().optional(),
  storageClass: z.string().optional(),
  isDeleteMarker: z.boolean().default(false), // True if this is a delete marker
})

export const s3FolderPrefixSchema = z.object({
  prefix: z.string(), // "photos/2024/"
})

export const listObjectsInputSchema = projectScopedInputSchema.extend({
  containerName: z.string().min(1),
  prefix: z.string().optional(), // Filter by prefix
  delimiter: z.string().optional(), // "/" for folder grouping
  maxKeys: z.number().min(1).max(1000).default(1000),
  continuationToken: z.string().optional(), // For pagination (ListObjectsV2)
  keyMarker: z.string().optional(), // For version pagination (ListObjectVersions)
  versionIdMarker: z.string().optional(), // For version pagination (ListObjectVersions)
  showVersions: z.boolean().optional().default(false), // Show all versions including delete markers
})

export const listObjectsOutputSchema = z.object({
  objects: z.array(s3ObjectSchema),
  folders: z.array(s3FolderPrefixSchema), // CommonPrefixes
  isTruncated: z.boolean(),
  nextContinuationToken: z.string().optional(),
  versions: z.array(s3ObjectVersionSchema).optional(), // When showVersions=true
  nextKeyMarker: z.string().optional(), // For version pagination
  nextVersionIdMarker: z.string().optional(), // For version pagination
})

export const getObjectDetailsInputSchema = projectScopedInputSchema.extend({
  containerName: z.string().min(1),
  objectKey: z.string().min(1),
})

export const s3ObjectDetailsSchema = s3ObjectSchema.extend({
  contentType: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
})

// ============================================================================
// OBJECT OPERATION SCHEMAS
// ============================================================================

/**
 * Delete a single object from a bucket
 */
export const deleteObjectInputSchema = projectScopedInputSchema.extend({
  containerName: z.string().min(1),
  objectKey: z.string().min(1),
})

/**
 * Create a folder (zero-byte object with trailing "/")
 */
export const createFolderInputSchema = projectScopedInputSchema.extend({
  containerName: z.string().min(1),
  folderPath: z.string().min(1),
})

/**
 * Copy an object within or across buckets
 */
export const copyObjectInputSchema = projectScopedInputSchema.extend({
  sourceBucket: z.string().min(1),
  sourceKey: z.string().min(1),
  destinationBucket: z.string().min(1),
  destinationKey: z.string().min(1),
  copyMetadata: z.boolean().optional().default(true),
})

export const copyObjectOutputSchema = z.object({
  key: z.string(),
  etag: z.string().optional(),
  lastModified: z.string().optional(),
})

/**
 * Move an object within or across buckets (copy + delete)
 */
export const moveObjectInputSchema = projectScopedInputSchema.extend({
  sourceBucket: z.string().min(1),
  sourceKey: z.string().min(1),
  destinationBucket: z.string().min(1),
  destinationKey: z.string().min(1),
})

/**
 * Update object metadata (copy to self with REPLACE directive)
 */
export const updateMetadataInputSchema = projectScopedInputSchema.extend({
  containerName: z.string().min(1),
  objectKey: z.string().min(1),
  metadata: z.record(z.string(), z.string()),
})

/**
 * Download an object (streamed through the BFF as base64 chunks).
 * `downloadId` is the client-computed "<bucket>:<objectKey>:<uuid>" used to
 * correlate the stream with a watchDownloadProgress subscription opened in advance.
 */
export const downloadObjectInputSchema = projectScopedInputSchema.extend({
  containerName: z.string().min(1),
  objectKey: z.string().min(1),
  filename: z.string().min(1),
  downloadId: z.string().min(1),
})

/**
 * Subscribe to live progress for an in-flight download, keyed by `downloadId`.
 */
export const watchDownloadProgressInputSchema = projectScopedInputSchema.extend({
  downloadId: z.string().min(1),
})

// ============================================================================
// S3 OBJECT TYPES
// ============================================================================

export type S3Object = z.infer<typeof s3ObjectSchema>
export type S3ObjectVersion = z.infer<typeof s3ObjectVersionSchema>
export type S3FolderPrefix = z.infer<typeof s3FolderPrefixSchema>
export type ListObjectsOutput = z.infer<typeof listObjectsOutputSchema>
export type S3ObjectDetails = z.infer<typeof s3ObjectDetailsSchema>
export type CopyObjectOutput = z.infer<typeof copyObjectOutputSchema>

// ============================================================================
// SERVICE INFO SCHEMAS (CLUSTER LIMITS & CAPABILITIES)
// ============================================================================

/**
 * S3 Service Information - Cluster limits and capabilities
 * Similar to Swift /info endpoint but for S3/Ceph
 */
export const s3ServiceInfoSchema = z.object({
  // Limits
  limits: z.object({
    maxFileSize: z.number().optional(), // bytes, e.g., 5GB
    maxBucketNameLength: z.number().optional(), // typically 63
    maxObjectNameLength: z.number().optional(), // typically 1024
    bucketListingLimit: z.number().optional(), // max keys per ListObjects request
    maxDeletesPerRequest: z.number().optional(), // DeleteObjects limit
    maxMultipartParts: z.number().optional(), // typically 10000
    minMultipartPartSize: z.number().optional(), // bytes, typically 5MB
  }),

  // Capabilities (what features are supported)
  capabilities: z.object({
    // Storage features
    bucketVersioning: z.boolean().optional(),
    objectLocking: z.boolean().optional(),
    bucketReplication: z.boolean().optional(),

    // Access control
    bucketPolicies: z.boolean().optional(),
    bucketACLs: z.boolean().optional(),
    objectACLs: z.boolean().optional(),

    // Lifecycle
    lifecycleRules: z.boolean().optional(),
    objectExpiration: z.boolean().optional(),

    // CORS
    corsConfiguration: z.boolean().optional(),

    // Website hosting
    staticWebsiteHosting: z.boolean().optional(),

    // Upload/Download
    multipartUpload: z.boolean().optional(),
    presignedUrls: z.boolean().optional(),
    rangeRequests: z.boolean().optional(),

    // Tagging
    bucketTagging: z.boolean().optional(),
    objectTagging: z.boolean().optional(),

    // Monitoring & Logging
    serverAccessLogging: z.boolean().optional(),
    eventNotifications: z.boolean().optional(),

    // Advanced
    objectMetadata: z.boolean().optional(),
    serverSideEncryption: z.boolean().optional(),
  }),

  // Additional info
  version: z.string().optional(), // Ceph/RGW version
  region: z.string().optional(), // Default region
})

export const getServiceInfoInputSchema = z.object({
  // No input needed - service info is global
})

// ============================================================================
// SERVICE INFO TYPES
// ============================================================================

export type S3ServiceInfo = z.infer<typeof s3ServiceInfoSchema>

// ============================================================================
// BUCKET POLICY SCHEMAS
// ============================================================================

/**
 * Bucket Policy - JSON-based access control for S3 buckets
 *
 * A policy is a JSON document that defines:
 *   - Who can access the bucket (Principal)
 *   - What actions they can perform (Action: s3:GetObject, s3:PutObject, etc.)
 *   - Which resources they can access (Resource: arn:aws:s3:::bucket/*)
 *   - Under what conditions (Condition: IP restrictions, etc.)
 *
 * Common use cases:
 *   - Public read access for static website hosting
 *   - Cross-account access delegation
 *   - IP-based access restrictions
 *   - Temporary access grants
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
 */
export const bucketPolicyStatementSchema = z
  .object({
    Sid: z.string().optional(), // Statement ID (optional identifier)
    Effect: z.enum(["Allow", "Deny"]), // Allow or Deny access
    Principal: z
      .union([
        z.string(), // "*" for public
        z.object({
          AWS: z.union([z.string(), z.array(z.string())]).optional(), // AWS account/user ARNs
          Service: z.union([z.string(), z.array(z.string())]).optional(),
          Federated: z.union([z.string(), z.array(z.string())]).optional(),
        }),
      ])
      .optional()
      .superRefine((val, ctx) => {
        if (val === undefined) return
        // When Principal is an object, require at least one of AWS, Service, or Federated
        if (typeof val === "object" && !val.AWS && !val.Service && !val.Federated) {
          ctx.addIssue({
            code: "custom",
            message: "Principal object must contain at least one of: AWS, Service, or Federated",
          })
        }

        // Validate AWS principal ARN format
        if (typeof val === "object" && val.AWS) {
          const arns = Array.isArray(val.AWS) ? val.AWS : [val.AWS]
          for (const arn of arns) {
            if (arn !== "*" && !/^arn:aws:iam::\d{12}:(?:root|user\/.+|role\/.+)$/.test(arn)) {
              ctx.addIssue({
                code: "custom",
                message: `Invalid AWS principal ARN format: ${arn}. Expected arn:aws:iam::ACCOUNT-ID:root or arn:aws:iam::ACCOUNT-ID:(user|role)/NAME`,
              })
            }
          }
        }
      }),
    NotPrincipal: z
      .union([
        z.string(),
        z.object({
          AWS: z.union([z.string(), z.array(z.string())]).optional(),
          Service: z.union([z.string(), z.array(z.string())]).optional(),
          Federated: z.union([z.string(), z.array(z.string())]).optional(),
        }),
      ])
      .optional(),
    Action: z
      .union([
        z.string(), // Single action: "s3:GetObject"
        z.array(z.string()), // Multiple actions: ["s3:GetObject", "s3:PutObject"]
      ])
      .optional(),
    NotAction: z.union([z.string(), z.array(z.string())]).optional(),
    Resource: z
      .union([
        z.string(), // Single resource: "arn:aws:s3:::bucket/*"
        z.array(z.string()), // Multiple resources
      ])
      .optional(),
    NotResource: z.union([z.string(), z.array(z.string())]).optional(),
    Condition: z
      .record(
        z.string(), // Condition operator: "StringEquals", "IpAddress", etc.
        z.record(
          z.string(), // Condition key: "aws:SourceIp", "s3:prefix", etc.
          z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])
        )
      )
      .optional(), // Conditions (IP, date, etc.)
  })
  .strict() // Reject unknown fields - don't silently strip them

export const bucketPolicyDocumentSchema = z
  .object({
    Version: z.string().default("2012-10-17"), // Policy language version
    Id: z.string().optional(), // Policy ID
    Statement: z.array(bucketPolicyStatementSchema).min(1, "Policy must contain at least one statement"),
  })
  .strict() // Reject unknown fields - don't silently strip them

export const getBucketPolicyInputSchema = projectScopedInputSchema.extend({
  bucketName: existingBucketNameSchema,
})

export const getBucketPolicyOutputSchema = z.object({
  policy: bucketPolicyDocumentSchema.nullable(), // null if no policy set
  policyText: z.string().nullable(), // Raw JSON string for editor
})

export const setBucketPolicyInputSchema = projectScopedInputSchema.extend({
  bucketName: existingBucketNameSchema,
  policy: z.string().min(1).max(20480, "Policy document exceeds maximum size of 20KB"), // AWS S3 limit is 20KB
})

export const deleteBucketPolicyInputSchema = projectScopedInputSchema.extend({
  bucketName: existingBucketNameSchema,
})

// ============================================================================
// BUCKET POLICY TYPES
// ============================================================================

export type BucketPolicyStatement = z.infer<typeof bucketPolicyStatementSchema>
export type BucketPolicyDocument = z.infer<typeof bucketPolicyDocumentSchema>
export type GetBucketPolicyOutput = z.infer<typeof getBucketPolicyOutputSchema>
