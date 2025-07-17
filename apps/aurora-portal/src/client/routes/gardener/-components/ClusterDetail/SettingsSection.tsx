import React from "react"
import { Stack, Badge } from "@cloudoperators/juno-ui-components"
import { Cluster } from "@/server/Gardener/types/cluster"
import Section from "./Section"
import DataRow from "./DataRow"

interface SettingsSectionProps {
  maintenance: Cluster["maintenance"]
  autoUpdate: Cluster["autoUpdate"]
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ maintenance, autoUpdate }) => (
  <Stack gap="10" direction="vertical">
    <Section
      title={
        <Stack gap="2">
          <h4 className={"text-xl font-semibold leading-none tracking-tight text-theme-highest"}>Maintenance Window</h4>{" "}
          {maintenance.startTime && <Badge variant="warning" text="Scheduled" />}
        </Stack>
      }
      rows={[
        <DataRow
          key="startTime"
          label="Start Time:"
          content={<span className="text-theme-high">{maintenance.startTime}</span>}
        />,
        <DataRow
          key="windowTime"
          label="Window Time:"
          content={<span className="text-theme-high">{maintenance.windowTime}</span>}
        />,
        <DataRow
          key="timeZone"
          label="Timezone:"
          content={<span className="text-theme-high">{maintenance.timezone}</span>}
        />,
      ]}
    />
    <Section
      title="Auto Update"
      rows={[
        <DataRow
          key="osUpdates"
          label="OS Updates:"
          content={
            <span className="text-theme-high">
              {autoUpdate.os ? (
                <Badge variant="success" text="Enabled" icon="checkCircle" />
              ) : (
                <Badge variant="error" text="Disabled" icon="errorOutline" />
              )}
            </span>
          }
        />,
        <DataRow
          key="kubernetesUpdates"
          label="Kubernetes Updates:"
          content={
            <span className="text-theme-high">
              {autoUpdate.kubernetes ? (
                <Badge variant="success" text="Enabled" icon="checkCircle" />
              ) : (
                <Badge variant="error" text="Disabled" icon="errorOutline" />
              )}
            </span>
          }
        />,
      ]}
    ></Section>
  </Stack>
)

export default SettingsSection
