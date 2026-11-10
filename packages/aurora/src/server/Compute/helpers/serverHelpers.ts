import { SignalOpenstackServiceType } from "@cobaltcore-dev/signal-openstack"
import { Server, ServerAddress, serverResponseSchema } from "../types/server"

// Minimum Nova microversion that exposes MAC address and type on server
// addresses (OS-EXT-IPS-MAC / OS-EXT-IPS). We request at least this.
const MIN_ADDRESS_MICROVERSION = "2.47"

// Guard against runaway pagination loops when following servers_links.
const MAX_SERVER_PAGES = 50

/**
 * Nova power_state is reported as an integer; map it to a human-readable label.
 * Values per the Nova API reference.
 */
const POWER_STATE_LABELS: Record<number, string> = {
  0: "NOSTATE",
  1: "RUNNING",
  3: "PAUSED",
  4: "SHUTDOWN",
  6: "CRASHED",
  7: "SUSPENDED",
}

export function powerStateLabel(state: number | undefined | null): string {
  if (state === undefined || state === null) return ""
  return POWER_STATE_LABELS[state] ?? `UNKNOWN (${state})`
}

/**
 * Detect the maximum supported Nova API microversion. Falls back to "2.1".
 */
async function getMaxMicroversion(compute: SignalOpenstackServiceType): Promise<string> {
  try {
    const response = await compute.get("")
    const data = await response.json()

    if (data.version) {
      return data.version.version || "2.1"
    } else if (data.versions) {
      const currentVersion = data.versions.find((v: { status: string }) => v.status === "CURRENT")
      return currentVersion?.version || "2.1"
    }
  } catch {
    // Fallback to 2.1 if detection fails
  }
  return "2.1"
}

function compareMicroversion(a: string, b: string): number {
  const [aMajor, aMinor] = a.split(".").map(Number)
  const [bMajor, bMinor] = b.split(".").map(Number)
  if (aMajor !== bMajor) return aMajor - bMajor
  return (aMinor || 0) - (bMinor || 0)
}

/**
 * Pick the microversion to send. Nova does NOT clamp an over-max request — it
 * answers 406 — so we must never request above the deployment's max. If the max
 * is ≥ 2.47 we use it (full embedded flavor); otherwise we use the deployment's
 * max and accept degraded flavor fields rather than failing every request.
 */
export async function resolveServerMicroversion(compute: SignalOpenstackServiceType): Promise<string> {
  const maxVersion = await getMaxMicroversion(compute)
  return compareMicroversion(maxVersion, MIN_ADDRESS_MICROVERSION) >= 0 ? MIN_ADDRESS_MICROVERSION : maxVersion
}

/**
 * Nova emits MAC and type under namespaced keys ("OS-EXT-IPS-MAC:mac_addr",
 * "OS-EXT-IPS:type"). Copy them onto the flat `mac_addr`/`type` fields the
 * client reads, without dropping the originals.
 */
function normalizeAddress(address: ServerAddress): ServerAddress {
  const macAddr = address.mac_addr ?? address["OS-EXT-IPS-MAC:mac_addr"]
  const type = address.type ?? address["OS-EXT-IPS:type"]
  return { ...address, mac_addr: macAddr, type }
}

function normalizeServerAddresses(server: Server): Server {
  if (!server.addresses) return server
  const addresses = Object.fromEntries(
    Object.entries(server.addresses).map(([network, items]) => [network, items.map(normalizeAddress)])
  )
  return { ...server, addresses }
}

/**
 * Extract the `marker` query param from a Nova `servers_links` "next" href so
 * we can request the next page via `servers/detail?marker=...`.
 */
function markerFromNextLink(href: string | null | undefined): string | undefined {
  if (!href) return undefined
  try {
    return new URL(href).searchParams.get("marker") ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Fetch all servers for the current (already project-scoped) compute service,
 * following Nova pagination (servers_links rel="next") and normalizing
 * addresses. Throws on schema-validation failure or when the pagination safety
 * cap is hit with more pages remaining (so a partial inventory is never
 * returned as if complete). Nova fetch errors propagate to the caller.
 */
export async function fetchAllServers(compute: SignalOpenstackServiceType): Promise<Server[]> {
  const microversion = await resolveServerMicroversion(compute)
  const headers = { "OpenStack-API-Version": `compute ${microversion}` }

  const allServers: Server[] = []
  let marker: string | undefined
  let pageCount = 0

  while (pageCount < MAX_SERVER_PAGES) {
    const options = marker ? { headers, queryParams: { marker } } : { headers }
    const response = await compute.get("servers/detail", options)
    const rawData = await response.json()

    const parsedData = serverResponseSchema.safeParse(rawData)
    if (!parsedData.success) {
      console.error("Zod Parsing Error (servers/detail):")
      console.error(JSON.stringify(parsedData.error.format(), null, 2))
      parsedData.error.issues.forEach((err) => {
        console.error(`Error at path ${err.path.join(".")}: ${err.message}`)
      })
      throw new Error("Failed to parse servers/detail response")
    }

    allServers.push(...parsedData.data.servers)
    pageCount++

    const nextLink = parsedData.data.servers_links?.find((link) => link.rel === "next")
    marker = markerFromNextLink(nextLink?.href)
    if (!marker) break
  }

  // A remaining marker means we stopped at the safety cap with pages left —
  // don't pass off a truncated list as the full inventory.
  if (marker) {
    throw new Error(`Unable to load all instances: Nova pagination exceeded the ${MAX_SERVER_PAGES}-page limit.`)
  }

  return allServers.map(normalizeServerAddresses)
}
