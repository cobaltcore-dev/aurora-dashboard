import { createFileRoute, Outlet, useLoaderData } from "@tanstack/react-router"
import { ProjectSubNavigation } from "./-components/ProjectSubNavigation"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId")({
  component: RouteComponent,
  loader: async (options) => {
    const { context, params } = options
    const data = await context.trpcClient?.auth.setCurrentScope.mutate({
      type: "project",
      projectId: params.projectId || "",
    })
    const availableServices = await context.trpcClient?.auth.getAvailableServices.query()

    return {
      trpcClient: context.trpcClient,
      crumbDomain: { path: `/accounts/${params.accountId}/projects`, name: data?.domain?.name },
      crumbProject: data?.project,
      availableServices,
    }
  },
})

function RouteComponent() {
  const { availableServices } = useLoaderData({ from: Route.id })

  return (
    <div>
      <div className="w-full flex">
        <ProjectSubNavigation availableServices={availableServices!} />
      </div>
      <div className="py-4 pl-4 h-full">
        <Outlet /> {/* This is where child routes will render */}
      </div>
    </div>
  )
}
