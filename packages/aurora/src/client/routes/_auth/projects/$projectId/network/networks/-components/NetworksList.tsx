import { use, Suspense, useState, useRef, useEffect, useMemo, useDeferredValue } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { Trans, useLingui } from "@lingui/react/macro"
import { i18n } from "@lingui/core"
import { TRPCClientError } from "@trpc/client"
import { trpcClient, TrpcClient } from "@/client/trpcClient"
import { Button, Message, Stack, DataGridToolbar, SearchInput, Status } from "@cloudoperators/juno-ui-components"
import type { NetworkListItem } from "@/server/Network/types/network"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { Filter, SelectedFilter, SortSettings } from "@/client/components/ListToolbar/types"
import type { NetworksSearchParams } from "@/client/routes/_auth/projects/$projectId/network/networks/index"
import {
  NETWORK_EXTERNAL_FILTER_VALUES,
  NETWORK_SHARED_FILTER_VALUES,
  NETWORK_STATUS_FILTER_VALUES,
  type NetworkExternalFilter,
  type NetworkSharedFilter,
  type NetworkStatusFilter,
} from "./networkListFilters"
import { NetworkListContainer } from "./NetworkListContainer"

type NetworkSortKey = "name" | "status" | "subnet_count"

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
  external?: NetworkExternalFilter
}

type NetworksResult = { networks: NetworkListItem[]; forbidden?: boolean; unauthorized?: boolean; resolvedAt?: number }

/** Attention-first status order (E3): ERROR → BUILD → DOWN → ACTIVE. Unknown statuses sort last. */
const STATUS_ORDER: Record<string, number> = { ERROR: 0, BUILD: 1, DOWN: 2, ACTIVE: 3 }

/** Client-side sort over the single list response (E5): name, status (E3) and subnet count. */
function applyClientSort(
  networks: NetworkListItem[],
  sortBy: NetworkSortKey,
  sortDirection: "asc" | "desc"
): NetworkListItem[] {
  const direction = sortDirection === "desc" ? -1 : 1

  if (sortBy === "status") {
    return [...networks].sort((a, b) => {
      const ao = STATUS_ORDER[a.status] ?? 4
      const bo = STATUS_ORDER[b.status] ?? 4
      return direction * (ao - bo)
    })
  }

  if (sortBy === "subnet_count") {
    return [...networks].sort((a, b) => direction * (a.subnets.length - b.subnets.length))
  }

  // name
  return [...networks].sort((a, b) => direction * a.name.localeCompare(b.name))
}

/** Client-side search (E5): matches id and name, case-insensitive. */
function matchesSearch(network: NetworkListItem, searchTerm: string): boolean {
  const term = searchTerm.trim().toLowerCase()
  if (!term) return true
  return [network.id, network.name].some((field) => (field ?? "").toLowerCase().includes(term))
}

/** Client-side search + filters over the single list response (E5), before sorting. */
function filterNetworks(
  networks: NetworkListItem[],
  searchTerm: string,
  { status, shared, external }: NetworkFilters
): NetworkListItem[] {
  return networks.filter((network) => {
    if (!matchesSearch(network, searchTerm)) return false
    if (status && network.status !== status) return false
    if (shared !== undefined && network.shared !== (shared === "true")) return false
    if (external !== undefined && network["router:external"] !== (external === "true")) return false
    return true
  })
}

/** Locale-aware relative "last updated" label via Intl.RelativeTimeFormat (I16). */
function formatRelativeTime(timestamp: number, locale: string): string {
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (diffSeconds < 60) return rtf.format(-diffSeconds, "second")
  if (diffSeconds < 3600) return rtf.format(-Math.floor(diffSeconds / 60), "minute")
  return rtf.format(-Math.floor(diffSeconds / 3600), "hour")
}

/** Fetches every network visible to the project once (own + shared). Search/filter/sort are applied client-side. */
const createNetworksPromise = (client: TrpcClient, project: string): Promise<NetworksResult> => {
  return client.network.networks.list
    .query({ project_id: project })
    .then((networks) => ({ networks, resolvedAt: Date.now() }))
    .catch((err: unknown) => {
      // 403: no access — render as an info message, not an error boundary (B.6)
      if (err instanceof TRPCClientError && err.data?.code === "FORBIDDEN") {
        return { networks: [], forbidden: true }
      }
      // 401: session expired — redirect to sign-in (B.6)
      if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
        return { networks: [], unauthorized: true }
      }
      throw err
    })
}

const isStatusFilter = (value: string): value is NetworkStatusFilter =>
  (NETWORK_STATUS_FILTER_VALUES as readonly string[]).includes(value)

const isSharedFilter = (value: string): value is NetworkSharedFilter =>
  (NETWORK_SHARED_FILTER_VALUES as readonly string[]).includes(value)

const isExternalFilter = (value: string): value is NetworkExternalFilter =>
  (NETWORK_EXTERNAL_FILTER_VALUES as readonly string[]).includes(value)

/** Full-document redirect to sign-in (not a client navigate) so AuthProvider re-checks the session on
 *  reload; a client navigate keeps its stale cached user and bounces straight back to this list (B.6).
 *  Terminates the server session first so the landing route does not immediately send the user back. */
function UnauthorizedRedirect() {
  useEffect(() => {
    const { pathname, search, hash } = window.location
    const redirect = encodeURIComponent(pathname + search + hash)
    trpcClient.auth.terminateUserSession
      .mutate()
      .catch(() => {})
      .finally(() => {
        window.location.replace(`/?redirect=${redirect}`)
      })
  }, [])
  return null
}

