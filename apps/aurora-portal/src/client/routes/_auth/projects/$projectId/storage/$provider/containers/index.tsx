import { createFileRoute, redirect, useParams } from "@tanstack/react-router"
import { z } from "zod"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { SwiftContainers } from "../../-components/Swift/Containers"
import { CephContainers } from "../../-components/Ceph/Containers"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

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
      to: "/projects/$projectId/compute/overview",
      params: { projectId },
    })
  }

  // Check provider availability
  // Note: Ceph might not be in service catalog but configured via CEPH_S3_ENDPOINT env var
  const hasSwift = Boolean(serviceIndex["object-store"]["swift"])
  const hasCeph = Boolean(serviceIndex["object-store"]["ceph"])

  // TEMPORARY: Allow Ceph access even if not in catalog (relies on env config)
  // TODO: Properly register Ceph in OpenStack service catalog
  const cephFallbackEnabled = true // Set to false once Ceph is in catalog

  const fallbackProvider = hasSwift ? "swift" : hasCeph || cephFallbackEnabled ? "ceph" : null

  if (provider !== "swift" && provider !== "ceph") {
    if (!fallbackProvider) {
      throw redirect({
        to: "/projects/$projectId/compute/overview",
        params: { projectId },
      })
    }
    throw redirect({
      to: "/projects/$projectId/storage/$provider/containers",
      params: { ...params, provider: fallbackProvider },
    })
  }

  if (provider === "swift" && !hasSwift) {
    if (!hasCeph && !cephFallbackEnabled) {
      throw redirect({
        to: "/projects/$projectId/compute/overview",
        params: { projectId },
      })
    }

    throw redirect({
      to: "/projects/$projectId/storage/$provider/containers",
      params: { ...params, provider: "ceph" },
    })
  }

  if (provider === "ceph" && !hasCeph && !cephFallbackEnabled) {
    if (!hasSwift) {
      throw redirect({
        to: "/projects/$projectId/compute/overview",
        params: { projectId },
      })
    }

    throw redirect({
      to: "/projects/$projectId/storage/$provider/containers",
      params: { ...params, provider: "swift" },
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

export const Route = createFileRoute("/_auth/projects/$projectId/storage/$provider/containers/")({
  staticData: { section: "storage", service: "containers" } satisfies RouteInfo,
  validateSearch: containersSearchSchema,
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
    from: "/_auth/projects/$projectId/storage/$provider/containers/",
    select: (params) => {
      return { project: params.projectId, provider: params.provider }
    },
  })

  const { setPageTitle } = Route.useRouteContext()
  const { t } = useLingui()

  let pageTitle: string
  switch (provider) {
    case "swift":
    case "ceph":
      pageTitle = t`Object Storage`
      break
    default:
      pageTitle = t`Storage Overview`
  }
  setPageTitle(pageTitle)

  return (
    <div>
      <ContentHeader title={pageTitle} projectId={project} />
      {project ? (
        <ErrorBoundary
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
                return <CephContainers />
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
