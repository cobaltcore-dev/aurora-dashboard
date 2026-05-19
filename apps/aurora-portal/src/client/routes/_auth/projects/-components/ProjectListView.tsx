import { Project } from "@/server/Project/types/models"
import { DataGrid, DataGridCell, DataGridRow } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { Link } from "@tanstack/react-router"

type ProjectListViewProps = {
  projects: Project[] | undefined
}

export function ProjectListView({ projects }: ProjectListViewProps) {
  return (
    <DataGrid className="overflow-hidden" columns={2}>
      {projects?.length ? (
        projects.map((project) => {
          return (
            <DataGridRow key={project.id}>
              <DataGridCell>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="text-inherit no-underline"
                >
                  {project.name}
                </Link>
              </DataGridCell>
              <DataGridCell>{project.description}</DataGridCell>
            </DataGridRow>
          )
        })
      ) : (
        <div className="py-6 text-center">
          <Trans>No projects found</Trans>
        </div>
      )}
    </DataGrid>
  )
}
