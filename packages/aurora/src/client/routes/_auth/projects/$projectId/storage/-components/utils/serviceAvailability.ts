import { notFound, redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"

interface ServiceInfo {
  type: string
  name: string
}

interface RouteParams {
  projectId: string
  provider: string
  storageType: string
  // Present for the objects (bucket/container detail) route, absent for the
  // list (buckets/containers) route  determines which route the redirects below target.
  containerName?: string
}

const KNOWN_STORAGE_TYPES = ["containers", "buckets"] as const

const buildTarget = (containerName: string | undefined) =>
  `/projects/$projectId/storage/$provider/$storageType${containerName ? "/$containerName/objects" : ""}` as const

const buildParams = (
  base: { projectId: string; provider: string; storageType: string },
  containerName: string | undefined
) => (containerName ? { ...base, containerName } : base)

/**
 * Validates the *shape* of provider/storageType pure and synchronous, no network
 * dependency. Call this before fetching availableServices so garbage/mismatched URLs
 * 404 or canonicalize instantly instead of paying for a round-trip first.
 *
 * 1. If provider is not a recognized noun at all ("swift"/"ceph") notFound()
 * 2. If storageType is not a recognized noun at all ("containers"/"buckets")  notFound()
 * 3. If storageType doesn't match provider (but is a recognized noun)  canonicalize URL
 *
 * @throws redirect - canonicalizing a recognized-but-mismatched storageType
 *  * @throws notFound - provider or storageType isn't a recognized noun
 *  */
export const validateStorageRouteShape = (
  params: Pick<RouteParams, "projectId" | "provider" | "storageType" | "containerName">
) => {
  const { provider, projectId, storageType, containerName } = params

  // provider is user-controllable and part of the URL structure itself (not just a
  // catalog-availability question) . anything other than the two known nouns is garbage.
  if (provider !== "swift" && provider !== "ceph") {
    throw notFound()
  }

  // The storageType segment is user-controllable and independent of service availability:
  // a value outside the known noun set ("containers"/"buckets") is garbage and must 404,
  // while a recognized-but-mismatched noun (e.g. ceph + "containers", swift + "buckets")
  // is just canonicalized via redirect.
  const expectedStorageType = provider === "swift" ? "containers" : "buckets"
  if (storageType !== expectedStorageType) {
    if (!KNOWN_STORAGE_TYPES.includes(storageType as (typeof KNOWN_STORAGE_TYPES)[number])) {
      throw notFound()
    }
    throw redirect({
      to: buildTarget(containerName),
      params: buildParams({ projectId, provider, storageType: expectedStorageType }, containerName),
    })
  }
}

/**
 * Validates storage service availability and redirects to an available alternative
 * provider. Assumes validateStorageRouteShape() already ran  provider/storageType
 *  * are structurally valid by this point.
 *  *
 * 1. If no object-store services available  redirect to project overview
 *  * 2. If the requested provider is unavailable  redirect to the available alternative
 *  *
 * @throws redirect - TanStack Router redirect on validation failure
 */
export const checkServiceAvailability = (availableServices: ServiceInfo[], params: RouteParams) => {
  const { provider, projectId, containerName } = params

  const serviceIndex = getServiceIndex(availableServices)

  // Redirect to the "Projects Overview" page if no storage services available
  if (!serviceIndex["object-store"]) {
    throw redirect({
      to: "/projects/$projectId",
      params: { projectId },
    })
  }

  // Check provider availability
  const hasSwift = Boolean(serviceIndex["object-store"]["swift"])
  const hasCeph = Boolean(serviceIndex["object-store"]["ceph"])

  // TEMPORARY: Allow Ceph access even if not in catalog (relies on env config)
  // TODO: Properly register Ceph in OpenStack service catalog
  const cephFallbackEnabled = true // Set to false once Ceph is in catalog

  // Effective availability includes fallback flag for Ceph
  const hasEffectiveCeph = hasCeph || cephFallbackEnabled

  if (provider === "swift" && !hasSwift) {
    if (!hasEffectiveCeph) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }

    throw redirect({
      to: buildTarget(containerName),
      params: buildParams({ projectId, provider: "ceph", storageType: "buckets" }, containerName),
    })
  }

  if (provider === "ceph" && !hasEffectiveCeph) {
    if (!hasSwift) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }

    throw redirect({
      to: buildTarget(containerName),
      params: buildParams({ projectId, provider: "swift", storageType: "containers" }, containerName),
    })
  }
}
