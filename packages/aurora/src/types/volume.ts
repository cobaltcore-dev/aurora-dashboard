/** Catalog types used for Cinder v3 across deployments. */
export const CINDER_SERVICE_TYPES = ["volumev3", "block-storage", "volume"] as const

export function findCinderService(services: { type: string; name: string }[]) {
  for (const type of CINDER_SERVICE_TYPES) {
    const service = services.find((entry) => entry.type === type)
    if (service) return service
  }
  return undefined
}

export const VOLUME_ERROR_STATUSES = [
  "error",
  "error_deleting",
  "error_extending",
  "error_restoring",
  "error_backing-up",
]
export const VOLUME_TRANSITIONAL_STATUSES = [
  "creating",
  "deleting",
  "attaching",
  "detaching",
  "extending",
  "backing-up",
  "restoring-backup",
  "maintenance",
  "downloading",
  "uploading",
  "retyping",
]
export const VOLUME_STATUSES = [
  ...VOLUME_ERROR_STATUSES,
  ...VOLUME_TRANSITIONAL_STATUSES,
  "awaiting-transfer",
  "reserved",
  "in-use",
  "available",
]
export const SNAPSHOT_STATUSES = [
  "error",
  "error_deleting",
  "creating",
  "deleting",
  "restoring",
  "backing-up",
  "unmanaging",
  "available",
  "deleted",
]

export const VOLUME_PERMISSIONS = [
  "volume:volumes:list",
  "volume:volumes:read",
  "volume:snapshots:list",
  "volume:snapshots:read",
] as const
export type VolumePermission = (typeof VOLUME_PERMISSIONS)[number]
