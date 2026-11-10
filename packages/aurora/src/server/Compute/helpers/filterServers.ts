import { Server } from "../types/server"
import { parseMultiValue } from "./imageHelpers"
import { powerStateLabel } from "./serverHelpers"

export interface ServerFilters {
  /** Substring match over name and id. */
  name?: string
  /** Power-state label (e.g. "RUNNING"); supports multi-value "in:RUNNING,SHUTDOWN". */
  power_state?: string
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

export type ServerSortKey = "name" | "power_state" | "created" | "updated" | "flavor" | "availability_zone"

function imageIdOf(server: Server): string {
  const image = server.image
  if (!image) return ""
  return typeof image === "string" ? image : (image.id ?? "")
}

/** All IP addresses across the server's networks. */
function ipsOf(server: Server): string[] {
  if (!server.addresses) return []
  return Object.values(server.addresses)
    .flat()
    .map((a) => a.addr ?? "")
    .filter(Boolean)
}

/**
 * Case-insensitive substring match over every list-visible field except the
 * ones with their own filter (Status, AZ): name, id, flavor name, image id,
 * created, and IP addresses.
 */
function matchesSearch(server: Server, term: string): boolean {
  const haystack = [
    server.name ?? "",
    server.id,
    server.flavor?.original_name ?? "",
    imageIdOf(server),
    server.created ?? "",
    ...ipsOf(server),
  ]
  const needle = term.toLowerCase()
  return haystack.some((field) => field.toLowerCase().includes(needle))
}

/**
 * Applies BFF-side filtering to a servers array. Mirrors filterImages:
 * single- and multi-value ("in:…") filters plus a free-text search over every
 * list-visible field except Status/AZ (name, id, flavor, image, created, IPs).
 */
export function filterServers(servers: Server[], filters: ServerFilters): Server[] {
  let filtered = servers

  if (filters.name && filters.name.trim()) {
    const term = filters.name.trim()
    filtered = filtered.filter((s) => matchesSearch(s, term))
  }

  if (filters.power_state) {
    const values = parseMultiValue(filters.power_state)
    filtered = filtered.filter((s) => values.includes(powerStateLabel(s["OS-EXT-STS:power_state"])))
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
    case "power_state":
      return powerStateLabel(server["OS-EXT-STS:power_state"])
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
