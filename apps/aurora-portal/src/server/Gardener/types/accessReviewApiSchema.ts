import { z } from "zod"

// Resource attributes schema for the spec
const ResourceAttributesSchema = z.object({
  namespace: z.string().optional(),
  verb: z.string(),
  group: z.string().optional(),
  resource: z.string(),
  subresource: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
})

// Spec schema
const SpecSchema = z.object({
  resourceAttributes: ResourceAttributesSchema.optional(),
  nonResourceAttributes: z
    .object({
      path: z.string(),
      verb: z.string(),
    })
    .optional(),
})

// Status schema
const StatusSchema = z.object({
  allowed: z.boolean(),
  denied: z.boolean().optional(),
  reason: z.string().optional(),
  evaluationError: z.string().optional(),
})

// Main SelfSubjectAccessReview schema (without metadata)
export const AccessReviewApiResponseSchema = z.object({
  kind: z.literal("SelfSubjectAccessReview"),
  apiVersion: z.string(),
  spec: SpecSchema,
  status: StatusSchema.optional(),
})

export const SelfSubjectAccessReviewListSchema = z.array(AccessReviewApiResponseSchema)

// Type inference
export type SelfSubjectAccessReview = z.infer<typeof AccessReviewApiResponseSchema>
export type ResourceAttributes = z.infer<typeof ResourceAttributesSchema>
