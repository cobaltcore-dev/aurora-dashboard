import { useEffect, useState } from "react"
import type { Server } from "../../server/Compute/types/models"
import { TrpcClient } from "../trpcClient"
import ServerListView from "./components/ServerListView"
import ServerCardView from "./components/ServerCardView"
import ComputeNavBar from "./components/ComputeNavBar"
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
  const { setCurrentProject } = useAuroraContext()

  const [viewMode, setViewMode] = useState<"list" | "card">("list")
  const params = useParams()

  useEffect(() => {
    client.compute.getServers
      .query()
      .then((data) => updateGetServer({ data, isLoading: false }))
      .catch((error) => updateGetServer({ error: error.message, isLoading: false }))
  }, [])

  useEffect(() => {
    client.project.getProjectById
      .query({ id: params?.projectId || "" })
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
    <div className="flex flex-col bg-[#161b22] p-6 rounded-xl shadow mb-4">
      {/* Header Content */}
      <h1 className="text-gray-200 text-5xl font-bold mb-12">Compute Overview</h1>

      {/* Server List & View Mode Switch */}
      <div className="bg-[#1b1f24] border border-[#30363d] rounded-xl p-6 shadow-lg mb-8">
        {/* Full-Width Container for NavBar & View */}
        <div className="bg-[#161b22] rounded-lg shadow-md p-5">
          <ComputeNavBar viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        {/* View Container */}
        <div className="bg-[#161b22] rounded-lg shadow-md p-5 mt-2">
          {viewMode === "list" ? (
            <ServerListView servers={getServers.data} />
          ) : (
            <ServerCardView servers={getServers.data} />
          )}
        </div>
      </div>
    </div>
  )
}
