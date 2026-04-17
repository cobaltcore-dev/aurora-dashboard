import {
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  Button,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

interface SecurityGroupBasicInfoProps {
  securityGroup: SecurityGroup
  onEdit?: () => void
}

export function SecurityGroupBasicInfo({ securityGroup, onEdit }: SecurityGroupBasicInfoProps) {
  const { t } = useLingui()

  const BooleanValue = ({ value }: { value: boolean | undefined }) => <span>{value ? t`Yes` : t`No`}</span>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <ContentHeading>{t`Security Group Basic Info`}</ContentHeading>
        {onEdit && (
          <Button variant="primary" onClick={onEdit} disabled={securityGroup.shared}>
            <Trans>Edit</Trans>
          </Button>
        )}
      </div>

      <DataGrid columns={4} gridColumnTemplate="15% 35% 15% 35%">
        <DataGridRow>
          <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
          <DataGridCell colSpan={3}>{securityGroup.description || t`—`}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.id}</DataGridCell>
          <DataGridHeadCell>{t`Tags`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.tags?.join(", ") || t`—`}</DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.name}</DataGridCell>
          <DataGridHeadCell>{t`Stateful`}</DataGridHeadCell>
          <DataGridCell>
            <BooleanValue value={securityGroup.stateful} />
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Owning Project ID`}</DataGridHeadCell>
          <DataGridCell>{securityGroup.project_id || t`—`}</DataGridCell>
          <DataGridHeadCell>{t`Shared`}</DataGridHeadCell>
          <DataGridCell>
            <BooleanValue value={securityGroup.shared} />
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    </div>
  )
}
