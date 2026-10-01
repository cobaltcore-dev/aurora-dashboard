import { useState } from "react"
import {
  Button,
  Message,
  Pagination,
  Select,
  SelectOption,
  SortButton,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { trpc } from "../../trpc"
import { usePermissions } from "../../usePermissions"
import { OrdersListContainer } from "./-table/OrdersListContainer"
import { CreateOrderModal, DeleteOrderModal } from "./-modals/OrderModals"
import type { Order } from "../../../server/types"

const PAGE_SIZE = 50

const SORT_FIELDS = [{ value: "created", label: "Created At" }]

interface OrdersListProps {
  projectId: string
  sort: string
  page: number
  onSortChange: (value: string) => void
  onPageChange: (page: number) => void
  onShowDetail: (order: Order) => void
}

export function OrdersList({ projectId, sort, page, onSortChange, onPageChange, onShowDetail }: OrdersListProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)

  const { permissions, isLoading: permissionsLoading } = usePermissions(projectId, [
    "key-manager:orders:list",
    "key-manager:orders:create",
    "key-manager:orders:delete",
  ])

  // Split combined "field:dir" sort param into parts for the two controls
  const [sortField, sortDir] = (sort || "created:desc").split(":") as [string, "asc" | "desc"]

  const utils = trpc.useUtils()
  const { data, isLoading, isError, error } = trpc.keyManager.listOrders.useQuery(
    {
      project_id: projectId,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort: sort || undefined,
    },
    { enabled: permissions["key-manager:orders:list"] }
  )

  if (permissionsLoading) return null
  if (!permissions["key-manager:orders:list"]) {
    return <Message variant="warning">You do not have permission to view orders.</Message>
  }

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <>
      <Stack direction="vertical" className="juno-pattern-datagrid-outer">
        <Stack direction="vertical" className="juno-pattern-datagrid-header">
          {/* Zone 1: Sort controls + Create — bare Stack, no DataGridToolbar background */}
          <Stack distribution="end" alignment="center" gap="2" className="jn:pb-2">
            <Stack gap="0.5">
              <Select
                label="Sort by"
                value={sortField}
                onChange={(v) => onSortChange(`${typeof v === "string" ? v : "created"}:${sortDir}`)}
                className="jn:min-w-40"
              >
                {SORT_FIELDS.map((f) => (
                  <SelectOption key={f.value} value={f.value} label={f.label} />
                ))}
              </Select>
              <SortButton order={sortDir} onChange={(dir) => onSortChange(`${sortField}:${dir}`)} />
            </Stack>
            {permissions["key-manager:orders:create"] && (
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                Create Order
              </Button>
            )}
          </Stack>
          {/* No Zone 2 — Barbican orders API has no search capability */}
        </Stack>

        <OrdersListContainer
          orders={data?.orders ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canDelete={permissions["key-manager:orders:delete"]}
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
