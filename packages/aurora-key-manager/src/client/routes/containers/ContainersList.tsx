import { useState } from "react"
import { Button, DataGridToolbar, Message, Pagination, SearchInput } from "@cloudoperators/juno-ui-components"
import { trpc } from "../../trpc"
import { usePermissions } from "../../usePermissions"
import { ContainersListContainer } from "./-table/ContainersListContainer"
import { CreateContainerModal, DeleteContainerModal } from "./-modals/ContainerModals"
import type { Container } from "../../../server/types"

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
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Container | null>(null)

  const { permissions, isLoading: permissionsLoading } = usePermissions(projectId, [
    "key-manager:containers:list",
    "key-manager:containers:create",
    "key-manager:containers:delete",
  ])

  const utils = trpc.useUtils()
  const { data, isLoading, isError, error } = trpc.keyManager.listContainers.useQuery(
    {
      project_id: projectId,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      name: search || undefined,
    },
    { enabled: permissions["key-manager:containers:list"] }
  )

  if (permissionsLoading) return null
  if (!permissions["key-manager:containers:list"]) {
    return <Message variant="warning">You do not have permission to view containers.</Message>
  }

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <>
      <div className="bg-theme-background-lvl-1 flex w-full items-center gap-4 p-4">
        <div className="ml-auto flex items-center gap-3">
          <SearchInput
            placeholder="Search by name..."
            value={search}
            onSearch={(v) => onSearchChange(typeof v === "string" ? v : "")}
            onClear={() => onSearchChange("")}
            onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
          />
          {permissions["key-manager:containers:create"] && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              Create Container
            </Button>
          )}
        </div>
      </div>

      <DataGridToolbar />

      <ContainersListContainer
        containers={data?.containers ?? []}
        isLoading={isLoading}
        isError={isError}
        error={error}
        canDelete={permissions["key-manager:containers:delete"]}
        onShowDetails={onShowDetail}
        onDelete={setDeleteTarget}
      />

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