function NetworksContent({
  networksPromise,
  searchTerm,
  setSearchTerm,
  sortSettings,
  handleSortChange,
  filterDefinitions,
  filters,
  selectedFilters,
  onFilterSelect,
  onFilterRemove,
  onFiltersClear,
  isStale,
}: {
  networksPromise: Promise<NetworksResult>
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: RequiredSortSettings
  handleSortChange: (settings: SortSettings) => void
  filterDefinitions: Filter[]
  filters: NetworkFilters
  selectedFilters: SelectedFilter[]
  onFilterSelect: (filter: SelectedFilter) => void
  onFilterRemove: (filter: SelectedFilter) => void
  onFiltersClear: () => void
  /** True while the shown networks are from the previous query and the next one is still loading */
  isStale: boolean
}) {
  const { t } = useLingui()
  const { networks, forbidden, unauthorized, resolvedAt } = use(networksPromise)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)
  // Last term this input sent to the URL, so only external URL changes (back/forward, links) overwrite the input
  const submittedSearchTerm = useRef(searchTerm)

  const submitSearchTerm = (term: string) => {
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = term
    setSearchTerm(term)
  }

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  useEffect(() => {
    if (searchTerm === submittedSearchTerm.current) return
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = searchTerm
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  // Search, filters and sort all run client-side over the single list response (E5), with no refetch.
  const visibleNetworks = useMemo(
    () =>
      applyClientSort(filterNetworks(networks, searchTerm, filters), sortSettings.sortBy, sortSettings.sortDirection),
    [networks, searchTerm, filters, sortSettings.sortBy, sortSettings.sortDirection]
  )

  if (unauthorized) return <UnauthorizedRedirect />

  if (forbidden) {
    return (
      <Message variant="info" title={t`Insufficient Permissions`}>
        <Trans>You do not have the required permissions to view networks in this project.</Trans>
      </Message>
    )
  }

  const isFiltered = Boolean(searchTerm.trim()) || selectedFilters.length > 0
  const matchingCount = visibleNetworks.length
  const totalCount = networks.length
  const lastUpdatedText = resolvedAt && !isStale ? formatRelativeTime(resolvedAt, i18n.locale) : null

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
              placeholder={t`Search by name or ID...`}
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

      {/* Zone 3 — item count + last-updated; no refresh button (E1) */}
      <Stack distribution="between" alignment="center" className="text-theme-light text-sm">
        <span>
          {isFiltered ? (
            <Trans>
              {matchingCount} of {totalCount} networks
            </Trans>
          ) : (
            <Trans>{matchingCount} networks</Trans>
          )}
        </span>
        {lastUpdatedText && (
          <span>
            <Trans>Last updated: {lastUpdatedText}</Trans>
          </span>
        )}
      </Stack>

      <NetworkListContainer networks={visibleNetworks} isFiltered={isFiltered} />
    </>
  )
}

export const Networks = ({ client, project }: NetworksProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as NetworksSearchParams

  // The URL is the single source of truth for search, filters and sort, so back/forward navigation
  // and links with different search params update the controls and the client-side view.
  const searchTerm = searchParams.search ?? ""
  const sortBy: NetworkSortKey = searchParams.sortBy || "name"
  const sortDirection = searchParams.sortDirection || "asc"
  const statusFilter = searchParams.status
  const sharedFilter = searchParams.shared
  const externalFilter = searchParams.external

  const sortSettings: RequiredSortSettings = {
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Status`, value: "status" },
      { label: t`Subnet Count`, value: "subnet_count" },
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
    {
      displayName: t`External`,
      filterName: "external",
      values: [...NETWORK_EXTERNAL_FILTER_VALUES],
      valueLabels: { true: t`Yes`, false: t`No` },
    },
  ]

  const selectedFilters: SelectedFilter[] = [
    ...(statusFilter ? [{ name: "status", value: statusFilter }] : []),
    ...(sharedFilter ? [{ name: "shared", value: sharedFilter }] : []),
    ...(externalFilter ? [{ name: "external", value: externalFilter }] : []),
  ]

  const filters: NetworkFilters = { status: statusFilter, shared: sharedFilter, external: externalFilter }

  // Bumped by "Try Again" to create a fresh query
  const [retryCount, setRetryCount] = useState(0)

  // The list is fetched once per project; search, filter and sort changes do NOT refetch (E5).
  const networksPromise = useMemo(
    () => createNetworksPromise(client, project),
    // retryCount is not used in the factory, it only forces a new promise on "Try Again"
    [client, project, retryCount]
  )
  // Keeps the current list (and the search input) on screen while a fresh query loads (retry / project change),
  // instead of falling back to the Suspense loading state
  const deferredNetworksPromise = useDeferredValue(networksPromise)
  const isStale = deferredNetworksPromise !== networksPromise

  const updateSearch = (update: Partial<NetworksSearchParams>) => {
    navigate({
      search: ((prev: NetworksSearchParams) => ({ ...prev, ...update })) as unknown as true,
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
    if (name === "external" && isExternalFilter(value)) updateSearch({ external: value })
  }

  const handleFilterRemove = ({ name }: SelectedFilter) => {
    if (name === "status" || name === "shared" || name === "external") updateSearch({ [name]: undefined })
  }

  const handleFiltersClear = () => {
    updateSearch({ status: undefined, shared: undefined, external: undefined })
  }

  return (
    <div className="relative">
      <ErrorBoundary
        // Resets the boundary whenever the query changes: on "Try Again" and when the project changes.
        // Keyed on the deferred promise, so the reset happens together with the render that uses the new query.
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
            filters={filters}
            selectedFilters={selectedFilters}
            onFilterSelect={handleFilterSelect}
            onFilterRemove={handleFilterRemove}
            onFiltersClear={handleFiltersClear}
            isStale={isStale}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
