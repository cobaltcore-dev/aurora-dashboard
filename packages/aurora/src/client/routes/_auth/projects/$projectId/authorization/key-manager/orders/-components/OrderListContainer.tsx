import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Status } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { ORDERS_COLUMNS, ORDERS_COLUMN_COUNT } from "./constants"
import { OrderTableRow } from "./OrderTableRow"
import type { Order } from "@/server/KeyManager/types/keyManager"

interface OrderListContainerProps {
  orders: Order[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  canDeleteOrder: boolean
  onShowDetails: (order: Order) => void
  onDelete: (order: Order) => void
}

export function OrderListContainer({
  orders,
  isLoading,
  isError,
  error,
  canDeleteOrder,
  onShowDetails,
  onDelete,
}: OrderListContainerProps) {
  const { t } = useLingui()

  if (isLoading) {
    return <Status status="progress" title={t`Loading Orders...`} />
  }

  if (isError) {
    return <Status status="error" title={error?.message ?? t`Failed to Load Orders`} />
  }

  return (
    <DataGrid columns={ORDERS_COLUMN_COUNT} minContentColumns={[ORDERS_COLUMN_COUNT - 1]}>
      <DataGridRow>
        {ORDERS_COLUMNS.map((label) => (
          <DataGridHeadCell key={label}>{label}</DataGridHeadCell>
        ))}
      </DataGridRow>
      {orders.length > 0 ? (
        orders.map((order) => (
          <OrderTableRow
            key={order.order_ref}
            order={order}
            canDeleteOrder={canDeleteOrder}
            onShowDetails={onShowDetails}
            onDelete={onDelete}
          />
        ))
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={ORDERS_COLUMN_COUNT}>
            <Status
              status="empty"
              title={t`No Orders Found`}
              body={t`There are no orders in this project. Create one to request secret generation.`}
            />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}
