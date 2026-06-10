import { useNavigate } from "@tanstack/react-router"
import { Project } from "@/server/Project/types/models"
import { Card } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ProjectCardProps = {
  project: Project
}
type ProjectCardViewProps = {
  projects: Project[] | undefined
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  return (
    <Card
      padding
      onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: project.id } })}
      className="flex flex-col gap-4"
    >
      <div className="flex min-w-0 flex-col">
        <span className="text-theme-light text-xs leading-6">
          {project.domain_name ?? project.domain_id ?? <Trans>Unknown domain</Trans>}
        </span>
        <h5>{project.name}</h5>
      </div>
      {project.description && <p className="text-theme-default line-clamp-2">{project.description}</p>}
    </Card>
  )
}

export function ProjectCardView({ projects }: ProjectCardViewProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
