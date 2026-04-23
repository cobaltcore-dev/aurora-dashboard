import { createFileRoute, redirect } from "@tanstack/react-router"
import { useState } from "react"
import { ProjectsOverviewNavBar, ViewMode } from "./-components/ProjectOverviewNavBar"
import { ProjectCardView } from "./-components/ProjectCardView"
import { ProjectListView } from "./-components/ProjectListView"
import { Message } from "@cloudoperators/juno-ui-components"
import { RouteError } from "../../../../../components/Error/RouteError"
import { TRPCClientError } from "@trpc/client"

import { z } from "zod"

const searchSchema = z.object({
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/")({
  component: ProjectsOverview,
  errorComponent: ({ error }) => (
    <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
  ),
  notFoundComponent: () => {
    return <p>Projects not found</p>
  },
  beforeLoad: async ({ context, params }) => {
    const data = await context.trpcClient?.auth.setCurrentScope
      .mutate({
        type: "domain",
        domainId: params.accountId || "",
      })
      .catch(async () => {
        // Rescope failed - likely cross-domain token conflict
        // Check if we have a valid session but with different domain
        const currentSession = await context.trpcClient?.auth.getCurrentUserSession.query()
        if (currentSession?.domain?.id && currentSession.domain.id !== params.accountId) {
          // Token is scoped to a different domain - redirect to correct domain
          throw redirect({
            to: "/accounts/$accountId/projects",
            params: { accountId: currentSession.domain.id },
          })
        }
        return null
      })
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
