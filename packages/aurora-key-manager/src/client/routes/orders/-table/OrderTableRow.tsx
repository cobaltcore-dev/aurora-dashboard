import {
  DataGridRow,
  DataGridCell,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
} from "@cloudoperators/juno-ui-components"
import { uuidFromRef } from "../../../utils"
import { CopyText } from "../../../components/CopyText"
import type { Order } from "../../../../server/types"

interface OrderTableRowProps {
  order: Order
  canDelete: boolean
  onShowDetails: (order: Order) => void
  onDelete: (order: Order) => void
}

export function OrderTableRow({ order, canDelete, onShowDetails, onDelete }: OrderTableRowProps) {
  const id = uuidFromRef(order.order_ref)
  return (
    <DataGridRow>
      <DataGridCell>
        <div className="text-xs opacity-60">
          <CopyText text={id} />
        </div>
      </DataGridCell>
      <DataGridCell>{order.type}</DataGridCell>
      <DataGridCell>{order.status}</DataGridCell>
      <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuOptions>
            <PopupMenuItem label="Show Details" onClick={() => onShowDetails(order)} />
            {canDelete && <PopupMenuItem label="Delete" onClick={() => onDelete(order)} />}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
