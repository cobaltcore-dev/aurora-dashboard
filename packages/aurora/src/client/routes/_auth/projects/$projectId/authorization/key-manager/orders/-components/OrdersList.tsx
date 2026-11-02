import { useEffect, useState } from "react"
import { Button, DataGridToolbar, Message, Pagination, SearchInput, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useKeyManagerPermissions } from "../../-components/useKeyManagerPermissions"
import { useAllKeyManagerPages } from "../../-components/useAllKeyManagerPages"
import { uuidFromRef } from "../../-components/utils"
import { OrderListContainer } from "./OrderListContainer"
import { CreateOrderModal, DeleteOrderModal } from "./OrderModals"
import type { Order } from "@/server/KeyManager/types/keyManager"

const PAGE_SIZE = 50

interface OrdersListProps {
  projectId: string
  search: string
  page: number
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onShowDetail: (order: Order) => void
}

export function OrdersList({ projectId, search, page, onSearchChange, onPageChange, onShowDetail }: OrdersListProps) {
  const { t } = useLingui()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  // Local text state so typing doesn't navigate/refetch on every keystroke; we commit on submit/clear.
  const [searchText, setSearchText] = useState(search)

  // Keep the field in sync when the committed search changes elsewhere (e.g. browser back).
  useEffect(() => {
    setSearchText(search)
  }, [search])

  const { permissions, isLoading: permissionsLoading } = useKeyManagerPermissions(projectId, [
    "key-manager:orders:list",
    "key-manager:orders:create",
    "key-manager:orders:delete",
  ])

  const utils = trpcReact.useUtils()
  const canList = permissions["key-manager:orders:list"]
  const isSearching = Boolean(search)

  // Normal browsing: cheap server-side pagination.
  const pageQuery = trpcReact.keyManager.listOrders.useQuery(
    { project_id: projectId, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
    { enabled: canList && !isSearching }
  )

  // Searching: Barbican can't filter orders, so fetch all and match name or id in the browser.
  const allQuery = useAllKeyManagerPages<Order>(
    ["km-all-orders", projectId],
    async (offset, limit) => {
      const res = await utils.keyManager.listOrders.fetch({ project_id: projectId, offset, limit })
      return { total: res.total, items: res.orders }
    },
    canList && isSearching
  )

  const term = search.trim().toLowerCase()
  const filtered = (allQuery.data ?? []).filter((o) => {
    const id = uuidFromRef(o.order_ref)
    const name = typeof o.meta?.name === "string" ? o.meta.name : ""
    return name.toLowerCase().includes(term) || id.toLowerCase().includes(term)
  })

  const isLoading = isSearching ? allQuery.isLoading : pageQuery.isLoading
  const isError = isSearching ? allQuery.isError : pageQuery.isError
  const error = isSearching ? allQuery.error : pageQuery.error
  const totalCount = isSearching ? filtered.length : (pageQuery.data?.total ?? 0)
  const orders = isSearching ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : (pageQuery.data?.orders ?? [])

  // After deleting the last item on a page, step back so the user never lands on an empty page.
  useEffect(() => {
    if (!isLoading && !isError && page > 1 && orders.length === 0) {
      onPageChange(page - 1)
    }
  }, [isLoading, isError, page, orders.length, onPageChange])

  if (permissionsLoading) return null
  if (!canList) {
    return <Message variant="warning">{t`You do not have permission to view orders.`}</Message>
  }

  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 1

  return (
    <>
      <Stack direction="vertical" className="juno-pattern-datagrid-outer">
        <Stack direction="vertical" className="juno-pattern-datagrid-header">
          <Stack distribution="end" alignment="center" gap="2" className="jn:pb-2">
            {permissions["key-manager:orders:create"] && (
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                {t`Create Order`}
              </Button>
            )}
          </Stack>

          <DataGridToolbar>
            <Stack distribution="end" alignment="center">
              <SearchInput
                placeholder={t`Search by name or ID`}
                value={searchText}
                onSearch={(v) => onSearchChange(typeof v === "string" ? v : "")}
                onClear={() => {
                  setSearchText("")
                  onSearchChange("")
                }}
                onInput={(e) => setSearchText((e.target as HTMLInputElement).value)}
              />
            </Stack>
          </DataGridToolbar>
        </Stack>

        <OrderListContainer
          orders={orders}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canDeleteOrder={permissions["key-manager:orders:delete"]}
          isFiltered={isSearching}
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
