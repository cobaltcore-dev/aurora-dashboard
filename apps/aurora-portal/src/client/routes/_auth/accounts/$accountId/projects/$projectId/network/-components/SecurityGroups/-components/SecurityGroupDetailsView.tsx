import { DataGrid, DataGridRow, DataGridCell } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import { Container, ContentHeading, DataGridHeadCell } from "@cloudoperators/juno-ui-components"
interface SecurityGroupDetailsViewProps {
  securityGroup: SecurityGroup
}

export function SecurityGroupDetailsView({ securityGroup }: SecurityGroupDetailsViewProps) {
  const { t } = useLingui()
  return (
    <Container px={false} py>
      <ContentHeading>{t`Security Group Basic Info`}</ContentHeading>
      <DataGrid columns={2} gridColumnTemplate="38% auto">
        <DataGridRow>
          <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.description || t`N/A`}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.id}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.name}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Owning project`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.project_id || t`N/A`}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Created At`}</DataGridHeadCell>
          <DataGridCell>
            {securityGroup.created_at ? new Date(securityGroup.created_at).toLocaleDateString() : t`N/A`}
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Updated At`}</DataGridHeadCell>
          <DataGridCell>
            {securityGroup.updated_at ? new Date(securityGroup.updated_at).toLocaleDateString() : t`N/A`}
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    </Container>
  )
}
