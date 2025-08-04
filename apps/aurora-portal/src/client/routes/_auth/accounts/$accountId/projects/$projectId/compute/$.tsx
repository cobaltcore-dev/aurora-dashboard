import { createFileRoute, ErrorComponent, useParams } from "@tanstack/react-router"
import { useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { ComputeNavBar, ComputeSideNavBar } from "./-components/ComputeNavBar"
import { Overview } from "./-components/Overview"
import { TrpcClient } from "@/client/trpcClient"
import { Instances } from "./-components/Instances/List"
import { Images } from "./-components/Images/List"
import { KeyPairs } from "./-components/KeyPairs/List"
import { ServerGroups } from "./-components/ServerGroups/List"
import { Flavors } from "./-components/Flavors/List"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/compute/$")({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      // Render a custom error message
      return <div>{error.message}</div>
    }

    // Fallback to the default ErrorComponent
    return <ErrorComponent error={error} />
  },
  notFoundComponent: () => {
    return <p>Project not found</p>
  },
  loader: async ({ context }) => {
    const { trpcClient } = context

    return {
      client: trpcClient,
    }
  },
})

function RouteComponent() {
  const { client } = Route.useLoaderData()
  return <ComputeDashboard client={client!} />
}

function ComputeDashboard({ client }: { client: TrpcClient }) {
  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const { project, splat } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
    select: (params) => {
      return { project: params.projectId, splat: params._splat }
    },
  })

  return (
    <div className="container max-w-screen-3xl mx-auto px-6 py-4 grid grid-cols-12 gap-4">
      {/* Row 1: Title & Navigation (Balanced Layout) */}
      <div className="col-span-2 flex flex-col justify-center">
        <h3 className="text-3xl font-medium text-juno-grey-light-1 text-justify pl-5">Compute</h3>
      </div>
      {/* Left Spacing */}
      <div className="col-span-9 flex items-center justify-between py-2">
        <div className="flex-1 flex justify-end">
          <ComputeNavBar viewMode={viewMode} setViewMode={setViewMode} />
        </div>
      </div>
      <div className="col-span-1"></div> {/* Right Spacing */}
      <div className="col-span-2 flex flex-col gap-4">
        <ComputeSideNavBar />
      </div>
      <div className="col-span-9 flex flex-col gap-4">
        <div className="w-full">
          {project ? (
            <ErrorBoundary fallback={<div className="p-4 text-center text-gray-400">Error loading component</div>}>
              {(() => {
                switch (splat) {
                  case "instances":
                    return <Instances client={client} project={project} viewMode={viewMode} />
                  case "images":
                    return <Images project={project} client={client} />
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
            <div className="p-4 text-center text-gray-400">No project selected</div>
          )}
        </div>
      </div>
      <div className="col-span-1" /> {/* Right Spacing */}
    </div>
  )
}
