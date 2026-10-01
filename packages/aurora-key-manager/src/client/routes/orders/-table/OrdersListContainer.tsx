import { DataGrid, DataGridHeadCell, DataGridRow, DataGridCell, Status } from "@cloudoperators/juno-ui-components"
import { ORDERS_COLUMNS, ORDERS_COLUMN_COUNT } from "./constants"
import { OrderTableRow } from "./OrderTableRow"
import type { Order } from "../../../../server/types"

interface OrdersListContainerProps {
  orders: Order[]
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  canDelete: boolean
  onShowDetails: (order: Order) => void
  onDelete: (order: Order) => void
}

export function OrdersListContainer({
  orders,
  isLoading,
  isError,
  error,
  canDelete,
  onShowDetails,
  onDelete,
}: OrdersListContainerProps) {
  if (isLoading) {
    return <Status status="progress" title="Loading Orders..." />
  }

  if (isError) {
    return <Status status="error" title={error?.message ?? "Failed to Load Orders"} />
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
            canDelete={canDelete}
            onShowDetails={onShowDetails}
            onDelete={onDelete}
          />
        ))
      ) : (
        <DataGridRow>
          <DataGridCell colSpan={ORDERS_COLUMN_COUNT}>
            <Status
              status="empty"
              title="No Orders Found"
              body="There are no orders in this project. Create one to request secret generation."
            />
          </DataGridCell>
        </DataGridRow>
      )}
    </DataGrid>
  )
}
