import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { ErrorBoundary } from "react-error-boundary"
import { SwiftObjectStorage } from "./-components/SwiftObjectStorage/List"
import { Trans } from "@lingui/react/macro"

export const checkServiceAvailability = (
  availableServices: {
    type: string
    name: string
  }[],
  params: {
    accountId: string
    projectId: string
    _splat?: string | undefined
  }
) => {
  const { _splat: splat = "", accountId } = params

  const serviceIndex = getServiceIndex(availableServices)

  // Redirect to the "Projects Overview" page if no storage services available
  if (!serviceIndex["object-store"]) {
    throw redirect({
      to: "/accounts/$accountId/projects",
      params: { accountId },
    })
  }

  // Redirect to default if specific service not available
  if (splat === "swift" && !serviceIndex["object-store"]["swift"]) {
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/storage/$",
      params: { ...params, _splat: undefined },
    })
  }
}

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/storage/$")({
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
  loader: async ({ context, params }) => {
    const { trpcClient, setPageTitle } = context
    const { _splat: splat } = params

    const availableServices = await trpcClient?.auth.getAvailableServices.query()

    setPageTitle(splat === "objectstorage" ? "Object Storage" : "Object Storage")

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
  const { project, splat } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$",
    select: (params) => {
      return { project: params.projectId, splat: params._splat }
    },
  })

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
            switch (splat) {
              case "swift":
                return <SwiftObjectStorage />
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
