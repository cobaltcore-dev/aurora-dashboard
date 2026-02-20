import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { TrpcClient } from "@/client/trpcClient"
import { ErrorBoundary } from "react-error-boundary"
import { Overview } from "./-components/Overview"
import { Instances } from "./-components/Instances/List"
import { Images } from "./-components/Images/List"
import { KeyPairs } from "./-components/KeyPairs/List"
import { ServerGroups } from "./-components/ServerGroups/List"
import { Flavors } from "./-components/Flavors/List"

const checkServiceAvailability = (
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

  let shouldNavigateToOverview = false

  const serviceIndex = getServiceIndex(availableServices)

  // Redirect to the "Projects Overview" page if none of compute/network services available
  if (!serviceIndex["image"] && !serviceIndex["compute"] && !serviceIndex["network"]) {
    throw redirect({
      to: "/accounts/$accountId/projects",
      params: { accountId },
    })
  }

  if (splat === "images" && !serviceIndex["image"]?.["glance"]) {
    shouldNavigateToOverview = true
  }

  if (["instances", "keypairs", "servergroups", "flavors"].includes(splat) && !serviceIndex["compute"]?.["nova"]) {
    shouldNavigateToOverview = true
  }

  if (shouldNavigateToOverview) {
    // Redirect to the "Compute Services Overview" page if a specific compute service is not available
    throw redirect({
      to: "/accounts/$accountId/projects/$projectId/compute/$",
      params: { ...params, _splat: undefined },
    })
  }
}

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/$")({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      return <div>{error.message}</div>
    }
    return <ErrorComponent error={error} />
  },
  notFoundComponent: () => {
    return <p>Compute service not found</p>
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

function RouteComponent() {
  const { client } = Route.useLoaderData()
  return <ComputeDashboard client={client!} />
}

function ComputeDashboard({ client }: { client: TrpcClient }) {
  const { project, splat } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
    select: (params) => {
      return { project: params.projectId, splat: params._splat }
    },
  })

  return (
    <div>
      {project ? (
        <ErrorBoundary fallback={<div className="p-4 text-center">Error loading component</div>}>
          {(() => {
            switch (splat) {
              case "instances":
                return <Instances client={client} project={project} viewMode="list" />
              case "images":
                return <Images />
              case "keypairs":
                return <KeyPairs project={project} client={client} />
              case "servergroups":
                return <ServerGroups project={project} client={client} />
              case "flavors":
                return <Flavors project={project} client={client} />
              default:
                return <Overview project={project} client={client} />
            }
          })()}
        </ErrorBoundary>
      ) : (
        <div className="p-4 text-center">No project selected</div>
      )}
    </div>
  )
}
