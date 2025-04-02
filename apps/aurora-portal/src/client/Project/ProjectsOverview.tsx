import { useEffect, useState } from "react"
import { ProjectsOverviewNavBar, ViewMode } from "./components/ProjectOverviewNavBar"
import { Project } from "../../server/Project/types/models"
import { TrpcClient } from "../trpcClient"
import { ProjectCardView } from "./components/ProjectCardView"
import { ProjectListView } from "./components/ProjectListView"

type GetProjectState = {
  data?: Project[]
  error?: string
  isLoading?: boolean
}

export function ProjectsOverview({ client }: { client: TrpcClient["project"] }) {
  const [getProjects, updateGetProjects] = useState<GetProjectState>({ isLoading: true })
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    client.getAuthProjects
      .query()
      .then((data) => updateGetProjects({ data, isLoading: false }))
      .catch((error) => updateGetProjects({ error: error.message, isLoading: false }))
  }, [])

  if (getProjects.isLoading)
    return <div className="h-full flex justify-center items-center text-gray-400">Loading...</div>

  if (getProjects.error)
    return <div className="h-full flex justify-center items-center text-red-500">Error: {getProjects.error}</div>

  const filteredProjects =
    getProjects.data?.filter((project) => {
      const searchRegex = new RegExp(searchTerm, "i")
      const projectString = JSON.stringify(project)
      return searchRegex.test(projectString)
    }) || []

  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4">
      {/* Left Space */}
      <div className="col-span-2"></div>

      {/* Main Content Area - Ensuring NavBar and Content Align Properly */}
      <div className="col-span-8 flex flex-col gap-4">
        {/* Navigation Bar */}
        <ProjectsOverviewNavBar
          viewMode={viewMode}
          setViewMode={setViewMode}
          onChange={(term: string) => {
            setSearchTerm(term)
          }}
        />

        {/* Content - Make sure it has no extra margin/padding that misaligns */}
        <div className="w-full pt-5">
          {viewMode === "list" ? (
            <ProjectListView projects={filteredProjects} />
          ) : (
            <ProjectCardView projects={filteredProjects} />
          )}
        </div>
      </div>

      {/* Right Space */}
      <div className="col-span-2"></div>
    </div>
  )
}
