import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import { useState } from "react"
import { ProjectsOverviewNavBar, ViewMode } from "./-components/ProjectOverviewNavBar"
import { ProjectCardView } from "./-components/ProjectCardView"
import { ProjectListView } from "./-components/ProjectListView"
import { Message } from "@cloudoperators/juno-ui-components"

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
    const data = await context.trpcClient?.auth.setCurrentScope
      .mutate({
        type: "domain",
        domainId: params.accountId || "",
      })
      .catch(() => null)
    return {
      userHasAccountAccess: !!data,
      crumbDomain: { path: `/accounts/${params.accountId}/projects`, name: data?.domain?.name || "Projects" },
    }
  },

  validateSearch: searchSchema,

  loaderDeps: ({ search }) => ({
    search: search.search || "",
  }),

  loader: async ({ context, params, deps }) => {
    const projects = await context.trpcClient?.project.searchProjects.query({
      search: deps.search,
    })
    return {
      accountId: params.accountId,
      userHasAccountAccess: context.userHasAccountAccess,
      projects,
      crumbDomain: context.crumbDomain,
    }
  },
})

function ProjectsOverview() {
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const { accountId, userHasAccountAccess, projects } = Route.useLoaderData()
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
        {!userHasAccountAccess && (
          <div className="px-4">
            <Message variant="info">
              You do not have access to {accountId} account. Only projects you have access to will be shown.
            </Message>
          </div>
        )}
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
