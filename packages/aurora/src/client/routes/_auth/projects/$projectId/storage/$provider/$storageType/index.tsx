import { createFileRoute, useParams, type NotFoundRouteComponent } from "@tanstack/react-router"
import { z } from "zod"
import { ErrorBoundary } from "react-error-boundary"
import { SwiftContainers } from "../../-components/Swift/Containers"
import { CephBuckets } from "../../-components/Ceph/Buckets"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { guardStorageRoute } from "../../-components/utils/serviceAvailability"
import { StorageNotFound } from "../../-components/StorageNotFound"
import { STORAGE_PROVIDER, isStorageProvider } from "@/client/utils/storageProviders"

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
    section: "storage",
    service: "containers",
    analytics: {
      name: "storage.objectstore.list",
    },
  } satisfies RouteInfo,
  validateSearch: containersSearchSchema,
  head: ({ match }) => ({
    meta: [
      {
        title: isStorageProvider(match.params.provider)
          ? match.params.provider === STORAGE_PROVIDER.SWIFT
            ? "Object Storage (Swift)"
            : "Object Storage (Ceph)"
          : "Object Storage",
      },
    ],
  }),
  component: () => {
    return <StorageDashboard />
  },
  notFoundComponent: StorageNotFound as NotFoundRouteComponent,
  loader: async ({ context, params }) => {
    const { trpcClient } = context
    if (!trpcClient) {
      throw new Error("trpcClient is not available in route context")
    }
    const availableServices = (await trpcClient.auth.getAvailableServices.query()) ?? []
    guardStorageRoute(availableServices, params)
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
    case STORAGE_PROVIDER.SWIFT:
      pageTitle = t`Object Storage (Swift)`
      break
    case STORAGE_PROVIDER.CEPH:
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
              case STORAGE_PROVIDER.SWIFT:
                return <SwiftContainers />
              case STORAGE_PROVIDER.CEPH:
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
