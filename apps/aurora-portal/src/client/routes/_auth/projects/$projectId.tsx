import { createFileRoute, Outlet, useLoaderData } from "@tanstack/react-router"
import { AppShell, Container, Stack } from "@cloudoperators/juno-ui-components"
import { SideNavBar } from "@/client/routes/_auth/projects/-components/SideNavBar"
import { ProjectInfoBox } from "@/client/components/ProjectView/ProjectInfoBox"
import { RouteError } from "@/client/components/Error/RouteError"

export const Route = createFileRoute("/_auth/projects/$projectId")({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    return <RouteError error={error} />
  },
  loader: async (options) => {
    const { context, params } = options
    const data = await context.trpcClient?.auth.setCurrentScope.mutate({
      type: "project",
      projectId: params.projectId || "",
    })
    const availableServices = await context.trpcClient?.auth.getAvailableServices.query()

    // Extract accountId (domain id) from the rescoped token
    // This is needed for SideNavBar navigation until we refactor it
    const accountId = data?.domain?.id || ""

    return {
      trpcClient: context.trpcClient,
      crumbDomain: { path: `/projects`, name: data?.domain?.name },
      crumbProject: data?.project,
      availableServices,
      accountId, // Keep for SideNavBar compatibility
      projectId: params.projectId,
    }
  },
})

function RouteComponent() {
  const { availableServices, projectId, crumbProject } = useLoaderData({ from: Route.id })

  return (
    <AppShell
      embedded
      sideNavigation={<SideNavBar availableServices={availableServices!} projectId={projectId} />}
      className="h-min-screen"
    >
      <Container>
        <Stack direction="vertical" distribution="start" alignment="stretch" className="xl:flex-row" gap="6">
          {/* Main content area */}
          <div className="min-w-0 flex-1">
            <ProjectInfoBox
              projectInfo={{
                id: projectId,
                name: crumbProject?.name || projectId,
                domain: crumbProject?.domain,
              }}
            />
            <Outlet />
          </div>
        </Stack>
      </Container>
    </AppShell>
  )
}
