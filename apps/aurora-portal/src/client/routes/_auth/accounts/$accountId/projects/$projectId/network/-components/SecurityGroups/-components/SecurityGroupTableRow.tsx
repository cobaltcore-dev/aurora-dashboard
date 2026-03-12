import {
  DataGridCell,
  DataGridRow,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { useLingui, Trans } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

export interface SecurityGroupPermissions {
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canManageAccess: boolean
}

interface SecurityGroupTableRowProps {
  securityGroup: SecurityGroup
  permissions: SecurityGroupPermissions
  onEdit: (sg: SecurityGroup) => void
  onDelete: (sg: SecurityGroup) => void
  onViewDetails?: (sg: SecurityGroup) => void
}

export function SecurityGroupTableRow({
  securityGroup: sg,
  permissions,
  onEdit,
  onDelete,
  onViewDetails,
}: SecurityGroupTableRowProps) {
  const { t } = useLingui()

  const BooleanValue = ({ value }: { value: boolean | undefined }) => <span>{value ? t`Yes` : t`No`}</span>

  const handleShowDetails = () => {
    if (onViewDetails) {
      onViewDetails(sg)
    }
  }

  return (
    <DataGridRow key={sg.id} data-testid={`security-group-row-${sg.id}`}>
      <DataGridCell>
        <div>
          <p className="text-md">{sg.name}</p>
          <p className="text-theme-secondary text-xs">{sg.id}</p>
        </div>
      </DataGridCell>
      <DataGridCell>{sg.description || t`—`}</DataGridCell>
      <DataGridCell>
        <BooleanValue value={sg.shared} />
        {sg.shared && (
          <p>
            <Trans>Owner</Trans>: <span className="text-theme-secondary text-xs">{sg.project_id}</span>
          </p>
        )}
      </DataGridCell>
      <DataGridCell>
        <BooleanValue value={sg.stateful} />
      </DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={() => handleShowDetails()} />
            {permissions.canUpdate && <PopupMenuItem label={t`Edit`} onClick={() => onEdit(sg)} />}
            {permissions.canDelete && <PopupMenuItem label={t`Delete`} onClick={() => onDelete(sg)} />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
