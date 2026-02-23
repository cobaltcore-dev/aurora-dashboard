import { useNavigate } from "@tanstack/react-router"
import { Project } from "@/server/Project/types/models"
import { Badge, Box, ContentHeading } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ProjectCardProps = {
  project: Project
}
type ProjectCardViewProps = {
  projects: Project[] | undefined
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const domain = project?.domain_id // Assuming domain_id is the domai
  const gardenerRootPath = `/accounts/${domain}/projects/${project.id}/compute`
  return (
    <Box
      className="hover:bg-theme-background-lvl-2 min-h-50 rounded-lg p-6 shadow-md"
      onClick={() => navigate({ to: gardenerRootPath })}
    >
      <div className="w-full">
        <ContentHeading className="text-theme-accent">{project.name}</ContentHeading>

        {project.enabled ? (
          <Badge icon text="Active" variant="success" className="mt-1" />
        ) : (
          <Badge icon text="Disabled" variant="danger" />
        )}

        <p className="mt-4 line-clamp-3 pr-4 leading-relaxed">{project.description}</p>
      </div>
    </Box>
  )
}
export function ProjectCardView({ projects }: ProjectCardViewProps) {
  return (
    <div className="mx-auto h-full w-full max-w-[95vw] px-4">
      {/* Adaptive Grid: max 3 columns, adjusts on smaller screens */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.length ? (
          projects.map((project) => <ProjectCard key={project.id} project={project} />)
        ) : (
          <p className="text-center">
            <Trans>No projects available.</Trans>
          </p>
        )}
      </div>
    </div>
  )
}
