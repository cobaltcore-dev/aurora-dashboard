import {
  DataGridRow,
  DataGridCell,
  Button,
  PopupMenu,
  PopupMenuToggle,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuSectionSeparator,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { uuidFromRef } from "../../-components/utils"
import ClipboardText from "@/client/components/ClipboardText"
import type { Order } from "@/server/KeyManager/types/keyManager"

interface OrderTableRowProps {
  order: Order
  canDeleteOrder: boolean
  onShowDetails: (order: Order) => void
  onDelete: (order: Order) => void
}

export function OrderTableRow({ order, canDeleteOrder, onShowDetails, onDelete }: OrderTableRowProps) {
  const { t } = useLingui()
  const id = uuidFromRef(order.order_ref)
  const name = typeof order.meta?.name === "string" ? order.meta.name : null
  return (
    <DataGridRow>
      <DataGridCell>
        <div>{name ?? <em>{t`unnamed`}</em>}</div>
        <div className="text-xs opacity-60">
          <ClipboardText text={id} />
        </div>
      </DataGridCell>
      <DataGridCell>{order.status}</DataGridCell>
      <DataGridCell>{order.type}</DataGridCell>
      <DataGridCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="items-end pr-0">
        <PopupMenu>
          <PopupMenuToggle as="div">
            <Button
              icon="moreVert"
              title={t`Order actions`}
              aria-label={t`Order actions`}
              className="!bg-transparent"
            />
          </PopupMenuToggle>
          <PopupMenuOptions>
            <PopupMenuItem label={t`Show Details`} onClick={() => onShowDetails(order)} />
            {canDeleteOrder && (
              <>
                <PopupMenuSectionSeparator />
                <PopupMenuItem label={t`Delete`} onClick={() => onDelete(order)} />
              </>
            )}
          </PopupMenuOptions>
        </PopupMenu>
      </DataGridCell>
    </DataGridRow>
  )
}
