import { ListImagesInput } from "../types/image"

/**
 * Applies sorting and filtering parameters to URLSearchParams for OpenStack Glance API calls
 * @param queryParams - URLSearchParams object to modify
 * @param input - Input object containing sorting and filtering parameters
 */
export function applyImageQueryParams(queryParams: URLSearchParams, input: Omit<ListImagesInput, "projectId">): void {
  const {
    sort_key,
    sort_dir,
    sort,
    limit,
    marker,
    name,
    status,
    visibility,
    owner,
    protected: isProtected,
    container_format,
    disk_format,
    size_min,
    size_max,
    min_ram,
    min_disk,
    tag,
    os_type,
    os_hidden,
    member_status,
    created_at,
    updated_at,
  } = input

  // Sorting parameters - use either classic syntax (sort_key + sort_dir) or new syntax (sort)
  if (sort) {
    queryParams.append("sort", sort)
  } else {
    // Default to classic syntax (always applied due to defaults)
    queryParams.append("sort_key", sort_key)
    queryParams.append("sort_dir", sort_dir)
  }

  // Pagination parameters
  if (limit !== undefined) {
    queryParams.append("limit", limit.toString())
  }
  if (marker) {
    queryParams.append("marker", marker)
  }

  // Basic filtering parameters
  if (name) {
    queryParams.append("name", name)
  }
  if (status) {
    queryParams.append("status", status)
  }
  if (visibility) {
    queryParams.append("visibility", visibility)
  }
  if (owner) {
    queryParams.append("owner", owner)
  }
  if (member_status) {
    queryParams.append("member_status", member_status)
  }

  // Boolean parameters
  if (isProtected !== undefined) {
    queryParams.append("protected", isProtected.toString())
  }
  if (os_hidden !== undefined) {
    queryParams.append("os_hidden", os_hidden.toString())
  }

  // Format parameters
  if (container_format) {
    queryParams.append("container_format", container_format)
  }
  if (disk_format) {
    queryParams.append("disk_format", disk_format)
  }

  // Numeric parameters
  if (min_ram !== undefined) {
    queryParams.append("min_ram", min_ram.toString())
  }
  if (min_disk !== undefined) {
    queryParams.append("min_disk", min_disk.toString())
  }
  if (size_min !== undefined) {
    queryParams.append("size_min", size_min.toString())
  }
  if (size_max !== undefined) {
    queryParams.append("size_max", size_max.toString())
  }

  // Tag and OS filtering
  if (tag) {
    queryParams.append("tag", tag)
  }
  if (os_type) {
    queryParams.append("os_type", os_type)
  }

  // Time-based filtering with comparison operators
  if (created_at) {
    queryParams.append("created_at", created_at)
  }
  if (updated_at) {
    queryParams.append("updated_at", updated_at)
  }
}

/**
 * Utility function to parse pagination links from OpenStack Glance API response
 * @param linkUrl - Full URL with pagination parameters
 * @returns Extracted marker and other pagination info, or null if not parseable
 */
export function parsePaginationLink(linkUrl: string): { marker?: string; limit?: number } | null {
  try {
    const url = new URL(linkUrl)
    const marker = url.searchParams.get("marker")
    const limitStr = url.searchParams.get("limit")

    return {
      marker: marker || undefined,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Constructs next page URL for pagination by combining base URL with current parameters and next marker
 * @param baseUrl - The base API URL (e.g., "/v2/images")
 * @param currentParams - Current query parameters
 * @param nextMarker - The marker for the next page
 * @returns Full URL for next page
 */
export function buildNextPageUrl(baseUrl: string, currentParams: URLSearchParams, nextMarker: string): string {
  const nextParams = new URLSearchParams(currentParams)
  nextParams.set("marker", nextMarker)
  return `${baseUrl}?${nextParams.toString()}`
}

/**
 * Extracts marker from the last image in the current page
 * Useful for manual pagination when API doesn't provide next link
 * @param images - Array of images from current page
 * @returns The ID of the last image, or undefined if no images
 */
export function getLastImageMarker(images: Array<{ id: string }>): string | undefined {
  if (images.length === 0) {
    return undefined
  }
  return images[images.length - 1].id
}
