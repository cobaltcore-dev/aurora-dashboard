import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"

const optionalText = z.string().nullish().catch(undefined)
export const snapshotSchema = z.object({
  id: z.string().min(1),
  name: optionalText,
  description: optionalText,
  status: optionalText,
  size: z.number().nonnegative().nullish().catch(undefined),
  volume_id: optionalText,
  created_at: optionalText,
  updated_at: optionalText,
  metadata: z.record(z.string(), z.string()).nullish().catch(undefined),
  "os-extended-snapshot-attributes:project_id": optionalText,
})
export const listSnapshotsInputSchema = projectScopedInputSchema.extend({ volumeId: z.string().uuid().optional() })
export const snapshotIdInputSchema = projectScopedInputSchema.extend({ snapshotId: z.string().uuid() })
export type VolumeSnapshot = z.infer<typeof snapshotSchema>
