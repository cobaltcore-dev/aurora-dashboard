import { createFileRoute, Outlet, useLoaderData, useRouteContext } from "@tanstack/react-router"
import { AppShell, Container, Stack } from "@cloudoperators/juno-ui-components"
import { SideNavBar } from "@/client/routes/_auth/projects/-components/SideNavBar"
import { buildNavSections } from "@/client/routes/_auth/projects/-components/buildNavSections"
import { ProjectInfoBox } from "@/client/components/ProjectView/ProjectInfoBox"
import { RouteError } from "@/client/components/Error/RouteError"
import { useMemo } from "react"

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

    const [availableServices, projects] = await Promise.all([
      context.trpcClient?.auth.getAvailableServices.query(),
      context.trpcClient?.project.getAuthProjects.query().catch(() => null),
    ])

    const accountId = data?.domain?.id || ""
    const description = projects?.find((p) => p.id === params.projectId)?.description ?? null

    return {
      trpcClient: context.trpcClient,
      crumbDomain: { path: `/projects`, name: data?.domain?.name },
      crumbProject: data?.project,
      availableServices,
      accountId,
      projectId: params.projectId,
      description,
    }
  },
})

function RouteComponent() {
  const { availableServices, projectId, crumbProject, crumbDomain } = useLoaderData({ from: Route.id })
  const { enabledServices } = useRouteContext({ strict: false })

  const sections = useMemo(
    () => buildNavSections(projectId, availableServices!, enabledServices),
    [projectId, availableServices, enabledServices]
  )

  return (
    <AppShell
      embedded
      sideNavigation={
        <SideNavBar
          sections={sections}
          projectId={projectId}
          projectName={crumbProject?.name || projectId}
          domainName={crumbDomain?.name}
        />
      }
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
