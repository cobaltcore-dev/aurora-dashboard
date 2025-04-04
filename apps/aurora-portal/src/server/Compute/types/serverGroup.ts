import { z } from "zod"

export const serverGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  policies: z.array(z.string()).optional(),
  policy: z.string().optional(), // Deprecated but still in use in some APIs
  members: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  project_id: z.string().optional(),
  user_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional().nullable(),
  policy_details: z.record(z.unknown()).optional(), // For detailed policy information
  rules: z.record(z.unknown()).optional(), // Additional policy rules
})

export const serverGroupResponseSchema = z.object({
  server_group: serverGroupSchema,
})

export const serverGroupsResponseSchema = z.object({
  server_groups: z.array(serverGroupSchema),
})

// Schema for creating a new server group
export const createServerGroupSchema = z.object({
  server_group: z.object({
    name: z.string(),
    policies: z.array(z.string()).optional(),
    policy: z.string().optional(), // Deprecated but kept for backward compatibility
    rules: z.record(z.unknown()).optional(),
  }),
})

export type ServerGroup = z.infer<typeof serverGroupSchema>
export type ServerGroupResponse = z.infer<typeof serverGroupResponseSchema>
export type ServerGroupsResponse = z.infer<typeof serverGroupsResponseSchema>
export type CreateServerGroup = z.infer<typeof createServerGroupSchema>
