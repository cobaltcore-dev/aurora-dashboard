import { useEffect, useState } from "react"
import type { Server } from "../../server/Compute/types/server"
import { TrpcClient } from "../trpcClient"
import { ComputeNavBar, ComputeSideNavBar } from "./components/ComputeNavBar"
import { useParams } from "react-router-dom"
import { Instances } from "./Instances/List"
import { KeyPairs } from "./KeyPairs/List"
import { Images } from "./Images/List"
import { ServerGroups } from "./ServerGroups/List"

type GetServersState = {
  data?: Server[]
  error?: string
  isLoading?: boolean
}

export function ComputeOverview({ client }: { client: TrpcClient }) {
  const [getServers, updateGetServer] = useState<GetServersState>({ isLoading: true })

  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const { project } = useParams()
  const { "*": splat } = useParams()

  useEffect(() => {
    client.compute.getServersByProjectId
      .query({ projectId: project! })
      .then((data) => updateGetServer({ data, isLoading: false }))
      .catch((error) => updateGetServer({ error: error.message, isLoading: false }))
  }, [])

  if (getServers.isLoading)
    return <div className="h-full flex justify-center items-center text-gray-400">Loading...</div>

  if (getServers.error)
    return <div className="h-full flex justify-center items-center text-red-500">Error: {getServers.error}</div>

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
          {(() => {
            switch (splat) {
              case "instances":
                return <Instances viewMode={viewMode} data={getServers.data!} />
              case "keypairs":
                return <KeyPairs />
              case "images":
                return <Images client={client} />
              case "servergroups":
                return <ServerGroups />
              default:
                return <Instances viewMode={viewMode} data={getServers.data!} />
            }
          })()}
        </div>
      </div>
      <div className="col-span-1"></div> {/* Right Spacing */}
    </div>
  )
}
