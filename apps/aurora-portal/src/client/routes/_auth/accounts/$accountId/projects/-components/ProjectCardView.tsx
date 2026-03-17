import { useNavigate } from "@tanstack/react-router"
import { Project } from "@/server/Project/types/models"
import { Box, ContentHeading, Tooltip, TooltipContent, TooltipTrigger } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import ClipboardText from "@/client/components/ClipboardText"

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
    <Box className="group border-theme-background-lvl-3 bg-theme-background-lvl-1 hover:border-theme-accent/30 relative flex min-h-50 flex-col overflow-hidden rounded-xl border p-6 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl">
      <div className="flex flex-1 flex-col">
        {/* Clickable Header and Description Section */}
        <div className="cursor-pointer" onClick={() => navigate({ to: gardenerRootPath })}>
          {/* Header Section */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <ContentHeading className="text-theme-accent group-hover:text-theme-accent-emphasis transition-colors duration-200">
              {project.name}
            </ContentHeading>
            {/* Status indicator with tooltip */}
            <Tooltip triggerEvent="hover">
              <TooltipTrigger>
                <div
                  className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                    project.enabled ? "bg-theme-success/60" : "bg-theme-danger/60"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent>{project.enabled ? <Trans>Active</Trans> : <Trans>Disabled</Trans>}</TooltipContent>
            </Tooltip>
          </div>

          {/* Description Section */}
          {project.description && (
            <p className="text-theme-default/90 mb-4 line-clamp-3 pr-4 leading-relaxed">{project.description}</p>
          )}
        </div>

        {/* Footer Section - pushed to bottom, with copyable IDs */}
        <div className="border-theme-background-lvl-3 mt-auto space-y-2.5 border-t pt-4">
          {/* Project ID */}
          <div className="text-theme-light flex items-start gap-2 text-xs">
            <span className="mt-0.5 min-w-[4rem] font-medium">ID:</span>
            <div className="min-w-0 flex-1 overflow-hidden">
              <ClipboardText text={project.id} className="text-xs" truncateAt={24} />
            </div>
          </div>

          {/* Domain ID */}
          {project.domain_id && (
            <div className="text-theme-light flex items-start gap-2 text-xs">
              <span className="mt-0.5 min-w-[4rem] font-medium">Domain:</span>
              <div className="min-w-0 flex-1 overflow-hidden">
                <ClipboardText text={project.domain_id} className="text-xs" truncateAt={24} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="from-theme-accent/0 to-theme-accent/0 group-hover:from-theme-accent/5 pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br transition-all duration-300 group-hover:to-transparent" />
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
