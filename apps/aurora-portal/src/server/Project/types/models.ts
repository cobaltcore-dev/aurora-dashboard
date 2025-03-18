import { z } from "zod"
// Define the basic project schema
export const baseProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  domain_id: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  is_domain: z.boolean().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  options: z.record(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
  links: z.object({
    self: z.string().url(),
  }),
})

export const projectSchema = baseProjectSchema.extend({
  parents: z
    .array(
      z.object({
        project: baseProjectSchema,
      })
    )
    .optional(),
})

export const projectsResponseSchema = z.object({
  projects: z.array(projectSchema),
  links: z.object({
    self: z.string().url(),
    previous: z.string().url().nullable(),
    next: z.string().url().nullable(),
  }),
})

export type Project = z.infer<typeof projectSchema>
export type ProjectsResponse = z.infer<typeof projectsResponseSchema>
