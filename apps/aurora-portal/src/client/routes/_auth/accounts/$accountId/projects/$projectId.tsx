import { createFileRoute, Outlet, useLoaderData, useLocation } from "@tanstack/react-router"
import { AppShell } from "@cloudoperators/juno-ui-components"
import { ComputeSideNavBar } from "./$projectId/compute/-components/ComputeNavBar"

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
  const location = useLocation()

  // Determine which sidebar to show based on the current path
  const getSideNavigation = () => {
    const pathSegments = location.pathname.split("/").filter(Boolean)
    const section = pathSegments[4] // compute, storage, network, etc.

    switch (section) {
      case "compute":
        return <ComputeSideNavBar availableServices={availableServices!} />
      // case 'storage':
      //   return <StorageSideNavBar availableServices={availableServices!} />
      // case 'network':
      //   return <NetworkSideNavBar availableServices={availableServices!} />
      default:
        return null
    }
  }

  return (
    <AppShell embedded sideNavigation={getSideNavigation()} className="h-min-screen">
      <div className="mx-2">
        <Outlet />
      </div>
    </AppShell>
  )
}
