import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { createFileRoute, useRouteContext } from "@tanstack/react-router"
import { ProjectsOverviewNavBar } from "@/client/routes/_auth/projects/-components/ProjectOverviewNavBar"
import { ProjectCardView } from "@/client/routes/_auth/projects/-components/ProjectCardView"
import { RouteError } from "@/client/components/Error/RouteError"
import { TRPCClientError } from "@trpc/client"
import { Container, ContentHeading, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { z } from "zod"
import { Slot } from "@/client/components/Slot"
import { trpcReact } from "@/client/trpcClient"
import type { RouteInfo } from "@/client/routes/routeInfo"

const searchSchema = z.object({
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/")({
  staticData: {
    analytics: {
      name: "projects.list",
    },
  } satisfies RouteInfo,
  component: ProjectsOverview,
  errorComponent: ({ error }) => (
    <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
  ),
  notFoundComponent: () => {
    return <p>Projects not found</p>
  },
  validateSearch: searchSchema,
})

interface ProjectsContentProps {
  search: string
}

function ProjectsContent({ search }: ProjectsContentProps) {
  const [allProjects] = trpcReact.project.getAuthProjects.useSuspenseQuery()

  const normalizedSearch = search.trim().toLowerCase()
  const projects =
    allProjects && normalizedSearch
      ? allProjects.filter(
          (project) =>
            project.name?.toLowerCase().includes(normalizedSearch) ||
            project.description?.toLowerCase().includes(normalizedSearch)
        )
      : allProjects

  return <ProjectCardView projects={projects} />
}

export function ProjectsOverview() {
  const { search = "" } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { slots } = useRouteContext({ strict: false })

  const handleSearch = (value: string) => {
    navigate({ search: (prev) => ({ ...prev, search: value || undefined }), replace: true })
  }

  return (
    <Container py>
      <ContentHeading className="pb-4">
        <Trans>Projects</Trans>
      </ContentHeading>
      {slots?.projectsBanner && (
        <ErrorBoundary fallbackRender={() => null}>
          <Suspense fallback={null}>
            <Slot component={slots.projectsBanner} useShadowDOM={false} />
          </Suspense>
        </ErrorBoundary>
      )}
      <ProjectsOverviewNavBar searchTerm={search} onSearch={handleSearch} />
      <div className="pt-5">
        <ErrorBoundary
          fallbackRender={({ error }) => (
            <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
          )}
        >
          <Suspense
            fallback={
              <Stack distribution="center" alignment="center" direction="vertical" className="py-12">
                <Spinner variant="primary" size="large" />
              </Stack>
            }
          >
            <ProjectsContent search={search} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </Container>
  )
}
