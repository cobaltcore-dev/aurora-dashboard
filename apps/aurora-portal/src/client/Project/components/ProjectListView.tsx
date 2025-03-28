import { useLocation, useParams } from "wouter"
import { Project } from "../../../server/Project/types/models"
import { Icon } from "../../components/Icon"
import { useAuroraContext } from "../../Shell/AuroraProvider"

type ProjectListViewProps = {
  projects: Project[] | undefined
}

export function ProjectListView({ projects }: ProjectListViewProps) {
  const [, setLocation] = useLocation()
  const { domainId } = useParams()

  const { auroraRoutes } = useAuroraContext()
  return (
    <div className="w-full border border-[#30363d] rounded-lg overflow-hidden">
      {projects?.length ? (
        projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center w-full px-6 py-4 hover:bg-[#1f242b] transition-all cursor-pointer border-b border-[#30363d] last:border-0"
            onClick={() => setLocation(auroraRoutes.domain(domainId).project(project.id).compute.root)}
          >
            {/* Icon + Title (Left Side) */}
            <div className="flex items-center space-x-3 min-w-0 w-1/3">
              {project.enabled ? (
                <Icon name="checkCircle" color="jn-text-theme-success" />
              ) : (
                <Icon name="info" color="jn-text-theme-danger" />
              )}
              <div className="text-lg font-semibold text-juno-turquoise-5 hover:underline truncate">{project.name}</div>
            </div>

            {/* Description (Middle, Expands Fully) */}
            <p className="flex-1 text-gray-300 text-base truncate">{project.description}</p>

            {/* Popup Menu (Right Side, Click Prevention) */}
            <div
              className="ml-auto"
              data-testid="project-card-menu"
              onMouseDown={(e) => e.stopPropagation()} // Stops route change
              onClick={(e) => e.stopPropagation()} // Ensures it doesn't trigger navigation
            ></div>
          </div>
        ))
      ) : (
        <div className="text-gray-500 text-center py-6">No projects found</div>
      )}
    </div>
  )
}
