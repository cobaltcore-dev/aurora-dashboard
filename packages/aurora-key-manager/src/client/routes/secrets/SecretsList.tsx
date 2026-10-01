import { useState } from "react"
import {
  Button,
  DataGridToolbar,
  Message,
  Pagination,
  SearchInput,
  Select,
  SelectOption,
  SortButton,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { trpc } from "../../trpc"
import { usePermissions } from "../../usePermissions"
import { SecretsListContainer } from "./-table/SecretsListContainer"
import { CreateSecretModal, DeleteSecretModal } from "./-modals/SecretModals"
import type { Secret } from "../../../server/types"

const PAGE_SIZE = 50

const SORT_FIELDS = [
  { value: "created", label: "Created" },
  { value: "name", label: "Name" },
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

  // Split combined "field:dir" sort param into parts for the two controls
  const [sortField, sortDir] = (sort || "created:desc").split(":") as [string, "asc" | "desc"]

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
            {permissions["key-manager:secrets:create"] && (
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                Create Secret
              </Button>
            )}
          </Stack>

          {/* Zone 2: Search — no filters available, left side intentionally empty */}
          <DataGridToolbar>
            <Stack distribution="end" alignment="center">
              <SearchInput
                placeholder="Search by name..."
                value={search}
                onSearch={(v) => onSearchChange(typeof v === "string" ? v : "")}
                onClear={() => onSearchChange("")}
                onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
              />
            </Stack>
          </DataGridToolbar>
        </Stack>

        <SecretsListContainer
          secrets={data?.secrets ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canDelete={permissions["key-manager:secrets:delete"]}
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
