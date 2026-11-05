import { Server } from "../types/server"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import { parseMultiValue } from "./imageHelpers"

export interface ServerFilters {
  /** Substring match over name and id. */
  name?: string
  /** Supports multi-value "in:ACTIVE,ERROR". */
  status?: string
  /** Supports multi-value. */
  availability_zone?: string
  /** Flavor original_name; supports multi-value. */
  flavor?: string
  /** Image id; supports multi-value. */
  image?: string
  /** SSH key name; supports multi-value. */
  key_name?: string
  /** "true" / "false" string. */
  locked?: string
}

export type ServerSortKey = "name" | "status" | "created" | "updated" | "flavor" | "availability_zone"

function imageIdOf(server: Server): string {
  const image = server.image
  if (!image) return ""
  return typeof image === "string" ? image : (image.id ?? "")
}

/**
 * Applies BFF-side filtering to a servers array. Mirrors filterImages:
 * single- and multi-value ("in:…") filters plus substring name/id search.
 */
export function filterServers(servers: Server[], filters: ServerFilters): Server[] {
  let filtered = servers

  if (filters.name && filters.name.trim()) {
    filtered = filterBySearchParams(filtered, filters.name, ["id", "name"])
  }

  if (filters.status) {
    const values = parseMultiValue(filters.status)
    filtered = filtered.filter((s) => values.includes(s.status ?? ""))
  }

  if (filters.availability_zone) {
    const values = parseMultiValue(filters.availability_zone)
    filtered = filtered.filter((s) => values.includes(s["OS-EXT-AZ:availability_zone"] ?? ""))
  }

  if (filters.flavor) {
    const values = parseMultiValue(filters.flavor)
    filtered = filtered.filter((s) => values.includes(s.flavor?.original_name ?? ""))
  }

  if (filters.image) {
    const values = parseMultiValue(filters.image)
    filtered = filtered.filter((s) => values.includes(imageIdOf(s)))
  }

  if (filters.key_name) {
    const values = parseMultiValue(filters.key_name)
    filtered = filtered.filter((s) => values.includes(s.key_name ?? ""))
  }

  if (filters.locked !== undefined && filters.locked !== null) {
    const wantLocked = filters.locked === "true"
    filtered = filtered.filter((s) => !!s.locked === wantLocked)
  }

  return filtered
}

function sortValue(server: Server, key: ServerSortKey): string {
  switch (key) {
    case "status":
      return server.status ?? ""
    case "created":
      return server.created ?? ""
    case "updated":
      return server.updated ?? ""
    case "flavor":
      return server.flavor?.original_name ?? ""
    case "availability_zone":
      return server["OS-EXT-AZ:availability_zone"] ?? ""
    case "name":
    default:
      return server.name ?? server.id
  }
}

/**
 * Sorts a servers array by "key:dir" (e.g. "name:asc"), mirroring the Glance
 * `sort` convention. Returns a new array.
 */
export function sortServers(servers: Server[], sort: string | undefined): Server[] {
  if (!sort) return servers
  const [rawKey, rawDir] = sort.split(":")
  const key = rawKey as ServerSortKey
  const direction = rawDir === "desc" ? -1 : 1
  return [...servers].sort((a, b) => sortValue(a, key).localeCompare(sortValue(b, key)) * direction)
}
