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
import { useKeyManagerPermissions } from "../../-components/useKeyManagerPermissions"
import { useAllKeyManagerPages } from "../../-components/useAllKeyManagerPages"
import { uuidFromRef } from "../../-components/utils"
import { SecretListContainer } from "./SecretListContainer"
import { CreateSecretModal, DeleteSecretModal } from "./SecretModals"
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
    created: t`Created At`,
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

  // Normal browsing: cheap server-side pagination.
  const pageQuery = trpcReact.keyManager.listSecrets.useQuery(
    { project_id: projectId, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, sort: sort || undefined },
    { enabled: canList && !isSearching }
  )

  // Searching: Barbican's secret filter matches name only, so fetch all and match name or id here.
  const allQuery = useAllKeyManagerPages<Secret>(
    ["km-all-secrets", projectId, sort],
    async (offset, limit) => {
      const res = await utils.keyManager.listSecrets.fetch({
        project_id: projectId,
        offset,
        limit,
        sort: sort || undefined,
      })
      return { total: res.total, items: res.secrets }
    },
    canList && isSearching
  )

  const term = search.trim().toLowerCase()
  const filtered = (allQuery.data ?? []).filter((s) => {
    const id = uuidFromRef(s.secret_ref)
    return (s.name ?? "").toLowerCase().includes(term) || id.toLowerCase().includes(term)
  })

  const isLoading = isSearching ? allQuery.isLoading : pageQuery.isLoading
  const isError = isSearching ? allQuery.isError : pageQuery.isError
  const error = isSearching ? allQuery.error : pageQuery.error
  const totalCount = isSearching ? filtered.length : (pageQuery.data?.total ?? 0)
  const secrets = isSearching
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : (pageQuery.data?.secrets ?? [])

  // After deleting the last item on a page, step back so the user never lands on an empty page.
  useEffect(() => {
    if (!isLoading && !isError && page > 1 && secrets.length === 0) {
      onPageChange(page - 1)
    }
  }, [isLoading, isError, page, secrets.length, onPageChange])

  if (permissionsLoading) return null
  if (!canList) {
    return <Status status="error" title={t`You do not have permission to view secrets.`} />
  }

  const totalPages = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 1

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
