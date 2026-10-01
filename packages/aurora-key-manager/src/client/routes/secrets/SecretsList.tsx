import { useState } from "react"
import {
  Button,
  DataGridToolbar,
  Message,
  Pagination,
  SearchInput,
  Select,
  SelectOption,
} from "@cloudoperators/juno-ui-components"
import { trpc } from "../../trpc"
import { usePermissions } from "../../usePermissions"
import { SecretsListContainer } from "./-table/SecretsListContainer"
import { CreateSecretModal, DeleteSecretModal } from "./-modals/SecretModals"
import type { Secret } from "../../../server/types"

const PAGE_SIZE = 50

const SORT_OPTIONS = [
  { value: "created:desc", label: "Newest first" },
  { value: "created:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name A–Z" },
  { value: "name:desc", label: "Name Z–A" },
]

interface SecretsListProps {
  projectId: string
  search: string
  sort: string
  page: number
  onSearchChange: (value: string) => void
  onSortChange: (value: string) => void
  onPageChange: (page: number) => void
  onShowDetail: (secret: Secret) => void
}

export function SecretsList({
  projectId,
  search,
  sort,
  page,
  onSearchChange,
  onSortChange,
  onPageChange,
  onShowDetail,
}: SecretsListProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null)

  const { permissions, isLoading: permissionsLoading } = usePermissions(projectId, [
    "key-manager:secrets:list",
    "key-manager:secrets:create",
    "key-manager:secrets:delete",
  ])

  const utils = trpc.useUtils()
  const { data, isLoading, isError, error } = trpc.keyManager.listSecrets.useQuery(
    {
      project_id: projectId,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      name: search || undefined,
      sort: sort || undefined,
    },
    { enabled: permissions["key-manager:secrets:list"] }
  )

  if (permissionsLoading) return null
  if (!permissions["key-manager:secrets:list"]) {
    return <Message variant="warning">You do not have permission to view secrets.</Message>
  }

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <>
      <div className="bg-theme-background-lvl-1 flex w-full items-center gap-4 p-4">
        <div className="flex shrink-0 items-center gap-2">
          <Select
            label="Sort by"
            value={sort || "created:desc"}
            onChange={(v) => onSortChange(typeof v === "string" ? v : "created:desc")}
            className="min-w-40"
          >
            {SORT_OPTIONS.map((o) => (
              <SelectOption key={o.value} value={o.value} label={o.label} />
            ))}
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <SearchInput
            placeholder="Search by name..."
            value={search}
            onSearch={(v) => onSearchChange(typeof v === "string" ? v : "")}
            onClear={() => onSearchChange("")}
            onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
          />
          {permissions["key-manager:secrets:create"] && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              Create Secret
            </Button>
          )}
        </div>
      </div>

      <DataGridToolbar />

      <SecretsListContainer
        secrets={data?.secrets ?? []}
        isLoading={isLoading}
        isError={isError}
        error={error}
        canDelete={permissions["key-manager:secrets:delete"]}
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
        <CreateSecretModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => utils.keyManager.listSecrets.invalidate()}
        />
      )}
      {deleteTarget && (
        <DeleteSecretModal projectId={projectId} secret={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </>
  )
}
