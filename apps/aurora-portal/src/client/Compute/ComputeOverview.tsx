import { useEffect, useState } from "react"
import type { Server } from "../../server/Compute/types/models"
import { TrpcClient } from "../trpcClient"
import ServerListView from "./components/ServerListView"
import ServerCardView from "./components/ServerCardView"
import { ComputeNavBar, ComputeSideNavBar } from "./components/ComputeNavBar"
import { useParams } from "wouter"
import { Project } from "../../server/Project/types/models"
import { useAuroraContext } from "../Shell/AuroraProvider"

type GetServersState = {
  data?: Server[]
  error?: string
  isLoading?: boolean
}

type GetProjectByIdState = {
  data?: Project
  error?: string
  isProjectLoading?: boolean
}
export function ComputeOverview({ client }: { client: TrpcClient }) {
  const [getServers, updateGetServer] = useState<GetServersState>({ isLoading: true })
  const [getProjectById, updateProjectById] = useState<GetProjectByIdState>({ isProjectLoading: true })
  const { setCurrentProject, serverSearchTerm } = useAuroraContext()

  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const { projectId } = useParams()

  useEffect(() => {
    console.log(serverSearchTerm)
  }, [serverSearchTerm])

  useEffect(() => {
    client.compute.getServersByProjectId
      .query({ projectId: projectId! })
      .then((data) => updateGetServer({ data, isLoading: false }))
      .catch((error) => updateGetServer({ error: error.message, isLoading: false }))
  }, [])

  useEffect(() => {
    client.project.getProjectById
      .query({ id: projectId || "" })
      .then((data) => {
        setCurrentProject(data)
        return updateProjectById({ data, isProjectLoading: false })
      })
      .catch((error) => updateProjectById({ error: error.message, isProjectLoading: false }))
  }, [])

  if (getServers.isLoading || getProjectById.isProjectLoading)
    return <div className="h-full flex justify-center items-center text-gray-400">Loading...</div>

  if (getServers.error || getProjectById.error)
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
      {/* Row 2: Sidebar & Main Content (Properly Aligned) */}
      <div className="col-span-2 flex flex-col gap-4">
        <ComputeSideNavBar />
      </div>
      <div className="col-span-9 flex flex-col gap-4">
        <div className="w-full">
          {viewMode === "list" ? (
            <ServerListView servers={getServers.data} />
          ) : (
            <ServerCardView servers={getServers.data} />
          )}
        </div>
      </div>
      <div className="col-span-1"></div> {/* Right Spacing */}
    </div>
  )
}
