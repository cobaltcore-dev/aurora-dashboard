import {
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuOptions,
  PopupMenuItem,
} from "@cloudoperators/juno-ui-components"
import { useNavigate } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import type { Cluster } from "@/server/Kubernetes/types/cluster"
import type { KubernetesLandscape } from "@/types/kubernetes"

interface ClusterListRowProps {
  cluster: Cluster
  projectId: string
  landscape: KubernetesLandscape
}

export function ClusterListRow({ cluster, projectId, landscape }: ClusterListRowProps) {
  const { t } = useLingui()
  const navigate = useNavigate()

  const handleRowClick = () => {
    // Placeholder for T-04 cluster detail route
    void navigate({
      to: "/projects/$projectId/kubernetes/$clusterName",
      params: { projectId, clusterName: cluster.name },
      search: { landscape },
    } as never)
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "healthy":
        return t`Healthy`
      case "progressing":
        return t`Progressing`
      case "unhealthy":
        return t`Unhealthy`
      case "unknown":
      default:
        return t`Unknown`
    }
  }

  return (
    <DataGridRow onClick={handleRowClick}>
      <DataGridCell>{getStatusText(cluster.status)}</DataGridCell>
      <DataGridCell>
        <div className="flex flex-col">
          <span>{cluster.name}</span>
          <span className="text-theme-light text-xs">{cluster.uid ?? "- -"}</span>
        </div>
      </DataGridCell>
      <DataGridCell>{cluster.readiness?.status ?? "- -"}</DataGridCell>
      <DataGridCell>{cluster.lastOperationSummary ?? "- -"}</DataGridCell>
      <DataGridCell>{cluster.version ?? "- -"}</DataGridCell>
      <DataGridCell>
        <PopupMenu>
          <PopupMenuToggle
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
            }}
          />
          <PopupMenuOptions>
            <PopupMenuItem
              label={t`Show Details`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                handleRowClick()
              }}
            />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
