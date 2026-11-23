import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { optionalText } from "./fields"

// password is deliberately absent: z.object strips unknown keys, so Manila's password never leaves the BFF. Never add it, never use .passthrough()/.loose().
export const securityServiceSchema = z.object({
  id: z.string().min(1),
  name: optionalText,
  description: optionalText,
  type: optionalText,
  status: optionalText,
  dns_ip: optionalText,
  server: optionalText,
  domain: optionalText,
  user: optionalText,
  ou: optionalText,
  project_id: optionalText,
  created_at: optionalText,
  updated_at: optionalText,
  share_networks: z.array(z.string()).nullish().catch(undefined),
})

export const listSecurityServicesInputSchema = projectScopedInputSchema.extend({
  shareNetworkId: z.string().uuid().optional(),
})

export const securityServiceIdInputSchema = projectScopedInputSchema.extend({
  securityServiceId: z.string().uuid(),
})

export type SecurityService = z.infer<typeof securityServiceSchema>
