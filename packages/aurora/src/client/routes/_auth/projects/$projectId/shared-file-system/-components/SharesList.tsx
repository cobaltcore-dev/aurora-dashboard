import { useMemo, useState, useRef, useEffect } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import { Message, Stack, DataGridToolbar, SearchInput } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { Filter, SelectedFilter } from "@/client/components/ListToolbar/types"
import { formatRelativeTime } from "@/client/utils/formatRelativeTime"
import type { SharesSearchParams } from "@/client/routes/_auth/projects/$projectId/shared-file-system/index"
import {
  SHARE_STATUS_FILTER_VALUES,
  SHARE_PROTOCOL_FILTER_VALUES,
  SHARE_PROTOCOL_LABELS,
  SHARE_VISIBILITY_FILTER_VALUES,
  SHARE_SORT_KEYS,
  SHARE_FILTER_OTHER,
  type ShareStatusFilter,
  type ShareProtocolFilter,
  type ShareVisibilityFilter,
  type ShareSortKey,
} from "./shareListFilters"
import { filterShares, sortShares, getDistinctValues, getShareTypeLabel, type ShareListFilters } from "./shareListUtils"
import { ShareListContainer } from "./ShareListContainer"

interface SharesListProps {
  projectId: string
}

const isStatusFilter = (value: string): value is ShareStatusFilter =>
  (SHARE_STATUS_FILTER_VALUES as readonly string[]).includes(value)

const isProtocolFilter = (value: string): value is ShareProtocolFilter =>
  (SHARE_PROTOCOL_FILTER_VALUES as readonly string[]).includes(value)

const isVisibilityFilter = (value: string): value is ShareVisibilityFilter =>
  (SHARE_VISIBILITY_FILTER_VALUES as readonly string[]).includes(value)

