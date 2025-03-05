import { Icon, PopupMenu } from "@cloudoperators/juno-ui-components"
import { useLocation, Link } from "wouter"
import { Project } from "../../../server/Project/types/models"

type Domain = {
  id: string
  name: string
}

type ProjectListViewProps = {
  projects: Project[] | undefined
  domain?: Domain
}

export function ProjectListView({ domain, projects }: ProjectListViewProps) {
  const [, setLocation] = useLocation()

  return (
    <div className="w-full border border-[#30363d] rounded-lg overflow-hidden">
      {projects?.length ? (
        projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center w-full px-6 py-4 hover:bg-[#1f242b] transition-all cursor-pointer border-b border-[#30363d] last:border-0"
            onClick={() => setLocation(`/projects/${project.id}/compute`)}
          >
            {/* Icon + Title (Left Side) */}
            <div className="flex items-center space-x-3 min-w-0 w-1/3">
              {project.enabled ? (
                <Icon name="check_circle" icon="info" color="jn-text-theme-success" />
              ) : (
                <Icon name="block" icon="info" color="jn-text-theme-danger" />
              )}
              <Link
                href={`/${domain?.id}/projects/${project.id}/compute`}
                className="text-lg font-semibold text-blue-400 hover:underline truncate"
                onClick={(e) => {
                  e.stopPropagation()
                  setLocation(`/projects/${project.id}/compute`)
                }}
              >
                {project.name}
              </Link>
            </div>

            {/* Description (Middle, Expands Fully) */}
            <p className="flex-1 text-gray-300 text-base truncate">{project.description}</p>

            {/* Popup Menu (Right Side, Click Prevention) */}
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
        ))
      ) : (
        <div className="text-gray-500 text-center py-6">No projects found</div>
      )}
    </div>
  )
}
