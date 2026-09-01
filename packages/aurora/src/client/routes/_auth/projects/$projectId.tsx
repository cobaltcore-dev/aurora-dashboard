import { createFileRoute, Outlet, useLoaderData, useRouteContext } from "@tanstack/react-router"
import { AppShell, Button, Container, Stack, Status } from "@cloudoperators/juno-ui-components"
import { SideNavBar } from "@/client/routes/_auth/projects/-components/SideNavBar"
import { buildNavSections } from "@/client/routes/_auth/projects/-components/buildNavSections"
import { Breadcrumbs } from "@/client/components/Breadcrumbs"
import { RouteError } from "@/client/components/Error/RouteError"
import { useMemo } from "react"
import { TRPCClientError } from "@trpc/client"
import { useLingui, Trans } from "@lingui/react/macro"
import { BreadcrumbExtensionProvider } from "@/client/context/BreadcrumbExtensionContext"
import { useSetBreadcrumb } from "@/client/hooks/useSetBreadcrumb"

// Type for scope error that we catch and handle gracefully
type ScopeError = {
  type: "scope_error"
  code: string
  message: string
  currentDomain?: { id: string; name: string } | null
}

export const Route = createFileRoute("/_auth/projects/$projectId")({
  component: RouteComponent,
  errorComponent: ProjectErrorComponent,
  loader: async (options) => {
    const { context, params } = options

    // Catch rescope errors and return them as data instead of throwing
    // This allows the component to render a friendly error UI
    let scopeData
    let scopeError: ScopeError | undefined

    try {
      scopeData = await context.trpcClient?.auth.setCurrentScope.mutate({
        type: "project",
        projectId: params.projectId || "",
      })
    } catch (error) {
      if (error instanceof TRPCClientError) {
        // Try to get the current session's domain to show in the error message
        let currentDomain: { id: string; name: string } | null | undefined
        try {
          const currentScope = await context.trpcClient?.auth.getCurrentScope.query()
          if (currentScope?.domain?.id && currentScope?.domain?.name) {
            currentDomain = { id: currentScope.domain.id, name: currentScope.domain.name }
          }
        } catch {
          // Ignore errors fetching current scope
        }

        // Return error as data so the component can handle it
        scopeError = {
          type: "scope_error",
          code: error.data?.code || "UNKNOWN",
          message: error.message,
          currentDomain,
        }
      } else {
        // Unknown errors should still propagate
        throw error
      }
    }

    // If scope failed, return early with error state
    if (scopeError) {
      return {
        scopeError,
        projectId: params.projectId,
        // Provide minimal data for error rendering
        trpcClient: context.trpcClient,
        crumbDomain: undefined,
        crumbProject: undefined,
        availableServices: undefined,
        accountId: "",
        description: null,
      }
    }

    const [availableServices, project] = await Promise.all([
      context.trpcClient?.auth.getAvailableServices.query(),
      context.trpcClient?.project.getProject.query({ projectId: params.projectId }).catch(() => null),
    ])

    const accountId = scopeData?.domain?.id || ""
    const description = project?.description ?? null

    return {
      scopeError: undefined,
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
  const { t } = useLingui()
  const loaderData = useLoaderData({ from: Route.id })
  const navigate = Route.useNavigate()
  const { enabledServices, additionalProjectServices } = useRouteContext({ strict: false })

  const projectName = loaderData.crumbProject?.name || loaderData.projectId
  const projectLabel = loaderData.crumbDomain?.name ? `${loaderData.crumbDomain.name}/${projectName}` : projectName
  useSetBreadcrumb(Route.id, projectLabel)

  // Handle scope errors with a friendly UI using Juno's Status component
  if (loaderData.scopeError) {
    const { code, message, currentDomain } = loaderData.scopeError
    const domainName = currentDomain?.name

    if (code === "UNAUTHORIZED") {
      return (
        <Container className="py-8">
          <Status
            status="error"
            title={t`Session Expired`}
            body={t`Your session has expired. Please log in again. This may have occurred because you logged out or switched domains in another browser tab.`}
            action={
              <Button variant="primary" onClick={() => navigate({ to: "/" })}>
                <Trans>Log In</Trans>
              </Button>
            }
          />
        </Container>
      )
    }

    if (code === "NOT_FOUND") {
      const bodyText = domainName
        ? t`This project doesn't exist or is not accessible from your current domain. Your current domain is ${domainName}. Please select a project from your current domain.`
        : t`This project doesn't exist or is not accessible from your current domain. Please select a project from your current domain.`

      return (
        <Container className="py-8">
          <Status
            status="error"
            code={404}
            title={t`Project Not Accessible`}
            body={bodyText}
            action={
              <Button variant="primary" onClick={() => navigate({ to: "/projects" })}>
                <Trans>Go to Projects</Trans>
              </Button>
            }
          />
        </Container>
      )
    }

    if (code === "FORBIDDEN") {
      return (
        <Container className="py-8">
          <Status
            status="error"
            code={403}
            title={t`Access Denied`}
            body={t`You don't have permission to access this project.`}
            action={
              <Button variant="primary" onClick={() => navigate({ to: "/projects" })}>
                <Trans>Go to Projects</Trans>
              </Button>
            }
          />
        </Container>
      )
    }

    // Fallback for other error codes
    return <RouteError error={new Error(message)} />
  }

  const { availableServices, projectId, crumbProject, crumbDomain } = loaderData

  const sections = useMemo(
    () => buildNavSections(projectId, availableServices!, enabledServices, additionalProjectServices),
    [projectId, availableServices, enabledServices, additionalProjectServices]
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
            <BreadcrumbExtensionProvider>
              <Breadcrumbs />
              <Outlet />
            </BreadcrumbExtensionProvider>
          </div>
        </Stack>
      </Container>
    </AppShell>
  )
}

function ProjectErrorComponent({ error }: { error: Error & { statusCode?: number } }) {
  const { t } = useLingui()
  const navigate = Route.useNavigate()

  // Handle 404 errors with a custom UI
  if (error.statusCode === 404 || error.message === "Project not found") {
    return (
      <Container className="py-8">
        <Status
          status="error"
          code={404}
          title={t`Project Not Found`}
          body={t`The project you are looking for doesn't exist or you don't have access to it.`}
          action={
            <Button variant="primary" onClick={() => navigate({ to: "/projects" })}>
              <Trans>Go to Projects</Trans>
            </Button>
          }
        />
      </Container>
    )
  }

  // For all other errors, use the default RouteError component
  return <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
}
