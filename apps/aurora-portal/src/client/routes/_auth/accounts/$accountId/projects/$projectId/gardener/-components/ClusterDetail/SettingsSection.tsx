import React from "react"
import {
  Container,
  DataGrid,
  DataGridCell,
  DataGridHeadCell,
  ContentHeading,
  DataGridRow,
  Badge,
} from "@cloudoperators/juno-ui-components"
import { Cluster } from "@/server/Gardener/types/cluster"
import { useLingui } from "@lingui/react/macro"

interface SettingsSectionProps {
  maintenance: Cluster["maintenance"]
  autoUpdate: Cluster["autoUpdate"]
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ maintenance, autoUpdate }) => {
  const { t } = useLingui()

  return (
    <Container px={false} py>
      <ContentHeading>{t`Maintenance Window`} </ContentHeading>
      <DataGrid columns={2} gridColumnTemplate="38% auto">
        <DataGridRow>
          <DataGridHeadCell>{t`Start Time`}</DataGridHeadCell>
          <DataGridCell>{maintenance.startTime}</DataGridCell>
        </DataGridRow>

        <DataGridRow>
          <DataGridHeadCell>{t`Window Time`}</DataGridHeadCell>
          <DataGridCell>
            <span className="capitalize">{maintenance.windowTime}</span>
          </DataGridCell>
        </DataGridRow>

        <DataGridRow>
          <DataGridHeadCell>{t`Timezone`}</DataGridHeadCell>
          <DataGridCell>{maintenance.timezone} </DataGridCell>
        </DataGridRow>
      </DataGrid>

      <ContentHeading className="mt-6">{t`Auto Update`}</ContentHeading>
      <DataGrid columns={2} gridColumnTemplate="38% auto">
        <DataGridRow>
          <DataGridHeadCell>{t`OS Updates`}</DataGridHeadCell>
          <DataGridCell>
            <span>
              {autoUpdate.os ? (
                <Badge variant="success" text="Enabled" icon="checkCircle" />
              ) : (
                <Badge variant="error" text="Disabled" icon="errorOutline" />
              )}
            </span>
          </DataGridCell>
        </DataGridRow>

        <DataGridRow>
          <DataGridHeadCell>{t`Kubernetes Updates`}</DataGridHeadCell>
          <DataGridCell>
            <span>
              {autoUpdate.kubernetes ? (
                <Badge variant="success" text="Enabled" icon="checkCircle" />
              ) : (
                <Badge variant="error" text="Disabled" icon="errorOutline" />
              )}
            </span>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    </Container>
  )
}

export default SettingsSection
