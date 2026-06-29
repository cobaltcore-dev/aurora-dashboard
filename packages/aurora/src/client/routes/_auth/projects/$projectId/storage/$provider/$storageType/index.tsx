import { createFileRoute, redirect, useParams } from "@tanstack/react-router"
import { z } from "zod"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { SwiftContainers } from "../../-components/Swift/Containers"
import { CephBuckets } from "../../-components/Ceph/Buckets"
import { Trans, useLingui } from "@lingui/react/macro"
import { ROUTE_SECTIONS, ROUTE_SERVICES, type RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

/**
 * Validates that the requested storage provider is available for the given project,
 * and redirects to an appropriate fallback route when it is not.
 *
 * Redirect rules (in priority order):
 * 1. No `object-store` service at all → redirect to the project overview.
 * 2. Unknown provider (neither "swift" nor "ceph") → redirect to the first
 *    available provider, or to the project overview if none exist.
 * 3. Requested provider unavailable → redirect to the other provider,
 *    or to the project overview if no alternative exists.
 *
 * Ceph has a temporary fallback flag (`cephFallbackEnabled`) that treats it as
 * available even when absent from the OpenStack service catalog.
 *
 * @throws {redirect} - Always throws a TanStack Router redirect; never returns normally
 *   when the requested provider/project combination is unavailable.
 */
export const checkServiceAvailability = (
  availableServices: {
    type: string
    name: string
  }[],
  params: {
    projectId: string
    provider: string
  }
) => {
  const { provider, projectId } = params

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
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { ...params, provider: fallbackProvider, storageType: fallbackStorageType },
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
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { ...params, provider: "ceph", storageType: "buckets" },
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
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { ...params, provider: "swift", storageType: "containers" },
    })
  }
}

// Search params schema
// - sortBy: active sort column — persisted for deep links and back navigation
// - sortDirection: "asc" | "desc" — persisted alongside sortBy
// - search: active filter string — persisted so deep links preserve the current search
const containersSearchSchema = z.object({
  sortBy: z.enum(["name", "count", "bytes", "last_modified"]).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/storage/$provider/$storageType/")({
  staticData: {
    section: ROUTE_SECTIONS.STORAGE,
    service: ROUTE_SERVICES.OBJECT_STORE,
    sectionCrumb: { labelKey: "Storage" },
    crumb: { useParamAsLabel: "provider" },
  } satisfies RouteInfo,
  validateSearch: containersSearchSchema,
  head: ({ match }) => ({
    meta: [
      {
        title:
          match.params.provider === "swift"
            ? "Object Storage (Swift)"
            : match.params.provider === "ceph"
              ? "Object Storage (Ceph)"
              : "Storage Overview",
      },
    ],
  }),
  component: () => {
    return <StorageDashboard />
  },
  notFoundComponent: () => {
    return <p>Storage service not found</p>
  },
  loader: async ({ context }) => {
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()

    return {
      client: trpcClient,
      availableServices,
    }
  },
  beforeLoad: async ({ context, params }) => {
    const { trpcClient } = context
    const availableServices = await trpcClient?.auth.getAvailableServices.query()
    checkServiceAvailability(availableServices!, params)
  },
})

function StorageDashboard() {
  const { project, provider } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/",
    select: (params) => {
      return { project: params.projectId, provider: params.provider, storageType: params.storageType }
    },
  })

  const { t } = useLingui()

  let pageTitle: string
  switch (provider) {
    case "swift":
      pageTitle = t`Object Storage (Swift)`
      break
    case "ceph":
      pageTitle = t`Object Storage (Ceph)`
      break
    default:
      pageTitle = t`Storage Overview`
  }

  return (
    <div>
      <ContentHeader title={pageTitle} projectId={project} />
      {project ? (
        <ErrorBoundary
          resetKeys={[project, provider]}
          fallback={
            <div className="p-4 text-center">
              <Trans>Error loading component</Trans>
            </div>
          }
        >
          {(() => {
            switch (provider) {
              case "swift":
                return <SwiftContainers />
              case "ceph":
                return <CephBuckets />
              default:
                return <div>Storage Overview Page</div> // replace when available
            }
          })()}
        </ErrorBoundary>
      ) : (
        <div className="p-4 text-center">
          <Trans>No project selected</Trans>
        </div>
      )}
    </div>
  )
}
