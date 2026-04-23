import { DataGrid, DataGridRow, DataGridCell, DataGridHeadCell, Button } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

interface SecurityGroupBasicInfoProps {
  securityGroup: SecurityGroup
  onEdit?: () => void
  isReadOnly?: boolean
}

export function SecurityGroupBasicInfo({ securityGroup, onEdit, isReadOnly = false }: SecurityGroupBasicInfoProps) {
  const { t } = useLingui()

  const BooleanValue = ({ value }: { value: boolean | undefined }) => <span>{value ? t`Yes` : t`No`}</span>

  return (
    <div>
      <div className="mb-4 flex flex-row-reverse">
        {onEdit && !isReadOnly && (
          <Button variant="primary" onClick={onEdit} disabled={isReadOnly}>
            <Trans>Edit</Trans>
          </Button>
        )}
      </div>

      <DataGrid columns={4} gridColumnTemplate="15% 35% 15% 35%">
        <DataGridRow>
          <DataGridHeadCell>{t`Description`}</DataGridHeadCell>
          <DataGridCell colSpan={3}>
            <div
              className="overflow-hidden text-ellipsis whitespace-nowrap"
              title={securityGroup.description || undefined}
            >
              {securityGroup.description || t`—`}
            </div>
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`ID`}</DataGridHeadCell>
          <DataGridCell>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap" title={securityGroup.id}>
              {securityGroup.id}
            </div>
          </DataGridCell>
          <DataGridHeadCell>{t`Tags`}</DataGridHeadCell>
          <DataGridCell>
            <div
              className="overflow-hidden text-ellipsis whitespace-nowrap"
              title={securityGroup.tags?.join(", ") || undefined}
            >
              {securityGroup.tags?.join(", ") || t`—`}
            </div>
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Name`}</DataGridHeadCell>
          <DataGridCell>
            <div className="overflow-hidden text-ellipsis whitespace-nowrap" title={securityGroup.name || undefined}>
              {securityGroup.name}
            </div>
          </DataGridCell>
          <DataGridHeadCell>{t`Stateful`}</DataGridHeadCell>
          <DataGridCell>
            <BooleanValue value={securityGroup.stateful} />
          </DataGridCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridHeadCell>{t`Owning Project ID`}</DataGridHeadCell>
          <DataGridCell>
            <div
              className="overflow-hidden text-ellipsis whitespace-nowrap"
              title={securityGroup.project_id || undefined}
            >
              {securityGroup.project_id || t`—`}
            </div>
          </DataGridCell>
          <DataGridHeadCell>{t`Shared`}</DataGridHeadCell>
          <DataGridCell>
            <BooleanValue value={securityGroup.shared} />
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    </div>
  )
}
