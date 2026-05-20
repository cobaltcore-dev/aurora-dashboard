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
 */
export const containerSchema = z.object({
  name: z.string(),
  count: z.number().default(0), // Number of objects in the bucket
  bytes: z.number().default(0), // Total size in bytes
  last_modified: z.string().optional(), // ISO date string of most recent object
  creationDate: z.string().optional(), // Bucket creation date (Ceph-specific)
})

export const listContainersInputSchema = projectScopedInputSchema

export const createBucketInputSchema = projectScopedInputSchema.extend({
  bucketName: z.string().min(3).max(63),
})

export const deleteBucketInputSchema = projectScopedInputSchema.extend({
  bucketName: z.string().min(1),
})

// ============================================================================
// CONTAINER TYPES
// ============================================================================

export type Container = z.infer<typeof containerSchema>

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

export const s3FolderPrefixSchema = z.object({
  prefix: z.string(), // "photos/2024/"
})

export const listObjectsInputSchema = projectScopedInputSchema.extend({
  containerName: z.string().min(1),
  prefix: z.string().optional(), // Filter by prefix
  delimiter: z.string().optional(), // "/" for folder grouping
  maxKeys: z.number().min(1).max(1000).default(1000),
  continuationToken: z.string().optional(), // For pagination
})

export const listObjectsOutputSchema = z.object({
  objects: z.array(s3ObjectSchema),
  folders: z.array(s3FolderPrefixSchema), // CommonPrefixes
  isTruncated: z.boolean(),
  nextContinuationToken: z.string().optional(),
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
// S3 OBJECT TYPES
// ============================================================================

export type S3Object = z.infer<typeof s3ObjectSchema>
export type S3FolderPrefix = z.infer<typeof s3FolderPrefixSchema>
export type ListObjectsOutput = z.infer<typeof listObjectsOutputSchema>
export type S3ObjectDetails = z.infer<typeof s3ObjectDetailsSchema>

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
