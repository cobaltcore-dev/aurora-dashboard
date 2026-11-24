import { useMemo, useState, useRef, useEffect } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { Trans, useLingui } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import { Message, Stack, DataGridToolbar, SearchInput } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import type { Filter, SelectedFilter } from "@/client/components/ListToolbar/types"
import { formatRelativeTime } from "@/client/utils/formatRelativeTime"
import type { SecurityServicesSearchParams } from "@/client/routes/_auth/projects/$projectId/shared-file-system/security-services/index"
import {
  SECURITY_SERVICE_SORT_KEYS,
  SECURITY_SERVICE_TYPE_LABELS,
  SECURITY_SERVICE_TYPE_FILTER_VALUES,
  filterSecurityServices,
  sortSecurityServices,
  type SecurityServiceSortKey,
  type SecurityServiceTypeFilter,
} from "../../-components/securityServiceUtils"
import { SecurityServiceListContainer } from "./SecurityServiceListContainer"

interface SecurityServicesListProps {
  projectId: string
}

const isTypeFilter = (value: string): value is SecurityServiceTypeFilter =>
  (SECURITY_SERVICE_TYPE_FILTER_VALUES as readonly string[]).includes(value)

export const SecurityServicesList = ({ projectId }: SecurityServicesListProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as SecurityServicesSearchParams

  const { data, isLoading, error, dataUpdatedAt, refetch } = trpcReact.sharedFileSystem.listSecurityServices.useQuery(
    { project_id: projectId },
    { enabled: Boolean(projectId), retry: false }
  )

  const securityServices = data ?? []

  // URL-derived state
  const searchTerm = searchParams.search ?? ""
  const sortBy: SecurityServiceSortKey = searchParams.sortBy ?? "name"
  const sortDirection = searchParams.sortDirection ?? "asc"
  const filters = { type: searchParams.type }

  const updateSearch = (update: Partial<SecurityServicesSearchParams>) => {
    navigate({
      search: ((prev: SecurityServicesSearchParams) => ({ ...prev, ...update })) as unknown as true,
      replace: true,
    })
  }

  // Sort options
  const sortOptions = [
    { label: t`Name`, value: "name" },
    { label: t`Type`, value: "type" },
    { label: t`Created`, value: "created_at" },
  ]

  // Filter definitions
  const filterDefinitions = useMemo((): Filter[] => {
    return [
      {
        displayName: t`Type`,
        filterName: "type",
        values: [...SECURITY_SERVICE_TYPE_FILTER_VALUES] as string[],
        valueLabels: { ...SECURITY_SERVICE_TYPE_LABELS, other: t`Other` },
      },
    ]
  }, [t])

  // Selected filters
  const selectedFilters: SelectedFilter[] = [...(filters.type ? [{ name: "type", value: filters.type }] : [])]

  const handleFilterSelect = ({ name, value }: SelectedFilter) => {
    if (name === "type" && isTypeFilter(value)) {
      updateSearch({ type: value })
    }
  }

  const handleFilterRemove = ({ name }: SelectedFilter) => {
    updateSearch({ [name]: undefined })
  }

  const handleFiltersClear = () => {
    // Clear all filters. With one filter, this is never actually called in the UI
    // (SelectedFilters only shows "Clear all" when more than one filter is selected),
    // but it is a required prop and matches the SharesList pattern.
    updateSearch({ type: undefined })
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
  const visibleSecurityServices = useMemo(
    () => sortSecurityServices(filterSecurityServices(securityServices, searchTerm, filters), sortBy, sortDirection),
    [securityServices, searchTerm, filters.type, sortBy, sortDirection]
  )

  const isFiltered = Boolean(searchTerm.trim()) || Boolean(filters.type)

  // 403: show info message instead of the toolbar and grid
  if (error?.data?.code === "FORBIDDEN") {
    return (
      <Message variant="info" title={t`Insufficient Permissions`}>
        <Trans>You do not have the required permissions to view security services in this project.</Trans>
      </Message>
    )
  }

  const matchingCount = visibleSecurityServices.length
  const totalCount = securityServices.length
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
              const validated = SECURITY_SERVICE_SORT_KEYS.includes(v as SecurityServiceSortKey)
                ? (v as SecurityServiceSortKey)
                : "name"
              updateSearch({ sortBy: validated })
            }}
            onSortDirectionChange={(dir) => updateSearch({ sortDirection: dir })}
          />
        </Stack>

        {/* Zone 2 */}
        <DataGridToolbar>
          <Stack distribution="between">
            <FiltersInput filters={filterDefinitions} onChange={handleFilterSelect} />
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
        </DataGridToolbar>

        {/* Zone 3 - only once data has loaded (not loading, no error) */}
        {!isLoading && !error && (
          <DataGridToolbar>
            <Stack distribution="between" alignment="center" className="text-theme-light text-sm">
              <span>
                {isFiltered ? (
                  <Trans>
                    {matchingCount} of {totalCount} security services
                  </Trans>
                ) : (
                  <Trans>{totalCount} security services</Trans>
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

      <SecurityServiceListContainer
        securityServices={visibleSecurityServices}
        isLoading={isLoading}
        error={error ? { code: error.data?.code } : null}
        isFiltered={isFiltered}
        onRetry={() => void refetch()}
      />
    </Stack>
  )
}
