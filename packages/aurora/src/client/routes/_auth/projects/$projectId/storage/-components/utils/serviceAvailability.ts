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
 * Validates storage service availability and redirects to appropriate provider/storage type.
 *
 * Redirect logic:
 * 1. If no object-store services available → redirect to project overview
 * 2. If provider is not a recognized noun at all ("swift"/"ceph")  notFound()
 * 3. If provider unavailable → redirect to available alternative
 * 4. If storageType is not a recognized noun at all ("containers"/"buckets")  notFound()
 * 5. If storageType doesn't match provider (but is a recognized noun)  canonicalize URL
 *
 * @throws redirect - TanStack Router redirect on validation failure
 * @throws notFound - TanStack Router not-found on an unrecognized provider or storageType
 */
export const checkServiceAvailability = (availableServices: ServiceInfo[], params: RouteParams) => {
  const { provider, projectId, storageType, containerName } = params

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

  if (provider !== "swift" && provider !== "ceph") {
    throw notFound()
  }

  // provider is user-controllable and part of the URL structure itself (not just a
  // catalog-availability question)  anything other than the two known nouns is garbage.)
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

  // By this point provider is a valid, available swift|ceph. The storageType segment
  // is user-controllable and was never validated: a value outside the known noun set
  // ("containers"/"buckets") is garbage and must 404, while a recognized-but-mismatched
  // noun (e.g. ceph + "containers", swift + "buckets") is just canonicalized via redirect.
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
