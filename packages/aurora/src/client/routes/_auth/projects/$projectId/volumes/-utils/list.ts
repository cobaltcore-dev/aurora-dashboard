import { z } from "zod"
import type { Volume } from "@/server/Volume/types/volume"
import type { VolumeSnapshot } from "@/server/Volume/types/snapshot"
import { VOLUME_STATUSES, SNAPSHOT_STATUSES, VOLUME_TRANSITIONAL_STATUSES } from "@/types/volume"

export const volumeSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  sortBy: z.enum(["name", "status", "size", "created_at"]).optional().catch(undefined),
  sortDirection: z.enum(["asc", "desc"]).optional().catch(undefined),
  status: z.string().optional().catch(undefined),
  volume_type: z.string().optional().catch(undefined),
  bootable: z.enum(["true", "false"]).optional().catch(undefined),
  availability_zone: z.string().optional().catch(undefined),
})
export type VolumeSearch = z.infer<typeof volumeSearchSchema>

export function statusRank(status: string | null | undefined, snapshots = false): number {
  if (!status) return 99
  // Future Cinder error states still sort attention-first, even before a new UI release.
  if (status === "error" || status.startsWith("error_")) return 0
  if (snapshots) {
    if (["creating", "deleting", "restoring", "backing-up", "unmanaging"].includes(status)) return 1
    return status === "available" ? 2 : 99
  }
  if (VOLUME_TRANSITIONAL_STATUSES.includes(status)) return 1
  return ({ "awaiting-transfer": 2, reserved: 3, "in-use": 4, available: 5 } as Record<string, number>)[status] ?? 99
}

export function cinderTimestamp(value: string | null | undefined): number {
  if (!value) return NaN
  // Cinder emits UTC timestamps without an explicit timezone. Do not interpret them as local time.
  return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`)
}

export function formatCinderDate(value: string | null | undefined, locale: string): string {
  const timestamp = cinderTimestamp(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString(locale) : "- -"
}

export function filterAndSortVolumes<T extends Volume | VolumeSnapshot>(
  items: T[],
  search: VolumeSearch,
  snapshots = false
): T[] {
  const term = search.search?.trim().toLocaleLowerCase() ?? ""
  const statuses = snapshots ? SNAPSHOT_STATUSES : VOLUME_STATUSES
  const filtered = items.filter((item) => {
    if (term) {
      const volume = item as Volume
      // Dedicated filters own status, volume_type, bootable, and availability_zone.
      const searchableValues = snapshots
        ? [item.id, item.name]
        : [
            volume.id,
            volume.name,
            volume.description,
            volume.size,
            volume.encrypted,
            volume.multiattach,
            volume.snapshot_id,
            volume.source_volid,
            volume.created_at,
            volume.updated_at,
            volume["os-vol-tenant-attr:tenant_id"],
            ...Object.entries(volume.metadata ?? {}).flat(),
            ...(volume.attachments ?? []).flatMap((attachment) => Object.values(attachment)),
          ]
      if (
        !searchableValues.some((value) => {
          if (value == null) return false
          if (typeof value === "boolean" && (value ? "yes" : "no").includes(term)) return true
          return String(value).toLocaleLowerCase().includes(term)
        })
      )
        return false
    }
    if (
      search.status === "other" ? statuses.includes(item.status ?? "") : search.status && item.status !== search.status
    )
      return false
    if (!snapshots) {
      const volume = item as Volume
      if (search.volume_type && volume.volume_type !== search.volume_type) return false
      if (search.availability_zone && volume.availability_zone !== search.availability_zone) return false
      if (search.bootable && volume.bootable !== (search.bootable === "true")) return false
    }
    return true
  })
  const key = search.sortBy ?? "name"
  const direction = search.sortDirection === "desc" ? -1 : 1
  return filtered.sort((a, b) => {
    let comparison: number
    if (key === "status") comparison = statusRank(a.status, snapshots) - statusRank(b.status, snapshots)
    else if (key === "size") comparison = (a.size ?? -1) - (b.size ?? -1)
    else if (key === "created_at")
      comparison = (cinderTimestamp(a.created_at) || 0) - (cinderTimestamp(b.created_at) || 0)
    else comparison = (a.name || a.id).localeCompare(b.name || b.id)
    return direction * (comparison || a.id.localeCompare(b.id))
  })
}
