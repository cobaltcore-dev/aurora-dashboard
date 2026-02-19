import {
  DataGridCell,
  DataGridRow,
  Icon,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

export interface SecurityGroupPermissions {
  canUpdate: boolean
  canDelete: boolean
  canManageAccess: boolean
}

interface SecurityGroupTableRowProps {
  securityGroup: SecurityGroup
  projectName: string
  permissions: SecurityGroupPermissions
  onEdit: (sg: SecurityGroup) => void
  onAccessControl: (sg: SecurityGroup) => void
  onViewDetails?: (sg: SecurityGroup) => void
}

const BooleanIcon = ({ value }: { value: boolean | undefined }) => (
  <Icon icon={value ? "check" : "close"} color={value ? "text-theme-success" : "text-theme-error"} />
)

export function SecurityGroupTableRow({
  securityGroup: sg,
  projectName,
  permissions,
  onEdit,
  onAccessControl,
  onViewDetails,
}: SecurityGroupTableRowProps) {
  const { t } = useLingui()
  const formatDate = (date: string | null | undefined) => (date ? new Date(date).toLocaleDateString() : t`N/A`)

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
      <DataGridCell>{projectName}</DataGridCell>
      <DataGridCell>
        <BooleanIcon value={sg.stateful} />
      </DataGridCell>
      <DataGridCell>
        <BooleanIcon value={sg.shared} />
      </DataGridCell>
      <DataGridCell>{formatDate(sg.created_at)}</DataGridCell>
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
