import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ProjectSubNavigation } from "./-components/ProjectSubNavigation"

export const Route = createFileRoute("/accounts/$accountId/projects/$projectId")({
  component: RouteComponent,
  loader: async (options) => {
    const { context, params } = options
    const data = await context.trpcClient?.auth.setCurrentScope.mutate({
      type: "project",
      projectId: params.projectId || "",
    })
    const projects = await context.trpcClient?.project.getAuthProjects.query()

    return {
      projects,
      trpcClient: context.trpcClient,
      crumbDomain: data?.project?.domain,
      crumbProject: data?.project,
    }
  },
})

function RouteComponent() {
  return (
    <div>
      <div className="w-full flex">
        <ProjectSubNavigation />
      </div>
      <div className="py-4 pl-4 bg-theme-global-bg h-full">
        <Outlet /> {/* This is where child routes will render */}
      </div>
    </div>
  )
}
