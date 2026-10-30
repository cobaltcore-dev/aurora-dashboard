import { useEffect, useState } from "react"
import { Button, Message, Pagination, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useKeyManagerPermissions } from "../../-components/useKeyManagerPermissions"
import { OrderListContainer } from "./OrderListContainer"
import { CreateOrderModal, DeleteOrderModal } from "./OrderModals"
import type { Order } from "@/server/KeyManager/types/keyManager"

const PAGE_SIZE = 50

interface OrdersListProps {
  projectId: string
  page: number
  onPageChange: (page: number) => void
  onShowDetail: (order: Order) => void
}

export function OrdersList({ projectId, page, onPageChange, onShowDetail }: OrdersListProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)

  const { permissions, isLoading: permissionsLoading } = useKeyManagerPermissions(projectId, [
    "key-manager:orders:list",
    "key-manager:orders:create",
    "key-manager:orders:delete",
  ])

  const utils = trpcReact.useUtils()
  const { data, isLoading, isError, error } = trpcReact.keyManager.listOrders.useQuery(
    {
      project_id: projectId,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    },
    { enabled: permissions["key-manager:orders:list"] }
  )

  // After deleting the last item on a page, step back so the user never lands on an empty page.
  useEffect(() => {
    if (!isLoading && !isError && page > 1 && (data?.orders.length ?? 0) === 0) {
      onPageChange(page - 1)
    }
  }, [isLoading, isError, page, data, onPageChange])

  if (permissionsLoading) return null
  if (!permissions["key-manager:orders:list"]) {
    return <Message variant="warning">You do not have permission to view orders.</Message>
  }

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <>
      <Stack direction="vertical" className="juno-pattern-datagrid-outer">
        <Stack direction="vertical" className="juno-pattern-datagrid-header">
          <Stack distribution="end" alignment="center" gap="2" className="jn:pb-2">
            {permissions["key-manager:orders:create"] && (
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                Create Order
              </Button>
            )}
          </Stack>
        </Stack>

        <OrderListContainer
          orders={data?.orders ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canDeleteOrder={permissions["key-manager:orders:delete"]}
          onShowDetails={onShowDetail}
          onDelete={setDeleteTarget}
        />
      </Stack>

      {totalPages > 1 && (
        <div className="flex justify-center py-4">
          <Pagination
            variant="input"
            currentPage={page}
            pages={totalPages}
            onPressPrevious={() => onPageChange(Math.max(page - 1, 1))}
            onPressNext={() => onPageChange(Math.min(page + 1, totalPages))}
            onSelectChange={(selectedPage: number) => onPageChange(selectedPage)}
            onInputChange={() => {}}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                const val = parseInt((e.target as HTMLInputElement).value, 10)
                if (!isNaN(val) && val >= 1 && val <= totalPages) onPageChange(val)
              }
            }}
          />
        </div>
      )}

      {showCreate && (
        <CreateOrderModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => utils.keyManager.listOrders.invalidate()}
        />
      )}
      {deleteTarget && (
        <DeleteOrderModal projectId={projectId} order={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </>
  )
}
