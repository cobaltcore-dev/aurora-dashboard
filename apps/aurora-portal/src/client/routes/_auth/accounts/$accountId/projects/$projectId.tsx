import { createFileRoute, Outlet, useLoaderData } from "@tanstack/react-router"
import { AppShell, Container } from "@cloudoperators/juno-ui-components"
import { SideNavBar } from "./$projectId/compute/-components/SideNavBar"

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
      accountId: params.accountId,
      projectId: params.projectId,
    }
  },
})

function RouteComponent() {
  const { availableServices, accountId, projectId } = useLoaderData({ from: Route.id })

  return (
    <AppShell
      embedded
      sideNavigation={<SideNavBar availableServices={availableServices!} accountId={accountId} projectId={projectId} />}
      className="h-min-screen "
    >
      <Container>
        <Outlet />
      </Container>
    </AppShell>
  )
}
