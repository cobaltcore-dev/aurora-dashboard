import { createFileRoute } from "@tanstack/react-router"
import { ProjectsOverviewNavBar } from "@/client/routes/_auth/projects/-components/ProjectOverviewNavBar"
import { ProjectCardView } from "@/client/routes/_auth/projects/-components/ProjectCardView"
import { RouteError } from "@/client/components/Error/RouteError"
import { TRPCClientError } from "@trpc/client"
import { Container, ContentHeading } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { z } from "zod"

const searchSchema = z.object({
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/")({
  component: ProjectsOverview,
  errorComponent: ({ error }) => (
    <RouteError error={error} safeErrorMessage={error instanceof TRPCClientError ? error.message : undefined} />
  ),
  notFoundComponent: () => {
    return <p>Projects not found</p>
  },
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    search: search.search || "",
  }),
  loader: async ({ context, deps }) => {
    const allProjects = await context.trpcClient?.project.getAuthProjects.query()

    let projects = allProjects
    if (deps.search && deps.search.trim() !== "") {
      const searchTermLower = deps.search.toLowerCase()
      projects = allProjects?.filter(
        (project) =>
          project.name?.toLowerCase().includes(searchTermLower) ||
          project.description?.toLowerCase().includes(searchTermLower)
      )
    }

    return { projects }
  },
})

function ProjectsOverview() {
  const { projects } = Route.useLoaderData()
  const { search = "" } = Route.useSearch()
  const navigate = Route.useNavigate()

  const handleSearch = (value: string) => {
    navigate({ search: { search: value }, replace: true })
  }

  return (
    <Container>
      <ContentHeading>
        <Trans>Projects</Trans>
      </ContentHeading>
      <ProjectsOverviewNavBar searchTerm={search} onSearch={handleSearch} />
      <div className="pt-5">
        <ProjectCardView projects={projects} />
      </div>
    </Container>
  )
}
