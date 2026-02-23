import { createFileRoute, Outlet, useLoaderData, useMatches } from "@tanstack/react-router"
import { AppShell, Container, Stack } from "@cloudoperators/juno-ui-components"
import { SideNavBar } from "./-components/SideNavBar"
import { ProjectInfoBox } from "@/client/components/ProjectInfoBox"

// Helper to generate page title from route
const getPageTitle = (pathname: string): string => {
  const segments = pathname.split("/").filter(Boolean)

  // Find the service and specific page (e.g., compute/images)
  const serviceIndex = segments.findIndex((s) => ["compute", "storage", "network"].includes(s))

  if (serviceIndex === -1) return "Overview"

  const service = segments[serviceIndex]
  const page = segments[serviceIndex + 1]

  if (!page || page === "$") {
    // Capitalize service name
    return service.charAt(0).toUpperCase() + service.slice(1)
  }

  // Capitalize and format the page name (e.g., "keypairs" -> "Key Pairs")
  return page
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/servergroups/i, "Server Groups")
    .replace(/keypairs/i, "Key Pairs")
    .replace(/objectstorage/i, "Object Storage")
}

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
  const { availableServices, accountId, projectId, crumbProject } = useLoaderData({ from: Route.id })
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.pathname || ""
  const pageTitle = getPageTitle(currentPath)

  return (
    <AppShell
      embedded
      sideNavigation={<SideNavBar availableServices={availableServices!} accountId={accountId} projectId={projectId} />}
      className="h-min-screen"
    >
      <Container>
        <h1 className="mb-6 text-3xl font-bold">{pageTitle}</h1>

        <Stack direction="vertical" distribution="start" alignment="stretch" className="xl:flex-row" gap="6">
          {/* Main content area */}
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>

          {/* Info box - only shows on xl screens */}
          <aside className="flex-shrink-0 xl:w-80 2xl:w-96">
            <ProjectInfoBox
              projectInfo={{
                id: projectId,
                name: crumbProject?.name || projectId,
                description: "",
              }}
            />
          </aside>
        </Stack>
      </Container>
    </AppShell>
  )
}
