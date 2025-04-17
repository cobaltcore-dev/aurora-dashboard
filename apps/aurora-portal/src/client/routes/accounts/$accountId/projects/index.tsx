import { createFileRoute, ErrorComponent } from "@tanstack/react-router"
import { useState } from "react"
import { ProjectsOverviewNavNbar, ViewMode } from "./-components/ProjectOverviewNavBar"
import { ProjectCardView } from "./-components/ProjectCardView"
import { ProjectListView } from "./-components/ProjectListView"
import { AccountSubNavigation } from "./-components/AccountSubNavigation"

export const Route = createFileRoute("/accounts/$accountId/projects/")({
  component: ProjectsOverview,
  errorComponent: ({ error }) => {
    if (error instanceof Error) {
      // Render a custom error message
      return <div>{error.message}</div>
    }

    // Fallback to the default ErrorComponent
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
  loader: async ({ context }) => {
    const projects = await context.trpcClient?.project.getAuthProjects.query()

    return {
      projects,
      crumbDomain: context.crumbDomain,
    }
  },
})

export function ProjectsOverview() {
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const { projects } = Route.useLoaderData()

  return (
    <div>
      <div className="w-full flex">
        <AccountSubNavigation />
      </div>
      <div className="py-4 pl-4 bg-theme-global-bg h-full">
        <div className="grid grid-cols-12 gap-4 px-6 py-4">
          {/* Left Space */}
          <div className="col-span-2"></div>

          {/* Main Content Area - Ensuring NavBar and Content Align Properly */}
          <div className="col-span-8 flex flex-col gap-4">
            {/* Navigation Bar */}
            <ProjectsOverviewNavNbar viewMode={viewMode} setViewMode={setViewMode} />

            {/* Content - Make sure it has no extra margin/padding that misaligns */}
            <div className="w-full pt-5">
              {viewMode === "list" ? <ProjectListView projects={projects} /> : <ProjectCardView projects={projects} />}
            </div>
          </div>

          {/* Right Space */}
          <div className="col-span-2"></div>
        </div>
      </div>
    </div>
  )
}
