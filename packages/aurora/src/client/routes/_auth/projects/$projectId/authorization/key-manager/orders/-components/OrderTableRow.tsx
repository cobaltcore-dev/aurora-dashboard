import {
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { uuidFromRef } from "../../-components/utils"
import ClipboardText from "@/client/components/ClipboardText"
import type { Order } from "@/server/KeyManager/types/keyManager"

interface OrderTableRowProps {
  order: Order
  canDelete: boolean
  onShowDetails: (order: Order) => void
  onDelete: (order: Order) => void
}

export function OrderTableRow({ order, canDelete, onShowDetails, onDelete }: OrderTableRowProps) {
  const { t } = useLingui()
  const id = uuidFromRef(order.order_ref)
  return (
    <DataGridRow>
      <DataGridCell>
        <div className="text-xs opacity-60">
          <ClipboardText text={id} />
        </div>
      </DataGridCell>
      <DataGridCell>{order.status}</DataGridCell>
      <DataGridCell>{order.type}</DataGridCell>
      <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={() => onShowDetails(order)} />
            {canDelete && <PopupMenuItem label={t`Delete`} onClick={() => onDelete(order)} />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
