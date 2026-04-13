import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { z } from "zod"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { SwiftContainers } from "../../-components/Swift/Containers"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const checkServiceAvailability = (
  availableServices: {
    type: string
    name: string
  }[],
  params: {
    accountId: string
    projectId: string
    provider: string
  }
) => {
  const { provider, accountId } = params

  const serviceIndex = getServiceIndex(availableServices)

  // Redirect to the "Projects Overview" page if no storage services available
  if (!serviceIndex["object-store"]) {
    throw redirect({
      to: "/accounts/$accountId/projects",
      params: { accountId },
    })
  }

  // Redirect to default if specific provider not available
  const hasSwift = Boolean(serviceIndex["object-store"]["swift"])
  const hasCeph = Boolean(serviceIndex["object-store"]["ceph"])

  const fallbackProvider = hasSwift ? "swift" : hasCeph ? "ceph" : null

  if (provider !== "swift" && provider !== "ceph") {
    if (!fallbackProvider) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers",
      params: { ...params, provider: fallbackProvider },
    })
  }

  if (provider === "swift" && !hasSwift) {
    if (!hasCeph) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }

    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers",
      params: { ...params, provider: "ceph" },
    })
  }

  if (provider === "ceph" && !hasCeph) {
    if (!hasSwift) {
      throw redirect({
        to: "/accounts/$accountId/projects",
        params: { accountId },
      })
    }

    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers",
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

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/")({
  staticData: { section: "storage", service: "containers" } satisfies RouteInfo,
  validateSearch: containersSearchSchema,
  component: () => {
    return <StorageDashboard />
  },
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      return <div>{error.message}</div>
    }
    return <ErrorComponent error={error} />
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
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/",
    select: (params) => {
      return { project: params.projectId, provider: params.provider }
    },
  })

  const { setPageTitle } = Route.useRouteContext()
  const { t } = useLingui()

  switch (provider) {
    case "swift":
      setPageTitle(t`Object Storage`)
      break
    case "ceph":
      setPageTitle(t`Object Storage`)
      break
    default:
      setPageTitle(t`Storage Overview`)
  }

  return (
    <div>
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
                return <div>Ceph Containers</div> // replace with CephContainers when available
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
