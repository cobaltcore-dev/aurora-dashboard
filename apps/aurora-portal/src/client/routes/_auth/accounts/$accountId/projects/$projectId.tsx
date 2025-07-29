import { createFileRoute, Outlet } from "@tanstack/react-router"
import { ProjectSubNavigation } from "./-components/ProjectSubNavigation"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId")({
  component: RouteComponent,
  loader: async (options) => {
    const { context, params } = options
    const data = await context.trpcClient?.auth.setCurrentScope.mutate({
      type: "project",
      projectId: params.projectId || "",
    })

    return {
      trpcClient: context.trpcClient,
      crumbDomain: { path: `/accounts/${params.accountId}/projects`, name: data?.domain?.name },
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
      <div className="py-4 pl-4 bg-theme-background-lvl-0  h-full">
        <Outlet /> {/* This is where child routes will render */}
      </div>
    </div>
  )
}
