import { useMemo, useState, useRef, useEffect } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import { Message, Stack, DataGridToolbar, SearchInput } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { formatRelativeTime } from "@/client/utils/formatRelativeTime"
import type { ShareNetworksSearchParams } from "@/client/routes/_auth/projects/$projectId/shared-file-system/share-networks/index"
import {
  SHARE_NETWORK_SORT_KEYS,
  filterShareNetworks,
  sortShareNetworks,
  type ShareNetworkSortKey,
} from "./shareNetworkListUtils"
import { ShareNetworkListContainer } from "./ShareNetworkListContainer"

interface ShareNetworksListProps {
  projectId: string
}

export const ShareNetworksList = ({ projectId }: ShareNetworksListProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as ShareNetworksSearchParams

  const { data, isLoading, error, dataUpdatedAt, refetch } = trpcReact.sharedFileSystem.listShareNetworks.useQuery(
    { project_id: projectId },
    { enabled: Boolean(projectId), retry: false }
  )

  const shareNetworks = data ?? []

  // URL-derived state
  const searchTerm = searchParams.search ?? ""
  const sortBy: ShareNetworkSortKey = searchParams.sortBy ?? "name"
  const sortDirection = searchParams.sortDirection ?? "asc"

  const updateSearch = (update: Partial<ShareNetworksSearchParams>) => {
    navigate({
      search: ((prev: ShareNetworksSearchParams) => ({ ...prev, ...update })) as unknown as true,
      replace: true,
    })
  }

  // Sort options
  const sortOptions = [
    { label: t`Name`, value: "name" },
    { label: t`Subnet Count`, value: "subnet_count" },
    { label: t`Created`, value: "created_at" },
  ]

  // Search input with local mirror and debounce
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)
  const submittedSearchTerm = useRef(searchTerm)

  const handleSearchChange = (term: string) => {
    updateSearch({ search: term || undefined })
  }

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  useEffect(() => {
    if (searchTerm === submittedSearchTerm.current) return
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = searchTerm
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  // Visible rows
  const visibleShareNetworks = useMemo(
    () => sortShareNetworks(filterShareNetworks(shareNetworks, searchTerm), sortBy, sortDirection),
    [shareNetworks, searchTerm, sortBy, sortDirection]
  )

  const isFiltered = Boolean(searchTerm.trim())

  // 403: show info message instead of the toolbar and grid
  if (error?.data?.code === "FORBIDDEN") {
    return (
      <Message variant="info" title={t`Insufficient Permissions`}>
        <Trans>You do not have the required permissions to view share networks in this project.</Trans>
      </Message>
    )
  }

  const matchingCount = visibleShareNetworks.length
  const totalCount = shareNetworks.length
  const lastUpdatedText = dataUpdatedAt ? formatRelativeTime(dataUpdatedAt, i18n.locale) : null

  return (
    <Stack direction="vertical" className="juno-pattern-datagrid-outer">
      <Stack direction="vertical" className="juno-pattern-datagrid-header">
        {/* Zone 1 */}
        <Stack distribution="end" alignment="center" gap="2" className="pb-2">
          <SortInput
            options={sortOptions}
            sortBy={sortBy}
            sortDirection={sortDirection}
            selectClassName="min-w-45"
            selectWidth="auto"
            onSortByChange={(v) => {
              const validated = SHARE_NETWORK_SORT_KEYS.includes(v as ShareNetworkSortKey)
                ? (v as ShareNetworkSortKey)
                : "name"
              updateSearch({ sortBy: validated })
            }}
            onSortDirectionChange={(dir) => updateSearch({ sortDirection: dir })}
          />
        </Stack>

        {/* Zone 2 */}
        <DataGridToolbar>
          <Stack distribution="end">
            <SearchInput
              placeholder={t`Search by name or ID...`}
              data-testid="searchbar"
              value={localSearchTerm}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setLocalSearchTerm(v)
                clearTimeout(debounceTimer.current)
                debounceTimer.current = window.setTimeout(() => {
                  submittedSearchTerm.current = v
                  handleSearchChange(v)
                }, 500)
              }}
              onSearch={(v) => {
                const term = typeof v === "string" ? v : ""
                submittedSearchTerm.current = term
                handleSearchChange(term)
              }}
              onClear={() => {
                setLocalSearchTerm("")
                submittedSearchTerm.current = ""
                handleSearchChange("")
              }}
            />
          </Stack>
        </DataGridToolbar>

        {/* Zone 3 - only once data has loaded (not loading, no error) */}
        {!isLoading && !error && (
          <DataGridToolbar>
            <Stack distribution="between" alignment="center" className="text-theme-light text-sm">
              <span>
                {isFiltered ? (
                  <Trans>
                    {matchingCount} of {totalCount} share networks
                  </Trans>
                ) : (
                  <Trans>{totalCount} share networks</Trans>
                )}
              </span>
              {lastUpdatedText && (
                <span>
                  <Trans>Last updated: {lastUpdatedText}</Trans>
                </span>
              )}
            </Stack>
          </DataGridToolbar>
        )}
      </Stack>

      <ShareNetworkListContainer
        shareNetworks={visibleShareNetworks}
        isLoading={isLoading}
        error={error ? { code: error.data?.code } : null}
        isFiltered={isFiltered}
        onRetry={() => void refetch()}
      />
    </Stack>
  )
}
