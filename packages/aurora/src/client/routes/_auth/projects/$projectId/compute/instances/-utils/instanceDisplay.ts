import type { Server } from "@/server/Compute/types/server"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"

export { EMPTY_VALUE }

/**
 * Nova power_state integer -> label, matching the Nova API reference.
 */
const POWER_STATE_LABELS: Record<number, string> = {
  0: "NOSTATE",
  1: "Running",
  3: "Paused",
  4: "Shutdown",
  6: "Crashed",
  7: "Suspended",
}

export function powerStateLabel(state: number | undefined | null): string {
  if (state === undefined || state === null) return ""
  return POWER_STATE_LABELS[state] ?? `Unknown (${state})`
}

/** Flavor display name for the list/detail (original_name, else "- -"). */
export function flavorName(server: Server): string {
  return server.flavor?.original_name || EMPTY_VALUE
}

/** Image id whether the image is returned as an object or a bare string. */
export function imageId(server: Server): string {
  const image = server.image
  if (!image) return EMPTY_VALUE
  if (typeof image === "string") return image || EMPTY_VALUE
  return image.id || EMPTY_VALUE
}

/**
 * Collect the instance's IP addresses across all networks, in order.
 */
export function instanceIps(server: Server): string[] {
  if (!server.addresses) return []
  return Object.values(server.addresses)
    .flat()
    .map((a) => a.addr)
    .filter((addr): addr is string => !!addr)
}

/** Unique, sorted facet of a string-valued accessor across the instances. */
function facet(servers: Server[], accessor: (s: Server) => string | null | undefined): string[] {
  const values = new Set<string>()
  servers.forEach((s) => {
    const v = accessor(s)
    if (v) values.add(v)
  })
  return Array.from(values).sort()
}

/** Unique, sorted list of availability zones present across the instances. */
export function availabilityZones(servers: Server[]): string[] {
  return facet(servers, (s) => s["OS-EXT-AZ:availability_zone"])
}

/** Unique, sorted list of statuses present across the instances. */
export function instanceStatuses(servers: Server[]): string[] {
  return facet(servers, (s) => s.status)
}

/** Unique, sorted list of flavor names present across the instances. */
export function flavorFacet(servers: Server[]): string[] {
  return facet(servers, (s) => s.flavor?.original_name)
}

/** Unique, sorted list of image ids present across the instances. */
export function imageFacet(servers: Server[]): string[] {
  return facet(servers, (s) => {
    const image = s.image
    if (!image) return undefined
    return typeof image === "string" ? image : image.id
  })
}

/** Unique, sorted list of key names present across the instances. */
export function keyNameFacet(servers: Server[]): string[] {
  return facet(servers, (s) => s.key_name)
}
