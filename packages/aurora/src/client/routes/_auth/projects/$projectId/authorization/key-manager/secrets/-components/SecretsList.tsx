import { useEffect, useState } from "react"
import {
  Button,
  DataGridToolbar,
  Status,
  Pagination,
  SearchInput,
  Select,
  SelectOption,
  SortButton,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useLingui } from "@lingui/react/macro"
import { useKeyManagerPermissions } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/useKeyManagerPermissions"
import { SecretListContainer } from "./SecretListContainer"
import { CreateSecretModal } from "./CreateSecretModal"
import { DeleteSecretModal } from "./DeleteSecretModal"
import type { Secret } from "@/server/KeyManager/types/keyManager"

const PAGE_SIZE = 50

const SORT_FIELDS = ["created", "name"] as const

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
  const { t } = useLingui()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Secret | null>(null)
  // Local text state so typing doesn't navigate/refetch on every keystroke; we commit on submit/clear.
  const [searchText, setSearchText] = useState(search)

  // Keep the field in sync when the committed search changes elsewhere (e.g. browser back).
  useEffect(() => {
    setSearchText(search)
  }, [search])

  const sortLabels: Record<(typeof SORT_FIELDS)[number], string> = {
    created: t`Created`,
    name: t`Name`,
  }

  const { permissions, isLoading: permissionsLoading } = useKeyManagerPermissions(projectId, [
    "key-manager:secrets:list",
    "key-manager:secrets:create",
    "key-manager:secrets:delete",
  ])

  const [sortField, sortDir] = (sort || "created:desc").split(":") as [string, "asc" | "desc"]

  const utils = trpcReact.useUtils()
  const canList = permissions["key-manager:secrets:list"]
  const isSearching = Boolean(search)

  const { data, isLoading, isError, error, dataUpdatedAt } = trpcReact.keyManager.listSecrets.useQuery(
    {
      project_id: projectId,
      offset: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      name: search || undefined,
      sort: sort || undefined,
    },
    { enabled: canList }
  )

  const secrets = data?.secrets ?? []

  // After deleting the last item on a page, step back so the user never lands on an empty page.
  useEffect(() => {
    if (!isLoading && !isError && page > 1 && secrets.length === 0) {
      onPageChange(page - 1)
    }
  }, [isLoading, isError, page, secrets.length, onPageChange])

  if (permissionsLoading) return null
  if (!canList) {
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You do not have the necessary permissions to view Secrets.`}
      />
    )
  }

  const totalPages = data?.total ? Math.ceil(data.total / PAGE_SIZE) : 1

  const totalSecrets = data?.total ?? 0
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null

  return (
    <>
      <Stack direction="vertical" className="juno-pattern-datagrid-outer">
        <Stack direction="vertical" className="juno-pattern-datagrid-header">
          <Stack distribution="end" alignment="center" gap="2" className="jn:pb-2">
            <Stack gap="0.5">
              <Select
                label={t`Sort by`}
                value={sortField}
                onChange={(v) => onSortChange(`${typeof v === "string" ? v : "created"}:${sortDir}`)}
                className="jn:min-w-40"
              >
                {SORT_FIELDS.map((f) => (
                  <SelectOption key={f} value={f} label={sortLabels[f]} />
                ))}
              </Select>
              <SortButton order={sortDir} onChange={(dir) => onSortChange(`${sortField}:${dir}`)} />
            </Stack>
            {permissions["key-manager:secrets:create"] && (
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                {t`Create Secret`}
              </Button>
            )}
          </Stack>

          <DataGridToolbar>
            <Stack distribution="between" alignment="center" className="jn:text-sm">
              <span className="jn:theme-color-text-light">
                {t`Showing ${totalSecrets} secrets`}
                {lastUpdated && <> · {t`Last updated: ${lastUpdated}`}</>}
              </span>
              <SearchInput
                placeholder={t`Search by name`}
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

        <SecretListContainer
          secrets={secrets}
          isLoading={isLoading}
          isError={isError}
          error={error}
          canDeleteSecret={permissions["key-manager:secrets:delete"]}
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
