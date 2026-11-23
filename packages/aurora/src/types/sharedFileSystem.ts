/** Catalog constants for Manila shared file system service. */
export const MANILA_SERVICE_TYPE = "sharev2"
export const MANILA_SERVICE_NAME = "manilav2"

/**
 * Check if the given services array includes the Manila service.
 * Returns true only if both type and name match exactly.
 */
export function hasManilaService(services: { type: string; name: string }[]): boolean {
  return services.some((s) => s.type === MANILA_SERVICE_TYPE && s.name === MANILA_SERVICE_NAME)
}

export const SHARED_FILE_SYSTEM_PERMISSIONS = [
  "shared-file-system:shares:list",
  "shared-file-system:shares:read",
  "shared-file-system:export_locations:list",
  "shared-file-system:snapshots:list",
  "shared-file-system:snapshots:read",
  "shared-file-system:replicas:list",
  "shared-file-system:share_networks:list",
  "shared-file-system:share_networks:read",
  "shared-file-system:security_services:list",
  "shared-file-system:security_services:read",
] as const
export type SharedFileSystemPermission = (typeof SHARED_FILE_SYSTEM_PERMISSIONS)[number]
