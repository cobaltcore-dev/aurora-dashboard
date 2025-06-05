import { useNavigate } from "@tanstack/react-router"
import { Project } from "@/server/Project/types/models"
import { Icon } from "@cloudoperators/juno-ui-components"

type ProjectCardProps = {
  project: Project
}
type ProjectCardViewProps = {
  projects: Project[] | undefined
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()
  const domain = project?.domain_id // Assuming domain_id is the domai
  const computeRootPath = `/accounts/${domain}/projects/${project.id}/compute`
  return (
    <div
      className="bg-[#161b22] rounded-xl shadow-lg p-5 flex flex-col space-y-4 border border-[#30363d] text-gray-300 min-h-[200px] relative cursor-pointer hover:bg-[#1f242b] transition-all"
      onClick={() => navigate({ to: computeRootPath })}
    >
      {/* Header: Project Name (Clickable) + PopupMenu */}
      <div className="flex justify-between items-center w-full">
        <div className="text-lg font-semibold text-juno-turquoise-5 hover:underline truncate">{project.name}</div>
        {/* Popup Menu - Ensures it works */}
        <div
          className="ml-auto"
          data-testid="project-card-menu"
          onMouseDown={(e) => e.stopPropagation()} // Stops route change
          onClick={(e) => e.stopPropagation()} // Ensures it doesn't trigger navigation
        ></div>
      </div>

      {/* Status Row (Icon + Status) */}
      <div className="flex items-center space-x-2">
        <Icon name="info" color={project.enabled ? "jn-text-theme-success" : "jn-text-theme-danger"} />
        <span className="font-medium">{project.enabled ? "Active" : "Disabled"}</span>
      </div>

      {/* Project Description (Properly Spaced) */}
      <div className="flex-grow flex flex-col">
        <div className="flex-grow h-1/2"></div>
        <p className="text-xl text-gray-300 leading-tight">{project.description}</p>
      </div>
    </div>
  )
}
export function ProjectCardView({ projects }: ProjectCardViewProps) {
  return (
    <div className="h-full w-full max-w-[95vw] mx-auto">
      {/* Adaptive Grid: max 3 columns, adjusts on smaller screens */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.length ? (
          projects.map((project) => <ProjectCard key={project.id} project={project} />)
        ) : (
          <p className="text-gray-400 text-center col-span-full">No projects available.</p>
        )}
      </div>
    </div>
  )
}
