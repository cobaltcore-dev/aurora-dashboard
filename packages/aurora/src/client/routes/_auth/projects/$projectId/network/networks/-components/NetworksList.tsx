import { use, Suspense, useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { Trans, useLingui } from "@lingui/react/macro"
import { TRPCClientError } from "@trpc/client"
import { TrpcClient } from "@/client/trpcClient"
import { Button, Stack, DataGridToolbar, SearchInput, Status } from "@cloudoperators/juno-ui-components"
import type { NetworkListItem, NetworkQueryParameters } from "@/server/Network/types/network"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { Filter, SelectedFilter, SortSettings } from "@/client/components/ListToolbar/types"
import type { NetworksSearchParams } from "@/client/routes/_auth/projects/$projectId/network/networks/index"
import {
  NETWORK_SHARED_FILTER_VALUES,
  NETWORK_STATUS_FILTER_VALUES,
  type NetworkSharedFilter,
  type NetworkStatusFilter,
} from "./networkListFilters"
import { NetworkListContainer } from "./NetworkListContainer"

const PAGE_SIZE = 50

type NetworkSortKey = "name" | "status" | "mtu"

interface NetworksProps {
  client: TrpcClient
  project: string
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: NetworkSortKey
  sortDirection: "asc" | "desc"
}

interface NetworkFilters {
  status?: NetworkStatusFilter
  shared?: NetworkSharedFilter
}

type NetworksResult = { networks: NetworkListItem[]; listError?: string }

const createNetworksPromise = (
  client: TrpcClient,
  project: string,
  sortBy: NetworkSortKey,
  sortDirection: "asc" | "desc",
  searchTerm: string,
  { status, shared }: NetworkFilters
): Promise<NetworksResult> => {
  const query: NetworkQueryParameters = {
    project_id: project,
    sort_key: sortBy,
    sort_dir: sortDirection,
    searchTerm: searchTerm || undefined,
    status,
    shared: shared === undefined ? undefined : shared === "true",
  }

  return client.network.networks.list
    .query(query)
    .then((networks) => ({ networks, listError: undefined }))
    .catch((err: unknown) => {
      if (err instanceof TRPCClientError && err.data?.code === "FORBIDDEN") {
        return { networks: [], listError: err.message }
      }
      throw err
    })
}

const isStatusFilter = (value: string): value is NetworkStatusFilter =>
  (NETWORK_STATUS_FILTER_VALUES as readonly string[]).includes(value)

const isSharedFilter = (value: string): value is NetworkSharedFilter =>
  (NETWORK_SHARED_FILTER_VALUES as readonly string[]).includes(value)

function NetworksContent({
  networksPromise,
  searchTerm,
  setSearchTerm,
  sortSettings,
  handleSortChange,
  filterDefinitions,
  selectedFilters,
  onFilterSelect,
  onFilterRemove,
  onFiltersClear,
  currentPage,
  onPageChange,
  isStale,
}: {
  networksPromise: Promise<NetworksResult>
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: RequiredSortSettings
  handleSortChange: (settings: SortSettings) => void
  filterDefinitions: Filter[]
  selectedFilters: SelectedFilter[]
  onFilterSelect: (filter: SelectedFilter) => void
  onFilterRemove: (filter: SelectedFilter) => void
  onFiltersClear: () => void
  currentPage: number
  onPageChange: (page: number) => void
  /** True while the shown networks are from the previous query and the next one is still loading */
  isStale: boolean
}) {
  const { t } = useLingui()
  const { networks, listError } = use(networksPromise)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)
  // Last term this input sent to the URL, so only external URL changes (back/forward, links) overwrite the input
  const submittedSearchTerm = useRef(searchTerm)

  const submitSearchTerm = (term: string) => {
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = term
    setSearchTerm(term)
  }

  const totalPages = Math.max(1, Math.ceil(networks.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedNetworks = networks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  useEffect(() => {
    if (searchTerm === submittedSearchTerm.current) return
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = searchTerm
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  // Validate the page only against the current query's result: while the previous result is still shown,
  // its page count says nothing about the URL's page (e.g. back/forward from a filtered to an unfiltered list).
  useEffect(() => {
    if (!isStale && currentPage > totalPages) onPageChange(1)
  }, [isStale, totalPages, currentPage, onPageChange])

  if (listError) {
    return <Status status="error" title={t`Failed to Load Networks`} body={listError} />
  }

  return (
    <>
      {/* Zone 1 — sort, no background */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <SortInput
          options={sortSettings.options}
          sortBy={sortSettings.sortBy}
          sortDirection={sortSettings.sortDirection}
          selectClassName="min-w-45"
          selectWidth="auto"
          onSortByChange={(v) => handleSortChange({ ...sortSettings, sortBy: v })}
          onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
        />
      </Stack>

      {/* Zone 2 — filters, search bar and active filter pills */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="between" alignment="center">
            <FiltersInput
              filters={filterDefinitions}
              selectClassName="sm:min-w-40"
              comboboxClassName="sm:min-w-40"
              onChange={onFilterSelect}
            />
            <SearchInput
              placeholder={t`Search networks...`}
              data-testid="searchbar"
              value={localSearchTerm}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setLocalSearchTerm(v)
                clearTimeout(debounceTimer.current)
                debounceTimer.current = window.setTimeout(() => submitSearchTerm(v), 500)
              }}
              onSearch={(v) => submitSearchTerm(typeof v === "string" ? v : "")}
              onClear={() => {
                setLocalSearchTerm("")
                submitSearchTerm("")
              }}
            />
          </Stack>
          {selectedFilters.length > 0 && (
            <SelectedFilters
              selectedFilters={selectedFilters}
              filters={filterDefinitions}
              onDelete={onFilterRemove}
              onClear={onFiltersClear}
            />
          )}
        </Stack>
      </DataGridToolbar>

      <NetworkListContainer
        networks={paginatedNetworks}
        isFiltered={Boolean(searchTerm.trim()) || selectedFilters.length > 0}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}

export const Networks = ({ client, project }: NetworksProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as NetworksSearchParams

  // The URL is the single source of truth for search, filters, sort and page, so back/forward navigation
  // and links with different search params update the controls and the query.
  const searchTerm = searchParams.search ?? ""
  const sortBy: NetworkSortKey = searchParams.sortBy || "name"
  const sortDirection = searchParams.sortDirection || "asc"
  const currentPage = searchParams.page ?? 1
  const statusFilter = searchParams.status
  const sharedFilter = searchParams.shared

  const sortSettings: RequiredSortSettings = {
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Status`, value: "status" },
      { label: t`MTU`, value: "mtu" },
    ],
    sortBy,
    sortDirection,
  }

  const filterDefinitions: Filter[] = [
    {
      displayName: t`Status`,
      filterName: "status",
      values: [...NETWORK_STATUS_FILTER_VALUES],
    },
    {
      displayName: t`Shared`,
      filterName: "shared",
      values: [...NETWORK_SHARED_FILTER_VALUES],
      valueLabels: { true: t`Yes`, false: t`No` },
    },
  ]

  const selectedFilters: SelectedFilter[] = [
    ...(statusFilter ? [{ name: "status", value: statusFilter }] : []),
    ...(sharedFilter ? [{ name: "shared", value: sharedFilter }] : []),
  ]

  // Bumped by "Try Again" to create a fresh query with the same parameters
  const [retryCount, setRetryCount] = useState(0)

  const networksPromise = useMemo(
    () =>
      createNetworksPromise(client, project, sortBy, sortDirection, searchTerm, {
        status: statusFilter,
        shared: sharedFilter,
      }),
    // retryCount is not used in the factory, it only forces a new promise on "Try Again"
    [client, project, sortBy, sortDirection, searchTerm, statusFilter, sharedFilter, retryCount]
  )
  // Keeps the current list (and the search input) on screen while the next query loads,
  // instead of falling back to the Suspense loading state on every search, filter or sort change
  const deferredNetworksPromise = useDeferredValue(networksPromise)
  const isStale = deferredNetworksPromise !== networksPromise

  const updateSearch = (update: Partial<NetworksSearchParams>) => {
    navigate({
      search: ((prev: NetworksSearchParams) => ({ ...prev, ...update, page: undefined })) as unknown as true,
      replace: true,
    })
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    updateSearch({
      sortBy: (newSortSettings.sortBy?.toString() || "name") as NetworkSortKey,
      sortDirection: newSortSettings.sortDirection || "asc",
    })
  }

  const handleSearchChange = (term: string) => {
    updateSearch({ search: term || undefined })
  }

  const handleFilterSelect = ({ name, value }: SelectedFilter) => {
    if (name === "status" && isStatusFilter(value)) updateSearch({ status: value })
    if (name === "shared" && isSharedFilter(value)) updateSearch({ shared: value })
  }

  const handleFilterRemove = ({ name }: SelectedFilter) => {
    if (name === "status" || name === "shared") updateSearch({ [name]: undefined })
  }

  const handleFiltersClear = () => {
    updateSearch({ status: undefined, shared: undefined })
  }

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        search: ((prev: NetworksSearchParams) => ({
          ...prev,
          page: page === 1 ? undefined : page,
        })) as unknown as true,
      })
    },
    [navigate]
  )

  return (
    <div className="relative">
      <ErrorBoundary
        // Resets the boundary whenever the query changes: on "Try Again" and when the URL
        // (project, search, filters, sort) changes. Keyed on the deferred promise, so the reset happens
        // together with the render that uses the new query instead of re-throwing the failed one.
        resetKeys={[deferredNetworksPromise]}
        fallbackRender={({ error }) => (
          <Status
            status="error"
            title={t`Failed to Load Networks`}
            body={error instanceof Error ? error.message : t`An unexpected error occurred.`}
            action={
              <Button onClick={() => setRetryCount((count) => count + 1)}>
                <Trans>Try Again</Trans>
              </Button>
            }
          />
        )}
      >
        <Suspense fallback={<Status status="progress" title={t`Loading Networks...`} />}>
          <NetworksContent
            networksPromise={deferredNetworksPromise}
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            sortSettings={sortSettings}
            handleSortChange={handleSortChange}
            filterDefinitions={filterDefinitions}
            selectedFilters={selectedFilters}
            onFilterSelect={handleFilterSelect}
            onFilterRemove={handleFilterRemove}
            onFiltersClear={handleFiltersClear}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            isStale={isStale}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
