import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ProjectsOverviewNavBar, ViewMode } from "@/client/routes/_auth/projects/-components/ProjectOverviewNavBar"
import { ProjectCardView } from "@/client/routes/_auth/projects/-components/ProjectCardView"
import { ProjectListView } from "@/client/routes/_auth/projects/-components/ProjectListView"
import { RouteError } from "@/client/components/Error/RouteError"
import { TRPCClientError } from "@trpc/client"

import { z } from "zod"

const searchSchema = z.object({
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/")({
  component: ProjectsOverview,
  errorComponent: ({ error }) => (
    <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
  ),
  notFoundComponent: () => {
    return <p>Projects not found</p>
  },

  validateSearch: searchSchema,

  loaderDeps: ({ search }) => ({
    search: search.search || "",
  }),

  loader: async ({ context, deps }) => {
    // Use getAuthProjects which handles rescoping internally
    const allProjects = await context.trpcClient?.project.getAuthProjects.query()

    // Filter projects based on search term
    let projects = allProjects
    if (deps.search && deps.search.trim() !== "") {
      const searchTermLower = deps.search.toLowerCase()
      projects = allProjects?.filter(
        (project) =>
          project.name?.toLowerCase().includes(searchTermLower) ||
          project.description?.toLowerCase().includes(searchTermLower)
      )
    }

    return {
      projects,
    }
  },
})

function ProjectsOverview() {
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const { projects } = Route.useLoaderData()
  const { search = "" } = Route.useSearch()
  const navigate = Route.useNavigate()

  const handleSearch = (value: string) => {
    navigate({
      search: { search: value },
      replace: true,
    })
  }

  return (
    <div>
      <div className="mx-auto h-full w-full max-w-full p-4 lg:w-3/4 xl:w-2/3 2xl:w-5/8">
        <div className="mx-auto w-full">
          <ProjectsOverviewNavBar
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchTerm={search}
            onSearch={handleSearch}
          />
          <div className="w-full pt-5">
            {viewMode === "list" ? <ProjectListView projects={projects} /> : <ProjectCardView projects={projects} />}
          </div>
        </div>
      </div>
    </div>
  )
}
