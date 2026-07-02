import { redirect } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"

interface ServiceInfo {
  type: string
  name: string
}

interface RouteParams {
  projectId: string
  provider: string
  storageType: string
  containerName: string
}

/**
 * Validates storage service availability and redirects to appropriate provider/storage type.
 *
 * Redirect logic:
 * 1. If no object-store services available → redirect to project overview
 * 2. If provider is invalid → redirect to fallback provider (swift → ceph)
 * 3. If provider unavailable → redirect to available alternative
 * 4. If storageType doesn't match provider → canonicalize URL
 *
 * @throws redirect - TanStack Router redirect on validation failure
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
  const fallbackProvider = hasSwift ? "swift" : hasEffectiveCeph ? "ceph" : null
  const fallbackStorageType = hasSwift ? "containers" : hasEffectiveCeph ? "buckets" : null

  if (provider !== "swift" && provider !== "ceph") {
    if (!fallbackProvider || !fallbackStorageType) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }
    throw redirect({
      to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
      params: { projectId, provider: fallbackProvider, storageType: fallbackStorageType, containerName },
    })
  }

  if (provider === "swift" && !hasSwift) {
    if (!hasEffectiveCeph) {
      throw redirect({
        to: "/projects/$projectId",
        params: { projectId },
      })
    }

    throw redirect({
      to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
      params: { projectId, provider: "ceph", storageType: "buckets", containerName },
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
      to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
      params: { projectId, provider: "swift", storageType: "containers", containerName },
    })
  }

  // Canonicalize the URL terminology for the resolved provider. Availability is
  // already settled above, so by this point provider is a valid, available
  // swift|ceph. The storageType segment is user-controllable and the router never
  // validates it, so a mismatched noun (e.g. ceph + "containers", swift + "buckets")
  // must redirect to the canonical path to keep URLs normalized.
  if (provider === "swift" || provider === "ceph") {
    const expectedStorageType = provider === "swift" ? "containers" : "buckets"
    if (storageType !== expectedStorageType) {
      throw redirect({
        to: "/projects/$projectId/storage/$provider/$storageType/$containerName/objects",
        params: { projectId, provider, storageType: expectedStorageType, containerName },
      })
    }
  }
}
