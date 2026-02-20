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
  canUpdate: boolean
  canDelete: boolean
  canManageAccess: boolean
}

interface SecurityGroupTableRowProps {
  securityGroup: SecurityGroup
  permissions: SecurityGroupPermissions
  onEdit: (sg: SecurityGroup) => void
  onAccessControl: (sg: SecurityGroup) => void
  onViewDetails?: (sg: SecurityGroup) => void
}

export function SecurityGroupTableRow({
  securityGroup: sg,
  permissions,
  onEdit,
  onAccessControl,
  onViewDetails,
}: SecurityGroupTableRowProps) {
  const { t } = useLingui()

  const BooleanValue = ({ value }: { value: boolean | undefined }) => <span>{value ? t`Yes` : t`No`}</span>

  const handleShowDetails = () => {
    if (onViewDetails) {
      onViewDetails(sg)
    }
    // Placeholder: when detail route exists
    // navigate({ to: "/accounts/$accountId/projects/$projectId/compute/security-groups/$securityGroupId", params: { accountId, projectId, securityGroupId: sg.id } })
  }

  return (
    <DataGridRow key={sg.id} data-testid={`security-group-row-${sg.id}`}>
      <DataGridCell>
        <div>
          <p className="text-md">{sg.name}</p>
          <p className="text-xs text-theme-secondary">{sg.id}</p>
        </div>
      </DataGridCell>
      <DataGridCell>{sg.description || t`—`}</DataGridCell>
      <DataGridCell>
        <BooleanValue value={sg.shared} />
        {sg.shared && (
          <p>
            <Trans>Owner</Trans>: <span className="text-xs text-theme-secondary">{sg.project_id}</span>
          </p>
        )}
      </DataGridCell>
      <DataGridCell>
        <BooleanValue value={sg.stateful} />
      </DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()}>
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={() => handleShowDetails()} />
            {permissions.canUpdate && <PopupMenuItem label={t`Edit`} onClick={() => onEdit(sg)} />}
            {permissions.canManageAccess && (
              <PopupMenuItem label={t`Access Control`} onClick={() => onAccessControl(sg)} />
            )}
            {permissions.canDelete && <PopupMenuItem label={t`Delete`} onClick={() => {}} disabled />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
