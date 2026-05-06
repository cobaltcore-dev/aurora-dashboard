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
