import type { Server } from "@/server/Compute/types/server"
import { EMPTY_VALUE } from "@/client/components/TwoColumnDescriptionList"
import { powerStateLabel } from "@/server/Compute/helpers/serverHelpers"

export { EMPTY_VALUE }
// One source of truth for the integer -> label mapping (shared with the BFF so
// the Power State column, filter and sort all use identical strings).
export { powerStateLabel }

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
 * Raw image id ("" when boot-from-volume or absent) — use when deciding
 * whether to render the image id.
 */
export function rawImageId(server: Server): string {
  const image = server.image
  if (!image) return ""
  return typeof image === "string" ? image : (image.id ?? "")
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

/** Unique, sorted list of power-state labels present across the instances. */
export function powerStateFacet(servers: Server[]): string[] {
  return facet(servers, (s) => powerStateLabel(s["OS-EXT-STS:power_state"]) || undefined)
}
