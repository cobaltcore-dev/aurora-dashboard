import React from "react"
import { Stack, Badge } from "@cloudoperators/juno-ui-components"
import { Cluster } from "@/server/Gardener/types/cluster"
import { useLingui, Trans } from "@lingui/react/macro"
import Section from "./Section"
import DataRow from "./DataRow"

interface SettingsSectionProps {
  maintenance: Cluster["maintenance"]
  autoUpdate: Cluster["autoUpdate"]
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ maintenance, autoUpdate }) => {
  const { t } = useLingui()

  return (
    <Stack gap="10" direction="vertical">
      <Section
        title={
          <Stack gap="2">
            <h4 className={"text-xl font-semibold leading-none tracking-tight text-theme-highest"}>
              <Trans>Maintenance Window</Trans>
            </h4>{" "}
            {maintenance.startTime && <Badge variant="warning" text="Scheduled" />}
          </Stack>
        }
        rows={[
          <DataRow
            key="startTime"
            label={t`Start Time:`}
            content={<span className="text-theme-high">{maintenance.startTime}</span>}
          />,
          <DataRow
            key="windowTime"
            label={t`Window Time:`}
            content={<span className="text-theme-high">{maintenance.windowTime}</span>}
          />,
          <DataRow
            key="timeZone"
            label={t`Timezone:`}
            content={<span className="text-theme-high">{maintenance.timezone}</span>}
          />,
        ]}
      />
      <Section
        title={t`Auto Update`}
        rows={[
          <DataRow
            key="osUpdates"
            label={t`OS Updates:`}
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
            label={t`Kubernetes Updates:`}
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
}

export default SettingsSection
