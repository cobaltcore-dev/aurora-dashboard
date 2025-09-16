import { createFileRoute, ErrorComponent, redirect, useParams } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { ComputeSideNavBar } from "./-components/ComputeNavBar"
import { Overview } from "./-components/Overview"
import { TrpcClient } from "@/client/trpcClient"
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
  const { _splat: splat = "" } = params

  let shouldNavigateToOverview = false

  if (splat === "images" && !availableServices?.find(({ name, type }) => type === "image" && name === "glance")) {
    shouldNavigateToOverview = true
  }

  if (
    ["instances", "keypairs", "servergroups", "flavors"].includes(splat) &&
    !availableServices?.find(({ name, type }) => type === "compute" && name === "nova")
  ) {
    shouldNavigateToOverview = true
  }

  if (shouldNavigateToOverview) {
    // Redirect to the "Compute Dashboard Overview" if service is not available
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
    return <p>Project not found</p>
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
  const { client, availableServices } = Route.useLoaderData()
  return <ComputeDashboard client={client!} availableServices={availableServices!} />
}

function ComputeDashboard({
  client,
  availableServices,
}: {
  client: TrpcClient
  availableServices: {
    type: string
    name: string
  }[]
}) {
  const { project, splat } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
    select: (params) => {
      return { project: params.projectId, splat: params._splat }
    },
  })

  return (
    <div className="container max-w-screen-3xl mx-auto px-6 py-4 grid grid-cols-12 gap-4">
      <div className="col-span-2 flex flex-col gap-4">
        <ComputeSideNavBar availableServices={availableServices} />
      </div>
      <div className="col-span-9 flex flex-col gap-4">
        <div className="w-full">
          {project ? (
            <ErrorBoundary fallback={<div className="p-4 text-center text-gray-400">Error loading component</div>}>
              {(() => {
                switch (splat) {
                  case "instances":
                    return <Instances client={client} project={project} viewMode="list" />
                  case "images":
                    return <Images client={client} />
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
      </div>
      <div className="col-span-1" /> {/* Right Spacing */}
    </div>
  )
}
