import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { optionalText, optionalSize } from "./fields"

export const shareSnapshotSchema = z.object({
  id: z.string().min(1),
  name: optionalText,
  description: optionalText,
  status: optionalText,
  share_id: optionalText,
  share_proto: optionalText,
  project_id: optionalText,
  created_at: optionalText,
  updated_at: optionalText,
  size: optionalSize,
  share_size: optionalSize,
})

export const listShareSnapshotsInputSchema = projectScopedInputSchema.extend({
  shareId: z.string().uuid().optional(),
})

export const shareSnapshotIdInputSchema = projectScopedInputSchema.extend({
  snapshotId: z.string().uuid(),
})

export type ShareSnapshot = z.infer<typeof shareSnapshotSchema>
