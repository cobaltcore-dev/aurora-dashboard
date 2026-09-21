import { redirect, notFound } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { hasServiceByName } from "@/client/utils/serviceCatalog"
import {
  STORAGE_PROVIDER,
  isStorageProvider,
  storageTypeFor,
  type StorageProvider,
} from "@/client/utils/storageProviders"

export interface ServiceInfo {
  type: string
  name: string
}

/** Reason carried by a `notFound({ data: { reason } })` thrown by the guards below (D10). */
export type StorageNotFoundReason = "provider-not-found" | "provider-unavailable" | "storage-type-mismatch"

/**
 * Resolves swift/ceph availability by service NAME, ignoring the catalog type
 * entirely — matching the backend's own resolution (`ctx.openstack.service("ceph"|"swift")`).
 * Ceph lives in the catalog as `{ type: "object-store-ceph", name: "ceph" }`, so a
 * type-scoped lookup (`serviceIndex["object-store"]["ceph"]`) would miss it.
 */
const getProviderAvailability = (availableServices: ServiceInfo[]) => {
  const serviceIndex = getServiceIndex(availableServices)
  return {
    hasSwift: hasServiceByName(serviceIndex, STORAGE_PROVIDER.SWIFT),
    hasCeph: hasServiceByName(serviceIndex, STORAGE_PROVIDER.CEPH),
  }
}

/**
 * "Does this project have object storage at all?" — a question about the project's
 * capabilities, not about the URL. No → the user has no business on any storage page,
 * so redirect to the project overview rather than 404.
 *
 * Routes reach this through `guardStorageRoute`, which owns the ordering against
 * `validateStorageAccess`.
 */
export const requireObjectStoreService = (availableServices: ServiceInfo[], params: { projectId: string }): void => {
  const { hasSwift, hasCeph } = getProviderAvailability(availableServices)

  if (!hasSwift && !hasCeph) {
    throw redirect({
      to: "/projects/$projectId",
      params: { projectId: params.projectId },
    })
  }
}

/**
 * Provider-only half of `validateStorageAccess`: `notFound()` when the provider segment
 * isn't "swift"/"ceph" at all, or when it is but isn't available for the project.
 * Assumes `requireObjectStoreService` already ran (so at least one provider exists).
 */
const requireAvailableProvider = (availableServices: ServiceInfo[], provider: string): StorageProvider => {
  if (!isStorageProvider(provider)) {
    throw notFound({ data: { reason: "provider-not-found" satisfies StorageNotFoundReason } })
  }

  const { hasSwift, hasCeph } = getProviderAvailability(availableServices)
  const isAvailable = provider === STORAGE_PROVIDER.SWIFT ? hasSwift : hasCeph

  if (!isAvailable) {
    throw notFound({ data: { reason: "provider-unavailable" satisfies StorageNotFoundReason } })
  }

  return provider
}

/**
 * "Is this URL a valid address?" — the complement to `requireObjectStoreService`.
 * `notFound()` for an invalid provider, an unavailable provider, or a `storageType`
 * that isn't canonical for the resolved provider (#1081 — e.g. `swift/buckets`).
 *
 * Both storage routes deliberately behave the same: a non-canonical `storageType` is a
 * wrong address, not something to silently rewrite. The objects route used to
 * `redirect` to the canonical path here because it had a concrete `containerName`
 * to land on; that asymmetry was dropped — the app never generated a non-canonical
 * objects URL, so the redirect normalized nothing real while making this one route
 * the sole exception to the 404 rule.
 *
 * Assumes `requireObjectStoreService` already ran; `guardStorageRoute` guarantees that.
 *
 * Returns the provider narrowed to a `StorageProvider` — having proved the segment is one,
 * it would be a waste to make the caller re-narrow it.
 */
export const validateStorageAccess = (
  availableServices: ServiceInfo[],
  params: { provider: string; storageType: string }
): StorageProvider => {
  const { provider, storageType } = params

  const resolvedProvider = requireAvailableProvider(availableServices, provider)

  if (storageType !== storageTypeFor(resolvedProvider)) {
    throw notFound({ data: { reason: "storage-type-mismatch" satisfies StorageNotFoundReason } })
  }

  return resolvedProvider
}

/**
 * The whole storage-route guard — the only entry point routes should call.
 *
 * The two checks answer different questions and must run in this order: project
 * capability first (redirect to the overview), address validity second (404). A project
 * with no object storage at all would otherwise 404 on a bad provider segment instead of
 * being sent somewhere useful. Keeping the order here rather than at each call site means
 * a new storage route cannot get it wrong.
 *
 * Call it from a `loader`, never from `beforeLoad`: `notFound()` is only intercepted by
 * `notFoundComponent` when thrown from a loader (see services/$serviceType.tsx for the
 * same constraint). A `redirect` works from either, so the loader hosts both.
 *
 * Answers only questions the URL can answer. Whether the resource named further down the
 * URL exists is a separate question with a separate answer — see `containerExistence.ts`,
 * which the objects route runs after this one.
 */
export const guardStorageRoute = (
  availableServices: ServiceInfo[],
  params: { projectId: string; provider: string; storageType: string }
): StorageProvider => {
  requireObjectStoreService(availableServices, params)
  return validateStorageAccess(availableServices, params)
}
