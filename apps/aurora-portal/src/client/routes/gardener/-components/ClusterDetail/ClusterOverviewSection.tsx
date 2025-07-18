import React from "react"

import { Cluster } from "@/server/Gardener/types/cluster"
import { Badge, BadgeVariantType, KnownIcons, Stack } from "@cloudoperators/juno-ui-components"

import { useLingui } from "@lingui/react/macro"
import Section from "./Section"
import DataRow from "./DataRow"

interface ClusterOverviewSectionProps {
  cluster: Cluster
  handleShare: () => void
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

const ClusterOverviewSection: React.FC<ClusterOverviewSectionProps> = ({ cluster, handleShare }) => {
  const statusStyles = getStatusStyles(cluster.status)

  const { t } = useLingui()

  return (
    <>
      <Stack distribution="between" className="mt-5">
        <Stack gap="3" direction="vertical">
          <h3 className="text-xl font-semibold leading-none tracking-tight text-theme-highest">{cluster.name}</h3>
          <div
            className="text-sm text-theme-high mt-1.5 hover:text-theme-light transition-colors cursor-pointer"
            onClick={handleShare}
          >
            ID: <span className="font-mono">{cluster.uid}</span>
          </div>
        </Stack>
        <Stack direction="vertical" distribution="center">
          <Badge variant={statusStyles.variant} icon={statusStyles.icon} text={cluster.status} />
        </Stack>
      </Stack>
      <Section
        title={t`Infrastructure`}
        rows={[
          <DataRow
            key="infrastructure"
            label={t`Infrastructure:`}
            content={
              <Stack direction="horizontal" gap="1.5" alignment="center">
                <Badge text={cluster.infrastructure.substring(0, 3).toUpperCase()} variant="info" />{" "}
                <span className="text-theme-high capitalize">{cluster.infrastructure}</span>
              </Stack>
            }
          />,
          <DataRow
            key="region"
            label={t`Region:`}
            content={<span className="text-theme-high">{cluster.region}</span>}
          />,
        ]}
      />
      <Section
        title={t`Kubernetes`}
        rows={[
          <DataRow
            key="version"
            label={t`Version:`}
            content={
              <Stack>
                <span className="text-theme-link mr-0.5">v</span>
                <span className="text-theme-high">{cluster.version}</span>
              </Stack>
            }
          />,
          <DataRow
            key="readiness"
            label={t`Readiness:`}
            content={
              <Stack direction="vertical" alignment="start">
                <Badge variant={statusStyles.variant} icon={statusStyles.icon} text={cluster.readiness.status}></Badge>
              </Stack>
            }
          />,
        ]}
      />
    </>
  )
}

export default ClusterOverviewSection