export const SharesList = ({ projectId }: SharesListProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as SharesSearchParams

  const { data, isLoading, error, dataUpdatedAt, refetch } = trpcReact.sharedFileSystem.listShares.useQuery(
    { project_id: projectId },
    { enabled: Boolean(projectId), retry: false }
  )

  const shares = data ?? []

  // URL-derived state
  const searchTerm = searchParams.search ?? ""
  const sortBy: ShareSortKey = searchParams.sortBy ?? "name"
  const sortDirection = searchParams.sortDirection ?? "asc"
  const filters: ShareListFilters = {
    status: searchParams.status,
    protocol: searchParams.protocol,
    shareType: searchParams.shareType,
    availabilityZone: searchParams.availabilityZone,
    visibility: searchParams.visibility,
  }

  const updateSearch = (update: Partial<SharesSearchParams>) => {
    navigate({
      search: ((prev: SharesSearchParams) => ({ ...prev, ...update })) as unknown as true,
      replace: true,
    })
  }

  // Sort options
  const sortOptions = [
    { label: t`Name`, value: "name" },
    { label: t`Status`, value: "status" },
    { label: t`Size`, value: "size" },
    { label: t`Created`, value: "created_at" },
  ]

  // Filter definitions
  const filterDefinitions = useMemo((): Filter[] => {
    const protocolLabels: Record<string, string> = { ...SHARE_PROTOCOL_LABELS, [SHARE_FILTER_OTHER]: t`Other` }

    return [
      {
        displayName: t`Status`,
        filterName: "status",
        values: [...SHARE_STATUS_FILTER_VALUES] as string[],
        valueLabels: { [SHARE_FILTER_OTHER]: t`Other` },
      },
      {
        displayName: t`Protocol`,
        filterName: "protocol",
        values: [...SHARE_PROTOCOL_FILTER_VALUES] as string[],
        valueLabels: protocolLabels,
      },
      {
        displayName: t`Share Type`,
        filterName: "shareType",
        values: getDistinctValues(shares.map(getShareTypeLabel)),
      },
      {
        displayName: t`Availability Zone`,
        filterName: "availabilityZone",
        values: getDistinctValues(shares.map((s) => s.availability_zone)),
      },
      {
        displayName: t`Visibility`,
        filterName: "visibility",
        values: [...SHARE_VISIBILITY_FILTER_VALUES] as string[],
        valueLabels: { public: t`Public`, private: t`Private` },
      },
    ]
  }, [shares, t])

  // Selected filters
  const selectedFilters: SelectedFilter[] = [
    ...(filters.status ? [{ name: "status", value: filters.status }] : []),
    ...(filters.protocol ? [{ name: "protocol", value: filters.protocol }] : []),
    ...(filters.shareType ? [{ name: "shareType", value: filters.shareType }] : []),
    ...(filters.availabilityZone ? [{ name: "availabilityZone", value: filters.availabilityZone }] : []),
    ...(filters.visibility ? [{ name: "visibility", value: filters.visibility }] : []),
  ]

  const handleFilterSelect = ({ name, value }: SelectedFilter) => {
    if (name === "status" && isStatusFilter(value)) {
      updateSearch({ status: value })
    } else if (name === "protocol" && isProtocolFilter(value)) {
      updateSearch({ protocol: value })
    } else if (name === "shareType" && value) {
      updateSearch({ shareType: value })
    } else if (name === "availabilityZone" && value) {
      updateSearch({ availabilityZone: value })
    } else if (name === "visibility" && isVisibilityFilter(value)) {
      updateSearch({ visibility: value })
    }
  }

  const handleFilterRemove = ({ name }: SelectedFilter) => {
    updateSearch({ [name]: undefined })
  }

  const handleFiltersClear = () => {
    updateSearch({
      status: undefined,
      protocol: undefined,
      shareType: undefined,
      availabilityZone: undefined,
      visibility: undefined,
    })
  }

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
  const visibleShares = useMemo(
    () => sortShares(filterShares(shares, searchTerm, filters), sortBy, sortDirection),
    [shares, searchTerm, filters, sortBy, sortDirection]
  )

  const isFiltered = Boolean(searchTerm.trim()) || selectedFilters.length > 0

  // 403: show info message instead of the toolbar and grid
  if (error?.data?.code === "FORBIDDEN") {
    return (
      <Message variant="info" title={t`Insufficient Permissions`}>
        <Trans>You do not have the required permissions to view shares in this project.</Trans>
      </Message>
    )
  }

  const matchingCount = visibleShares.length
  const totalCount = shares.length
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
              const validated = SHARE_SORT_KEYS.includes(v as ShareSortKey) ? (v as ShareSortKey) : "name"
              updateSearch({ sortBy: validated })
            }}
            onSortDirectionChange={(dir) => updateSearch({ sortDirection: dir })}
          />
        </Stack>

        {/* Zone 2 */}
        <DataGridToolbar>
          <Stack direction="vertical" gap="2">
            <Stack distribution="between" alignment="center">
              <FiltersInput
                filters={filterDefinitions}
                selectClassName="sm:min-w-40"
                comboboxClassName="sm:min-w-40"
                onChange={handleFilterSelect}
              />
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
            {selectedFilters.length > 0 && (
              <SelectedFilters
                selectedFilters={selectedFilters}
                filters={filterDefinitions}
                onDelete={handleFilterRemove}
                onClear={handleFiltersClear}
              />
            )}
          </Stack>
        </DataGridToolbar>

        {/* Zone 3 - only once data has loaded (not loading, no error) */}
        {!isLoading && !error && (
          <DataGridToolbar>
            <Stack distribution="between" alignment="center" className="text-theme-light text-sm">
              <span>
                {isFiltered ? (
                  <Trans>
                    {matchingCount} of {totalCount} shares
                  </Trans>
                ) : (
                  <Trans>{totalCount} shares</Trans>
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

      <ShareListContainer
        shares={visibleShares}
        isLoading={isLoading}
        error={error ? { message: error.message, code: error.data?.code } : null}
        isFiltered={isFiltered}
        onRetry={() => void refetch()}
      />
    </Stack>
  )
}
