import { useEffect, useState } from "react"
import { Button, DataGridToolbar, Pagination, SearchInput, Stack, Status } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useKeyManagerPermissions } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/useKeyManagerPermissions"
import { useAllKeyManagerPages } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/useAllKeyManagerPages"
import { uuidFromRef } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/keyManagerUtils"
import { ContainerListContainer } from "./ContainerListContainer"
import { CreateContainerModal } from "./CreateContainerModal"
import { DeleteContainerModal } from "./DeleteContainerModal"
import type { Container } from "@/server/KeyManager/types/keyManager"

const PAGE_SIZE = 50

interface ContainersListProps {
  projectId: string
  search: string
  page: number
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onShowDetail: (container: Container) => void
}

export function ContainersList({
  projectId,
  search,
  page,
  onSearchChange,
  onPageChange,
  onShowDetail,
}: ContainersListProps) {
  const { t } = useLingui()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Container | null>(null)
  // Local text state so typing doesn't navigate/refetch on every keystroke; we commit on submit/clear.
  const [searchText, setSearchText] = useState(search)

  // Keep the field in sync when the committed search changes elsewhere (e.g. browser back).
  useEffect(() => {
    setSearchText(search)
  }, [search])

  const { permissions, isLoading: permissionsLoading } = useKeyManagerPermissions(projectId, [
    "key-manager:containers:list",
    "key-manager:containers:create",
    "key-manager:containers:delete",
  ])

  const utils = trpcReact.useUtils()
  const canList = permissions["key-manager:containers:list"]
  const isSearching = Boolean(search)

  // Barbican's containers list ignores sort and returns oldest-first, so we fetch every page and
  // sort newest-first in the browser (this also enables search by name or id). Paginated client-side.
  const allQuery = useAllKeyManagerPages<Container>(
    ["km-all-containers", projectId],
    async (offset, limit) => {
      const res = await utils.keyManager.listContainers.fetch({ project_id: projectId, offset, limit })
      return { total: res.total, items: res.containers }
    },
    canList
  )

  const term = search.trim().toLowerCase()
  const sorted = [...(allQuery.data ?? [])].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  )
  const filtered = term
    ? sorted.filter((c) => {
        const id = uuidFromRef(c.container_ref)
        return (c.name ?? "").toLowerCase().includes(term) || id.toLowerCase().includes(term)
      })
    : sorted

  const isLoading = allQuery.isLoading
  const isError = allQuery.isError
  const error = allQuery.error
  const totalCount = filtered.length
  const containers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const lastUpdated = allQuery.dataUpdatedAt ? new Date(allQuery.dataUpdatedAt).toLocaleTimeString() : null

  // After deleting the last item on a page, step back so the user never lands on an empty page.
  useEffect(() => {
    if (!isLoading && !isError && page > 1 && containers.length === 0) {
      onPageChange(page - 1)
    }
  }, [isLoading, isError, page, containers.length, onPageChange])

  if (permissionsLoading) return null
  if (!canList) {
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You do not have the necessary permissions to view Containers.`}
      />
    )
  }

  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 1

  return (
    <>
      <Stack direction="vertical" className="juno-pattern-datagrid-outer">
        <Stack direction="vertical" className="juno-pattern-datagrid-header">
          <Stack distribution="end" alignment="center" gap="2" className="jn:pb-2">
            {permissions["key-manager:containers:create"] && (
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                {t`Create Container`}
              </Button>
            )}
          </Stack>

          <DataGridToolbar>
            <Stack distribution="between" alignment="center" className="jn:text-sm">
              <span className="jn:theme-color-text-light">
                {t`Showing ${totalCount} containers`}
                {lastUpdated && <> · {t`Last updated: ${lastUpdated}`}</>}
              </span>
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

        <ContainerListContainer
          containers={containers}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canDeleteContainer={permissions["key-manager:containers:delete"]}
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
        <CreateContainerModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => utils.keyManager.listContainers.invalidate()}
        />
      )}
      {deleteTarget && (
        <DeleteContainerModal projectId={projectId} container={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </>
  )
}
