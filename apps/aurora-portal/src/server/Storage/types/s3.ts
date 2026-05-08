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
// BUCKET SCHEMAS
// ============================================================================

export const bucketSchema = z.object({
  name: z.string(),
  creationDate: z.string().optional(),
})

export const bucketDetailsSchema = bucketSchema.extend({
  objectCount: z.number().optional(),
  sizeBytes: z.number().optional(),
})

export const listBucketsInputSchema = projectScopedInputSchema

export const getBucketDetailsInputSchema = projectScopedInputSchema.extend({
  bucketName: z.string().min(1),
})

// ============================================================================
// BUCKET TYPES
// ============================================================================

export type Bucket = z.infer<typeof bucketSchema>
export type BucketDetails = z.infer<typeof bucketDetailsSchema>

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
  bucketName: z.string().min(1),
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
  bucketName: z.string().min(1),
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
