import React from "react"

import { Cluster } from "@/server/Gardener/types/cluster"
import {
  Badge,
  BadgeVariantType,
  KnownIcons,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  Container,
  DataGridRow,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"

import { useLingui } from "@lingui/react/macro"

interface ClusterOverviewSectionProps {
  cluster: Cluster
}

const getStatusStyles = (status: string): { variant: BadgeVariantType; icon: KnownIcons } => {
  switch (status.toLowerCase()) {
    case "healthy":
    case "operational":
      return {
        variant: "success",
        icon: "success",
      }
    case "warning":
    case "pending":
      return {
        variant: "warning",
        icon: "warning",
      }
    case "unhealthy":
    case "error":
    case "failed":
      return {
        variant: "error",
        icon: "error",
      }
    default:
      return {
        variant: "default",
        icon: "default",
      }
  }
}

const ClusterOverviewSection: React.FC<ClusterOverviewSectionProps> = ({ cluster }) => {
  const statusStyles = getStatusStyles(cluster.status)

  const { t } = useLingui()

  return (
    <Container px={false} py>
      <ContentHeading>{t`Infrastructure`}</ContentHeading>
      <DataGrid columns={2} gridColumnTemplate="38% auto">
        <DataGridRow>
          <DataGridHeadCell>{t`Infrastructure`}</DataGridHeadCell>
          <DataGridCell>
            <span className="capitalize">{cluster.infrastructure}</span>
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridCell>{cluster.status} </DataGridCell>
        </DataGridRow>

        <DataGridRow>
          <DataGridHeadCell>{t`Region`}</DataGridHeadCell>
          <DataGridCell>{cluster.region} </DataGridCell>
        </DataGridRow>
      </DataGrid>
      <ContentHeading className="mt-6">{t`Kubernetes`}</ContentHeading>
      <DataGrid columns={2} gridColumnTemplate="38% auto">
        <DataGridRow>
          <DataGridHeadCell>{t`Version`}</DataGridHeadCell>
          <DataGridCell>{cluster.version}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Readiness`}</DataGridHeadCell>
          <DataGridCell>
            <span>
              <Badge variant={statusStyles.variant} icon={statusStyles.icon} text={cluster.readiness.status}></Badge>
            </span>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    </Container>
  )
}

export default ClusterOverviewSection
