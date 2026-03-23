import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { Trans, useLingui } from "@lingui/react/macro"
import { SwiftObjects } from "../../../../-components/Swift/Objects"
import { z } from "zod"

export const checkServiceAvailability = (
  availableServices: {
    type: string
    name: string
  }[],
  params: {
    accountId: string
    projectId: string
    provider: string
    containerName: string
  }
) => {
  const { provider, accountId, projectId, containerName } = params

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
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/$",
      params: { accountId, projectId, provider: fallbackProvider, containerName },
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
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/$",
      params: { accountId, projectId, provider: "ceph", containerName },
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
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/$",
      params: { accountId, projectId, provider: "swift", containerName },
    })
  }
}

// Search params schema — prefix is base64-encoded to safely carry "/" chars in the URL
const objectsSearchSchema = z.object({
  prefix: z.string().optional(),
})

export const Route = createFileRoute(
  "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/$"
)({
  validateSearch: objectsSearchSchema,
  component: () => {
    return <ObjectsDashboard />
  },
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      return <div>{error.message}</div>
    }
    return <ErrorComponent error={error} />
  },
  notFoundComponent: () => {
    return <p>Storage container not found</p>
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

function ObjectsDashboard() {
  const { project, provider, containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/$",
    select: (params) => ({
      project: params.projectId,
      provider: params.provider,
      containerName: params.containerName,
    }),
  })

  // Extract prefix so the ErrorBoundary can reset when the user navigates to
  // a different folder — without this, a thrown error stays visible until reload.
  const { prefix } = Route.useSearch()

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
          resetKeys={[project, provider, containerName, prefix]}
          fallback={
            <div className="p-4 text-center">
              <Trans>Error loading component</Trans>
            </div>
          }
        >
          {(() => {
            switch (provider) {
              case "swift":
                return <SwiftObjects />
              case "ceph":
                return (
                  <div className="p-4">
                    <Trans>Ceph Objects — {containerName}</Trans>
                  </div>
                )
              default:
                return (
                  <div className="p-4">
                    <Trans>Objects — {containerName}</Trans>
                  </div>
                )
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
