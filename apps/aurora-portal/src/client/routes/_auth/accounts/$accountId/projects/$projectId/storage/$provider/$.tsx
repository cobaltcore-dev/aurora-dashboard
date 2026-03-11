import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { SwiftObjectStorage } from "../-components/SwiftObjectStorage/List"
import { Trans, useLingui } from "@lingui/react/macro"

export const checkServiceAvailability = (
  availableServices: {
    type: string
    name: string
  }[],
  params: {
    accountId: string
    projectId: string
    provider: string
    _splat?: string | undefined
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
  if (provider === "swift" && !serviceIndex["object-store"]["swift"]) {
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/$",
      params: { ...params, provider: "ceph", _splat: undefined },
    })
  }

  if (provider === "ceph" && !serviceIndex["object-store"]["ceph"]) {
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/storage/$provider/$",
      params: { ...params, provider: "swift", _splat: undefined },
    })
  }
}

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/storage/$provider/$")({
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
  const { project, provider /* splat */ } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/$",
    select: (params) => {
      return { project: params.projectId, provider: params.provider /* splat: params._splat */ }
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
                return <SwiftObjectStorage />
              case "ceph":
                return <SwiftObjectStorage /> // replace with CephObjectStorage when available
              default:
                return <SwiftObjectStorage />
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
