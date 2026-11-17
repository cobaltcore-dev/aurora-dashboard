import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"

const optionalText = z.string().nullish().catch(undefined)
const optionalBoolean = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true")
  .nullish()
  .catch(undefined)

export const attachmentSchema = z.object({
  attachment_id: optionalText,
  volume_id: optionalText,
  server_id: optionalText,
  device: optionalText,
  attached_at: optionalText,
})

export const volumeSchema = z.object({
  id: z.string().min(1),
  name: optionalText,
  description: optionalText,
  status: optionalText,
  size: z.number().nonnegative().nullish().catch(undefined),
  availability_zone: optionalText,
  volume_type: optionalText,
  bootable: optionalBoolean,
  encrypted: optionalBoolean,
  multiattach: optionalBoolean,
  snapshot_id: optionalText,
  source_volid: optionalText,
  created_at: optionalText,
  updated_at: optionalText,
  metadata: z.record(z.string(), z.string()).nullish().catch(undefined),
  attachments: z.array(attachmentSchema).nullish().catch(undefined),
  "os-vol-tenant-attr:tenant_id": optionalText,
})

export const volumeIdInputSchema = projectScopedInputSchema.extend({ volumeId: z.string().uuid() })
export type Volume = z.infer<typeof volumeSchema>
