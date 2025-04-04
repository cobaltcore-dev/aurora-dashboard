import { useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { TrpcClient } from "../trpcClient"
import { ComputeNavBar, ComputeSideNavBar } from "./components/ComputeNavBar"
import { useParams } from "react-router-dom"
import { Overview } from "./Overview"
import { Instances } from "./Instances/List"
import { KeyPairs } from "./KeyPairs/List"
import { Images } from "./Images/List"
import { ServerGroups } from "./ServerGroups/List"

export function ComputeDashboard({ client }: { client: TrpcClient }) {
  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const { "*": splat, project } = useParams()

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
                    return <Instances client={client} viewMode={viewMode} />
                  case "keypairs":
                    return <KeyPairs project={project} client={client} />
                  case "images":
                    return <Images project={project} client={client} />
                  case "servergroups":
                    return <ServerGroups project={project} client={client} />
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
