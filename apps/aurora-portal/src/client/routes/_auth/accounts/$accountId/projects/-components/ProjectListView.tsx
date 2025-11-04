import { Project } from "@/server/Project/types/models"
import { DataGrid, DataGridCell, DataGridRow, Icon } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useNavigate } from "@tanstack/react-router"

type ProjectListViewProps = {
  projects: Project[] | undefined
}

export function ProjectListView({ projects }: ProjectListViewProps) {
  const navigate = useNavigate()

  return (
    <DataGrid className="overflow-hidden" columns={3} minContentColumns={[0]}>
      {projects?.length ? (
        projects.map((project) => {
          const domain = project?.domain_id
          const gardenerRootPath = `/accounts/${domain}/projects/${project.id}/compute`
          return (
            <DataGridRow key={project.id} onClick={() => navigate({ to: gardenerRootPath })}>
              <DataGridCell>
                {project.enabled ? (
                  <Icon icon="checkCircle" color="text-theme-success" />
                ) : (
                  <Icon icon="info" color="text-theme-danger" />
                )}
              </DataGridCell>
              <DataGridCell>{project.name}</DataGridCell>
              <DataGridCell>{project.description}</DataGridCell>
            </DataGridRow>
          )
        })
      ) : (
        <div className="text-center py-6">
          <Trans>No projects found</Trans>
        </div>
      )}
    </DataGrid>
  )
}
