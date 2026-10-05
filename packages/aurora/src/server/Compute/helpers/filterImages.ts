import { GlanceImage } from "../types/image"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import { parseMultiValue } from "./imageHelpers"

export interface ImageFilters {
  name?: string
  visibility?: string
  status?: string
  disk_format?: string
  container_format?: string
  protected?: string
  owner?: string
}

/**
 * Applies BFF-side filtering to images array.
 * Consolidates duplicate filtering logic from:
 * - listImagesWithSearch
 * - listImagesWithPagination
 * - listSharedImagesByMemberStatus
 *
 * @param images - Array of images to filter
 * @param filters - Filter criteria
 * @param options - Additional options like excludeOwner for shared images
 */
export function filterImages(
  images: GlanceImage[],
  filters: ImageFilters,
  options: { excludeOwner?: string } = {}
): GlanceImage[] {
  let filtered = images

  // Filter by name (search)
  if (filters.name && filters.name.trim()) {
    filtered = filterBySearchParams(filtered, filters.name, ["id", "name", "owner", "size"])
  }

  // Filter by visibility (unless "all")
  if (filters.visibility && filters.visibility !== "all") {
    const visibilityValues = parseMultiValue(filters.visibility)
    filtered = filtered.filter((img) => visibilityValues.includes(img.visibility ?? ""))
  }

  // Filter by status (supports multi-value "in:active,queued" format)
  if (filters.status) {
    const statusValues = parseMultiValue(filters.status)
    filtered = filtered.filter((img) => statusValues.includes(img.status ?? ""))
  }

  // Filter by disk_format (supports multi-value "in:qcow2,raw" format)
  if (filters.disk_format) {
    const diskFormatValues = parseMultiValue(filters.disk_format)
    filtered = filtered.filter((img) => diskFormatValues.includes(img.disk_format ?? ""))
  }

  // Filter by container_format (supports multi-value "in:bare,ovf" format)
  if (filters.container_format) {
    const containerFormatValues = parseMultiValue(filters.container_format)
    filtered = filtered.filter((img) => containerFormatValues.includes(img.container_format ?? ""))
  }

  // Filter by protected ("true" / "false" string)
  if (filters.protected !== undefined && filters.protected !== null) {
    const wantProtected = filters.protected === "true"
    filtered = filtered.filter((img) => !!img.protected === wantProtected)
  }

  // Filter by owner
  if (filters.owner) {
    filtered = filtered.filter((img) => img.owner === filters.owner)
  }

  // Exclude owner (for shared images - filters OUT owned images)
  if (options.excludeOwner) {
    filtered = filtered.filter((img) => img.owner !== options.excludeOwner)
  }

  return filtered
}
