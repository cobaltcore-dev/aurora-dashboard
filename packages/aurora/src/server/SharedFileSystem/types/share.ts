import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { optionalText, optionalSize, optionalBoolean, metadataSchema } from "./fields"

export const shareSchema = z.object({
  id: z.string().min(1),
  name: optionalText,
  description: optionalText,
  status: optionalText,
  share_proto: optionalText,
  share_type: optionalText,
  share_type_name: optionalText,
  availability_zone: optionalText,
  share_network_id: optionalText,
  snapshot_id: optionalText,
  share_group_id: optionalText,
  project_id: optionalText,
  created_at: optionalText,
  updated_at: optionalText,
  replication_type: optionalText,
  size: optionalSize,
  is_public: optionalBoolean,
  has_replicas: optionalBoolean,
  snapshot_support: optionalBoolean,
  create_share_from_snapshot_support: optionalBoolean,
  revert_to_snapshot_support: optionalBoolean,
  mount_snapshot_support: optionalBoolean,
  metadata: metadataSchema,
})

export const exportLocationSchema = z.object({
  id: z.string().min(1),
  path: optionalText,
  preferred: optionalBoolean,
})

export const shareReplicaSchema = z.object({
  id: z.string().min(1),
  share_id: optionalText,
  status: optionalText,
  replica_state: optionalText,
  availability_zone: optionalText,
  created_at: optionalText,
  updated_at: optionalText,
})

export const shareIdInputSchema = projectScopedInputSchema.extend({ shareId: z.string().uuid() })

export type Share = z.infer<typeof shareSchema>
export type ShareExportLocation = z.infer<typeof exportLocationSchema>
export type ShareReplica = z.infer<typeof shareReplicaSchema>
