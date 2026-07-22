import { createFileRoute, Outlet, useLoaderData, useRouteContext, useRouter } from "@tanstack/react-router"
import { AppShell, Container, Stack } from "@cloudoperators/juno-ui-components"
import { SideNavBar } from "@/client/routes/_auth/projects/-components/SideNavBar"
import { buildNavSections } from "@/client/routes/_auth/projects/-components/buildNavSections"
import { ProjectInfoBox } from "@/client/components/ProjectView/ProjectInfoBox"
import { RouteError } from "@/client/components/Error/RouteError"
import { useMemo } from "react"
import { TRPCClientError } from "@trpc/client"
import { resolveProjectScope } from "./-components/resolveProjectScope"
import { StatusError } from "@/client/components/Error/StatusError"
import { useLingui } from "@lingui/react/macro"

export const Route = createFileRoute("/_auth/projects/$projectId")({
  component: RouteComponent,
  errorComponent: ProjectErrorComponent,
  loader: async (options) => {
    const { context, params } = options

    let scopeData

    try {
      scopeData = await context.trpcClient?.auth.setCurrentScope.mutate({
        type: "project",
        projectId: params.projectId || "",
      })
    } catch (error) {
      if (error instanceof TRPCClientError && error.data?.code === "NOT_FOUND") {
        scopeData = undefined
      } else {
        throw error
      }
    }

    const [availableServices, project] = await Promise.all([
      context.trpcClient?.auth.getAvailableServices.query(),
      context.trpcClient?.project.getProject.query({ projectId: params.projectId }).catch(() => null),
    ])

    const projectScopeStatus = resolveProjectScope({
      projectId: params.projectId,
      scopeProject: scopeData?.project,
      userProject: project,
    })

    if (projectScopeStatus === "scope_failed") {
      throw new Error("Failed to scope session to project")
    }

    if (projectScopeStatus === "not_found") {
      const error = new Error("Project not found") as Error & { statusCode?: number }
      error.statusCode = 404
      throw error
    }

    const accountId = scopeData?.domain?.id || ""
    const description = project?.description ?? null

    return {
      trpcClient: context.trpcClient,
      crumbDomain: { path: `/projects`, name: scopeData?.domain?.name },
      crumbProject: scopeData?.project,
      availableServices,
      accountId,
      projectId: params.projectId,
      description,
    }
  },
})

function RouteComponent() {
  const { availableServices, projectId, crumbProject, crumbDomain } = useLoaderData({
    from: Route.id,
  })
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

function ProjectErrorComponent({ error }: { error: Error & { statusCode?: number } }) {
  const { t } = useLingui()
  const navigate = Route.useNavigate()
  const router = useRouter()

  // Handle 404 errors with a custom UI
  if (error.statusCode === 404 || error.message === "Project not found") {
    return (
      <StatusError
        statusCode={404}
        title={t`Project Not Found`}
        message={t`The project you are looking for doesn't exist or you don't have access to it.`}
        onHomeClick={() => {
          navigate({ to: "/projects" })
        }}
        onBackClick={() => {
          router.history.back()
        }}
      />
    )
  }

  // For all other errors, use the default RouteError component
  return <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
}
