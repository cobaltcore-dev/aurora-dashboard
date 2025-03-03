import { Icon, PopupMenu } from "@cloudoperators/juno-ui-components"
import { Link, useLocation } from "wouter"
import { Project } from "../../../server/Project/types/models"
import { Domain } from "../../Shell/AuthProvider"

type ProjectCardProps = {
  project: Project
  domain: Domain
  onProjectClick: (project: Project) => void
}
type ProjectCardViewProps = {
  projects: Project[] | undefined
  domain: Domain
  onProjectClick: (project: Project) => void
}

export function ProjectCard({ domain, project, onProjectClick }: ProjectCardProps) {
  const [, setLocation] = useLocation()

  return (
    <div
      className="bg-[#161b22] rounded-xl shadow-lg p-5 flex flex-col space-y-4 border border-[#30363d] text-gray-300 min-h-[200px] relative cursor-pointer hover:bg-[#1f242b] transition-all"
      onClick={() => selectProject(project, onProjectClick)}
    >
      {/* Header: Project Name (Clickable) + PopupMenu */}
      <div className="flex justify-between items-center w-full">
        <Link
          href={`/${domain?.id}/projects/${project.id}/compute`}
          className={(active) => (active ? "active" : "")}
          onClick={(e) => {
            e.stopPropagation()
            selectProject(project, onProjectClick)
          }}
        >
          {project.name}
        </Link>

        {/* Popup Menu - Ensures it works */}
        <div
          className="ml-auto"
          data-testid="project-card-menu"
          onMouseDown={(e) => e.stopPropagation()} // Stops route change
          onClick={(e) => e.stopPropagation()} // Ensures it doesn't trigger navigation
        >
          <PopupMenu onClose={() => {}} onOpen={() => {}}>
            <PopupMenu.Item label="Edit" />
            <PopupMenu.Item label="Delete" />
          </PopupMenu>
        </div>
      </div>

      {/* Status Row (Icon + Status) */}
      <div className="flex items-center space-x-2">
        <Icon name="info" icon="info" color={project.enabled ? "jn-text-theme-success" : "jn-text-theme-danger"} />
        <span className="font-medium">{project.enabled ? "Active" : "Disabled"}</span>
      </div>

      {/* Project Description (Properly Spaced) */}
      <div className="flex-grow flex flex-col">
        <div className="flex-grow h-1/2"></div>
        <p className="text-xl text-gray-300 leading-tight">{project.description}</p>
      </div>
    </div>
  )
  function selectProject(project: Project, onProjectClick: (project: Project) => void) {
    onProjectClick(project)
    setLocation(`/projects/${project.id}/compute`)
  }
}
export function ProjectCardView({ domain, projects, onProjectClick }: ProjectCardViewProps) {
  return (
    <div className="h-full w-full max-w-[95vw] mx-auto">
      {/* Adaptive Grid: max 3 columns, adjusts on smaller screens */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.length ? (
          projects.map((project) => (
            <ProjectCard domain={domain} key={project.id} onProjectClick={onProjectClick} project={project} />
          ))
        ) : (
          <p className="text-gray-400 text-center col-span-full">No projects available.</p>
        )}
      </div>
    </div>
  )
}
