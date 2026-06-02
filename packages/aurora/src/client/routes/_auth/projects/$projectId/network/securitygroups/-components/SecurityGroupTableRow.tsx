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
  isReadOnly?: boolean
}

export function SecurityGroupTableRow({
  securityGroup: sg,
  permissions,
  onEdit,
  onDelete,
  onViewDetails,
  isReadOnly = false,
}: SecurityGroupTableRowProps) {
  const { t } = useLingui()

  const BooleanValue = ({ value }: { value: boolean | undefined }) => <span>{value ? t`Yes` : t`No`}</span>

  const handleShowDetails = () => {
    if (onViewDetails) {
      onViewDetails(sg)
    }
  }

  return (
    <DataGridRow
      key={sg.id}
      data-testid={`security-group-row-${sg.id}`}
      onClick={handleShowDetails}
      className="hover:bg-theme-background-lvl-2 cursor-pointer"
    >
      <DataGridCell>
        <div>
          <p className="text-md">{sg.name}</p>
          <p className="text-theme-light text-xs">{sg.id}</p>
        </div>
      </DataGridCell>
      <DataGridCell>{sg.description || t`—`}</DataGridCell>
      <DataGridCell>
        <BooleanValue value={sg.shared} />
        {sg.shared && (
          <p>
            <Trans>Owner</Trans>: <span className="text-theme-light text-xs">{sg.project_id}</span>
          </p>
        )}
      </DataGridCell>
      <DataGridCell>
        <BooleanValue value={sg.stateful} />
      </DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end justify-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={() => handleShowDetails()} />
            {permissions.canUpdate && !isReadOnly && <PopupMenuItem label={t`Edit`} onClick={() => onEdit(sg)} />}
            {permissions.canDelete && !isReadOnly && <PopupMenuItem label={t`Delete`} onClick={() => onDelete(sg)} />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
