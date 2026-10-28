import { useEffect, useState } from "react"
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
import { trpcReact } from "@/client/trpcClient"
import { useKeyManagerPermissions } from "../../-components/useKeyManagerPermissions"
import { SecretListContainer } from "./SecretListContainer"
import { CreateSecretModal, DeleteSecretModal } from "./SecretModals"
import type { Secret } from "@/server/KeyManager/types/keyManager"

const PAGE_SIZE = 50

const SORT_FIELDS = [
  { value: "created", label: "Created At" },
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

  const { permissions, isLoading: permissionsLoading } = useKeyManagerPermissions(projectId, [
    "key-manager:secrets:list",
    "key-manager:secrets:create",
    "key-manager:secrets:delete",
  ])

  const [sortField, sortDir] = (sort || "created:desc").split(":") as [string, "asc" | "desc"]

  const utils = trpcReact.useUtils()
  const { data, isLoading, isError, error } = trpcReact.keyManager.listSecrets.useQuery(
    {
      project_id: projectId,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      name: search || undefined,
      sort: sort || undefined,
    },
    { enabled: permissions["key-manager:secrets:list"] }
  )

  // After deleting the last item on a page, step back so the user never lands on an empty page.
  useEffect(() => {
    if (!isLoading && !isError && page > 1 && (data?.secrets.length ?? 0) === 0) {
      onPageChange(page - 1)
    }
  }, [isLoading, isError, page, data, onPageChange])

  if (permissionsLoading) return null
  if (!permissions["key-manager:secrets:list"]) {
    return <Message variant="warning">You do not have permission to view secrets.</Message>
  }

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <>
      <Stack direction="vertical" className="juno-pattern-datagrid-outer">
        <Stack direction="vertical" className="juno-pattern-datagrid-header">
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

          <DataGridToolbar>
            <Stack distribution="end" alignment="center">
              <SearchInput
                placeholder="Search by name or ID"
                value={search}
                onSearch={(v) => onSearchChange(typeof v === "string" ? v : "")}
                onClear={() => onSearchChange("")}
                onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
              />
            </Stack>
          </DataGridToolbar>
        </Stack>

        <SecretListContainer
          secrets={data?.secrets ?? []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canDeleteSecret={permissions["key-manager:secrets:delete"]}
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
