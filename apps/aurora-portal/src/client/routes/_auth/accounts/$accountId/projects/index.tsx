import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import { useState } from "react"
import { ProjectsOverviewNavBar, ViewMode } from "./-components/ProjectOverviewNavBar"
import { ProjectCardView } from "./-components/ProjectCardView"
import { ProjectListView } from "./-components/ProjectListView"
import { AccountSubNavigation } from "./-components/AccountSubNavigation"
import { z } from "zod"

const searchSchema = z.object({
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/")({
  component: ProjectsOverview,
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      return <div>{error.message}</div>
    }
    return <ErrorComponent error={error} />
  },
  notFoundComponent: () => {
    return <p>Projects not found</p>
  },
  beforeLoad: async ({ context, params }) => {
    const data = await context.trpcClient?.auth.setCurrentScope.mutate({
      type: "domain",
      domainId: params.accountId || "",
    })
    return {
      crumbDomain: { path: `/accounts/${params.accountId}/projects`, name: data?.domain?.name },
    }
  },

  validateSearch: searchSchema,

  loaderDeps: ({ search }) => ({
    search: search.search || "",
  }),

  loader: async ({ context, deps }) => {
    const projects = await context.trpcClient?.project.searchProjects.query({
      search: deps.search,
    })

    return {
      projects,
      crumbDomain: context.crumbDomain,
    }
  },
})

export function ProjectsOverview() {
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
      <div className="h-full w-full 2xl:w-5/8 xl:w-2/3 lg:w-3/4 mx-auto max-w-full p-4">
        <div className="w-full mx-auto">
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
