import {
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"

interface RBACPolicyRowProps {
  policy: RBACPolicy
  onDelete: () => void
}

export function RBACPolicyRow({ policy, onDelete }: RBACPolicyRowProps) {
  const { t } = useLingui()

  return (
    <DataGridRow>
      <DataGridCell>{policy.target_tenant}</DataGridCell>
      <DataGridCell>{policy.action}</DataGridCell>
      <DataGridCell onClick={(e) => e.stopPropagation()} className="items-end justify-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Remove`} onClick={onDelete} />
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
