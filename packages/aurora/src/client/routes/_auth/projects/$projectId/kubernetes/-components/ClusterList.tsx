import { DataGrid, DataGridHeadCell, DataGridRow, PortalProvider, Status } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useKubernetesPermissions } from "../-hooks/useKubernetesPermissions"
import { ClusterListRow } from "./ClusterListRow"
import type { KubernetesLandscape } from "@/types/kubernetes"

interface ClusterListProps {
  projectId: string
  landscape: KubernetesLandscape
}

export function ClusterList({ projectId, landscape }: ClusterListProps) {
  const { t } = useLingui()

  const {
    permissions,
    isLoading: permissionsLoading,
    isError: permissionsError,
    error: permissionsErrorObj,
  } = useKubernetesPermissions(projectId, landscape)

  const {
    data: clusters,
    isLoading: clustersLoading,
    isError: clustersError,
    error: clustersErrorObj,
  } = trpcReact.kubernetes.clusters.list.useQuery(
    { project_id: projectId, landscape },
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      enabled: !permissionsLoading && !permissionsError && permissions.clusters.list,
    }
  )

  // Loading state - either permissions or clusters
  if (permissionsLoading || (clustersLoading && permissions.clusters.list)) {
    return <Status status="progress" title={t`Loading clusters...`} />
  }

  // Permissions error
  if (permissionsError) {
    return (
      <Status
        status="error"
        title={t`Failed to load permissions`}
        body={permissionsErrorObj?.message ?? t`An error occurred while loading permissions.`}
      />
    )
  }

  // Access denied - user lacks permission to list clusters
  if (!permissions.clusters.list) {
    return (
      <Status
        status="error"
        code={403}
        title={t`Access Denied`}
        body={t`You do not have permission to list clusters.`}
      />
    )
  }

  // Clusters query error
  if (clustersError) {
    return (
      <Status
        status="error"
        title={t`Failed to load clusters`}
        body={clustersErrorObj?.message ?? t`An error occurred while loading clusters.`}
      />
    )
  }

  // Empty state
  if (!clusters || clusters.length === 0) {
    return (
      <Status
        status="empty"
        title={t`No clusters`}
        body={t`There are no Kubernetes clusters in this project for the selected landscape.`}
      />
    )
  }

  return (
    <PortalProvider>
      <DataGrid columns={6} minContentColumns={[5]}>
        <DataGridRow>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Readiness`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Last Operation`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Kubernetes Version`}</DataGridHeadCell>
          <DataGridHeadCell />
        </DataGridRow>
        {clusters.map((cluster) => (
          <ClusterListRow
            key={cluster.uid ?? cluster.name}
            cluster={cluster}
            projectId={projectId}
            landscape={landscape}
          />
        ))}
      </DataGrid>
    </PortalProvider>
  )
}
