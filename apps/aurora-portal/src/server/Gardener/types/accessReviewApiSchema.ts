import { z } from "zod"

const ResourceAttributesSchema = z.object({
  namespace: z.string().optional(),
  verb: z.string(),
  group: z.string().optional(),
  resource: z.string(),
  subresource: z.string().optional(),
  name: z.string().optional(),
  version: z.string().optional(),
})

const SpecSchema = z.object({
  resourceAttributes: ResourceAttributesSchema.optional(),
  nonResourceAttributes: z
    .object({
      path: z.string(),
      verb: z.string(),
    })
    .optional(),
})

const StatusSchema = z.object({
  allowed: z.boolean(),
  denied: z.boolean().optional(),
  reason: z.string().optional(),
  evaluationError: z.string().optional(),
})

export const AccessReviewApiResponseSchema = z.object({
  kind: z.literal("SelfSubjectAccessReview"),
  apiVersion: z.string(),
  spec: SpecSchema,
  status: StatusSchema.optional(),
})

export const SelfSubjectAccessReviewListSchema = z.array(AccessReviewApiResponseSchema)

export type SelfSubjectAccessReview = z.infer<typeof AccessReviewApiResponseSchema>
export type ResourceAttributes = z.infer<typeof ResourceAttributesSchema>
