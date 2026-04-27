import { createFileRoute, Outlet, useLoaderData } from "@tanstack/react-router"
import { AppShell, Container, Stack } from "@cloudoperators/juno-ui-components"
import { SideNavBar } from "@/client/routes/_auth/projects/-components/SideNavBar"
import { ProjectInfoBox } from "@/client/components/ProjectView/ProjectInfoBox"
import { RouteError } from "@/client/components/Error/RouteError"
import { t } from "@lingui/core/macro"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId")({
  component: RouteComponent,
  errorComponent: ErrorComponent,
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

function Layout({ children }: { children: React.ReactNode }) {
  const { availableServices, projectId } = useLoaderData({ from: Route.id })
  return (
    <AppShell
      embedded
      sideNavigation={<SideNavBar availableServices={availableServices!} projectId={projectId} />}
      className="h-min-screen"
    >
      <Container>
        <Stack direction="vertical" distribution="start" alignment="stretch" className="xl:flex-row" gap="6">
          {/* Main content area */}
          <div className="min-w-0 flex-1">{children}</div>
        </Stack>
      </Container>
    </AppShell>
  )
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <Layout>
      <RouteError error={error} />
    </Layout>
  )
}

function RouteComponent() {
  const { crumbProject } = useLoaderData({ from: Route.id })
  const { setPageTitle } = Route.useRouteContext()
  setPageTitle(`${crumbProject?.name || t`Project`} ${t`Overview`}`)

  return (
    <Layout>
      <ProjectInfoBox
        projectInfo={{
          id: crumbProject?.id || "",
          name: crumbProject?.name || "",
          domain: crumbProject?.domain,
        }}
      />
      <Outlet />
    </Layout>
  )
}
