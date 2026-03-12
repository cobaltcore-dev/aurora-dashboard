import { Project } from "@/server/Project/types/models"
import {
  DataGrid,
  DataGridCell,
  DataGridRow,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useNavigate } from "@tanstack/react-router"

type ProjectListViewProps = {
  projects: Project[] | undefined
}

export function ProjectListView({ projects }: ProjectListViewProps) {
  const navigate = useNavigate()

  if (!projects?.length) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16">
        <div className="mb-4 text-6xl opacity-20">📁</div>
        <p className="text-theme-default text-center text-lg font-medium">
          <Trans>No projects available.</Trans>
        </p>
        <p className="text-theme-light mt-2 text-center text-sm">
          <Trans>Projects you have access to will appear here.</Trans>
        </p>
      </div>
    )
  }

  return (
    <DataGrid className="overflow-hidden" columns={5} minContentColumns={[0]}>
      {/* Header Row */}
      <DataGridRow className="bg-theme-background-lvl-2">
        <DataGridCell>
          <span className="text-theme-light text-xs font-semibold tracking-wider uppercase">
            <Trans>Status</Trans>
          </span>
        </DataGridCell>
        <DataGridCell>
          <span className="text-theme-light text-xs font-semibold tracking-wider uppercase">
            <Trans>Name</Trans>
          </span>
        </DataGridCell>
        <DataGridCell>
          <span className="text-theme-light text-xs font-semibold tracking-wider uppercase">
            <Trans>Description</Trans>
          </span>
        </DataGridCell>
        <DataGridCell>
          <span className="text-theme-light text-xs font-semibold tracking-wider uppercase">
            <Trans>Project ID</Trans>
          </span>
        </DataGridCell>
        <DataGridCell>
          <span className="text-theme-light text-xs font-semibold tracking-wider uppercase">
            <Trans>Domain ID</Trans>
          </span>
        </DataGridCell>
      </DataGridRow>

      {/* Data Rows */}
      {projects.map((project) => {
        const domain = project?.domain_id
        const gardenerRootPath = `/accounts/${domain}/projects/${project.id}/compute`

        return (
          <DataGridRow
            key={project.id}
            className="group hover:bg-theme-background-lvl-2/50 transition-colors duration-150"
          >
            {/* Status Column */}
            <DataGridCell>
              <Tooltip triggerEvent="hover">
                <TooltipTrigger>
                  <div
                    className={`h-2 w-2 rounded-full ${project.enabled ? "bg-theme-success/60" : "bg-theme-danger/60"}`}
                  />
                </TooltipTrigger>
                <TooltipContent>{project.enabled ? <Trans>Active</Trans> : <Trans>Disabled</Trans>}</TooltipContent>
              </Tooltip>
            </DataGridCell>

            {/* Name Column - Clickable */}
            <DataGridCell
              className="text-theme-accent hover:text-theme-accent-emphasis cursor-pointer font-medium transition-colors"
              onClick={() => navigate({ to: gardenerRootPath })}
            >
              {project.name}
            </DataGridCell>

            {/* Description Column - Clickable */}
            <DataGridCell
              className="text-theme-default/90 cursor-pointer"
              onClick={() => navigate({ to: gardenerRootPath })}
              title={project.description || undefined}
            >
              <span className="line-clamp-2">{project.description || "-"}</span>
            </DataGridCell>

            {/* Project ID Column - NOT clickable for copying */}
            <DataGridCell className="text-theme-default/70 font-mono text-xs" title={project.id}>
              <span className="truncate">{project.id}</span>
            </DataGridCell>

            {/* Domain ID Column - NOT clickable for copying */}
            <DataGridCell className="text-theme-default/70 font-mono text-xs" title={project.domain_id || undefined}>
              <span className="truncate">{project.domain_id || "-"}</span>
            </DataGridCell>
          </DataGridRow>
        )
      })}
    </DataGrid>
  )
}
