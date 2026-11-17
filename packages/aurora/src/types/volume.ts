/** Catalog types used for Cinder v3 across deployments. */
export const CINDER_SERVICE_TYPES = ["volumev3", "block-storage", "volume"] as const

export function findCinderService(services: { type: string; name: string }[]) {
  for (const type of CINDER_SERVICE_TYPES) {
    const service = services.find((entry) => entry.type === type)
    if (service) return service
  }
  return undefined
}

export const VOLUME_PERMISSIONS = [
  "volume:volumes:list",
  "volume:volumes:read",
  "volume:snapshots:list",
  "volume:snapshots:read",
] as const
export type VolumePermission = (typeof VOLUME_PERMISSIONS)[number]
