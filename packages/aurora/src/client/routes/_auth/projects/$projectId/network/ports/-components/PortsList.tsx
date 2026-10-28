import { use, Suspense, useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { Trans, useLingui } from "@lingui/react/macro"
import { TRPCClientError } from "@trpc/client"
import { trpcClient, TrpcClient } from "@/client/trpcClient"
import { Button, Stack, DataGridToolbar, SearchInput, Message, Status } from "@cloudoperators/juno-ui-components"
import type { PortListItem } from "@/server/Network/types/port"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { Filter, SortSettings } from "@/client/components/ListToolbar/types"
import type { PortsSearchParams } from "@/client/routes/_auth/projects/$projectId/network/ports/index"
import { PortListContainer } from "./PortListContainer"

const PAGE_SIZE = 50

/** Neutron port statuses offered in the status filter. */
const PORT_STATUS_VALUES = ["ACTIVE", "DOWN", "BUILD", "ERROR"]

/** The sort keys the list offers; all map to string fields on PortListItem. */
type PortSortKey = "name" | "status" | "device_owner"

interface PortsProps {
  client: TrpcClient
  project: string
  /**
   * Scopes the list to the ports of one network (e.g. a "Ports" tab in the network details view).
   * The Network column is hidden then, as it would show the same network in every row.
   */
  networkId?: string
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: PortSortKey
  sortDirection: "asc" | "desc"
}

type PortsResult = { ports: PortListItem[]; forbidden?: boolean; unauthorized?: boolean }

/**
 * Fetches the full port list once per (project, network). Sorting, search and pagination are done
 * client-side over this list, so changing any of them never triggers another request.
 */
const createPortsPromise = (
  client: TrpcClient,
  project: string,
  networkId: string | undefined
): Promise<PortsResult> => {
  return client.network.ports.list
    .query({ project_id: project, network_id: networkId })
    .then((ports) => ({ ports, forbidden: false }))
    .catch((err: unknown) => {
      // 403 is an expected "no access" state, not a failure: render it as a page-level info message
      // (B.6) rather than letting it reach the error boundary.
      if (err instanceof TRPCClientError && err.data?.code === "FORBIDDEN") {
        return { ports: [], forbidden: true }
      }
      // 401: session is gone. Signal unauthorized so the component can redirect to sign-in (B.6).
      if (err instanceof TRPCClientError && err.data?.code === "UNAUTHORIZED") {
        return { ports: [], unauthorized: true }
      }
      throw err
    })
}

/** Fields the search matches, mirroring the BFF's `filterPortsBySearchTerm`. */
const searchableValues = (port: PortListItem): Array<string | undefined> => [
  port.id,
  port.name,
  port.description,
  port.network_id,
  port.network_name,
  port.mac_address,
  port.device_id,
  port.device_owner,
  ...port.fixed_ips.flatMap((fixedIp) => [fixedIp.ip_address, fixedIp.subnet_id, fixedIp.subnet_name]),
]

/** Case-insensitive substring search across everything the list shows. */
const filterPorts = (ports: PortListItem[], searchTerm: string): PortListItem[] => {
  const term = searchTerm.trim().toLowerCase()
  if (!term) return ports
  return ports.filter((port) => searchableValues(port).some((value) => value?.toLowerCase().includes(term)))
}

/** Exact status match; no filter when status is empty. */
const filterByStatus = (ports: PortListItem[], status: string): PortListItem[] =>
  status ? ports.filter((port) => port.status === status) : ports

const sortValue = (port: PortListItem, key: PortSortKey): string => {
  switch (key) {
    case "status":
      return port.status
    case "device_owner":
      return port.device_owner
    case "name":
      return port.name
  }
}

/** Stable client-side sort on the selected key and direction (natural order for embedded numbers). */
const sortPorts = (ports: PortListItem[], sortBy: PortSortKey, sortDirection: "asc" | "desc"): PortListItem[] => {
  const factor = sortDirection === "desc" ? -1 : 1
  return [...ports].sort(
    (a, b) =>
      factor *
      sortValue(a, sortBy).localeCompare(sortValue(b, sortBy), undefined, { numeric: true, sensitivity: "base" })
  )
}

/** Full-document redirect to sign-in (not a client navigate) so AuthProvider re-checks the session on
 *  reload; a client navigate keeps its stale cached user and bounces straight back to this list (B.6).
 *  Terminates the server session first (matching AuthProvider's expiry handler) so the landing route
 *  does not immediately send the user back on a still-valid BFF token. */
function UnauthorizedRedirect() {
  useEffect(() => {
    const { pathname, search, hash } = window.location
    const redirect = encodeURIComponent(pathname + search + hash)
    trpcClient.auth.terminateUserSession.mutate().finally(() => {
      window.location.replace(`/?redirect=${redirect}`)
    })
  }, [])
  return null
}

function PortsContent({
  portsPromise,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortSettings,
  onSortChange,
  currentPage,
  onPageChange,
  isNetworkScoped,
}: {
  portsPromise: Promise<PortsResult>
  searchTerm: string
  onSearchChange: (term: string) => void
  statusFilter: string
  onStatusChange: (status: string | undefined) => void
  sortSettings: RequiredSortSettings
  onSortChange: (settings: SortSettings) => void
  currentPage: number
  onPageChange: (page: number) => void
  isNetworkScoped: boolean
}) {
  const { t } = useLingui()
  const { ports, forbidden, unauthorized } = use(portsPromise)

  // Local input value for instant typing. The URL (searchTerm) stays the source of truth and is updated
  // debounced for shareable links; filtering uses the local value so results update on every keystroke.
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)
  // Last term this input sent to the URL, so only external URL changes (back/forward, links) overwrite the input
  const submittedSearchTerm = useRef(searchTerm)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  useEffect(() => {
    if (searchTerm === submittedSearchTerm.current) return
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = searchTerm
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const submitSearchTerm = (term: string) => {
    clearTimeout(debounceTimer.current)
    submittedSearchTerm.current = term
    onSearchChange(term)
  }

  const visiblePorts = useMemo(
    () =>
      sortPorts(
        filterByStatus(filterPorts(ports, localSearchTerm), statusFilter),
        sortSettings.sortBy,
        sortSettings.sortDirection
      ),
    [ports, localSearchTerm, statusFilter, sortSettings.sortBy, sortSettings.sortDirection]
  )

  const totalPages = Math.max(1, Math.ceil(visiblePorts.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedPorts = visiblePorts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Reset to page 1 when the URL's page is past the end of the current (filtered) result
  useEffect(() => {
    if (currentPage > totalPages) onPageChange(1)
  }, [currentPage, totalPages, onPageChange])

  if (unauthorized) return <UnauthorizedRedirect />

  if (forbidden) {
    return (
      <Message variant="info" title={t`Insufficient Permissions`}>
        <Trans>You do not have the required permissions to view ports in this project.</Trans>
      </Message>
    )
  }

  const statusFilters: Filter[] = [
    { displayName: t`Status`, filterName: "status", values: PORT_STATUS_VALUES, supportsMultiValue: false },
  ]
  const selectedFilters = statusFilter ? [{ name: "status", value: statusFilter }] : []

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
          onSortByChange={(v) => onSortChange({ ...sortSettings, sortBy: v })}
          onSortDirectionChange={(dir) => onSortChange({ ...sortSettings, sortDirection: dir })}
        />
      </Stack>

      {/* Zone 2 — status filter + search + active filter pills */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="between" alignment="center">
            <FiltersInput
              filters={statusFilters}
              selectClassName="sm:min-w-40"
              comboboxClassName="sm:min-w-40"
              onChange={(selected) => onStatusChange(selected.value || undefined)}
            />
            <SearchInput
              placeholder={t`Search ports...`}
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
              filters={statusFilters}
              onDelete={() => onStatusChange(undefined)}
              onClear={() => onStatusChange(undefined)}
            />
          )}
        </Stack>
      </DataGridToolbar>

      <PortListContainer
        ports={paginatedPorts}
        hasSearch={Boolean(localSearchTerm.trim())}
        hasStatusFilter={Boolean(statusFilter)}
        isNetworkScoped={isNetworkScoped}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}

export const Ports = ({ client, project, networkId }: PortsProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as PortsSearchParams

  // The URL is the single source of truth for search, sort and page. They drive client-side transforms
  // of the already-fetched list, so back/forward navigation and shared links stay in sync without refetching.
  const searchTerm = searchParams.search ?? ""
  const statusFilter = searchParams.status ?? ""
  const sortBy: PortSortKey = searchParams.sortBy || "name"
  const sortDirection = searchParams.sortDirection || "asc"
  const currentPage = searchParams.page ?? 1

  const sortSettings: RequiredSortSettings = {
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Status`, value: "status" },
      { label: t`Device Owner`, value: "device_owner" },
    ],
    sortBy,
    sortDirection,
  }

  // Bumped by "Try Again" to create a fresh promise (the only thing that re-fetches besides a scope change)
  const [retryCount, setRetryCount] = useState(0)

  const portsPromise = useMemo(
    () => createPortsPromise(client, project, networkId),
    // retryCount is not used in the factory, it only forces a new promise on "Try Again"
    [client, project, networkId, retryCount]
  )

  const handleSortChange = (newSortSettings: SortSettings) => {
    navigate({
      search: ((prev: PortsSearchParams) => ({
        ...prev,
        sortBy: (newSortSettings.sortBy?.toString() || "name") as PortSortKey,
        sortDirection: newSortSettings.sortDirection || "asc",
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  const handleSearchChange = (term: string) => {
    navigate({
      search: ((prev: PortsSearchParams) => ({
        ...prev,
        search: term || undefined,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  const handleStatusChange = (status: string | undefined) => {
    navigate({
      search: ((prev: PortsSearchParams) => ({
        ...prev,
        status: status || undefined,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
  }

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        search: ((prev: PortsSearchParams) => ({
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
        // Resets the boundary when the fetch changes: on "Try Again" and on a project/network change.
        resetKeys={[portsPromise]}
        fallbackRender={() => (
          <Status
            status="error"
            title={t`Failed to Load Ports`}
            body={t`An unexpected error occurred. Try again.`}
            action={
              <Button onClick={() => setRetryCount((count) => count + 1)}>
                <Trans>Try Again</Trans>
              </Button>
            }
          />
        )}
      >
        <Suspense fallback={<Status status="progress" title={t`Loading Ports...`} />}>
          <PortsContent
            portsPromise={portsPromise}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            statusFilter={statusFilter}
            onStatusChange={handleStatusChange}
            sortSettings={sortSettings}
            onSortChange={handleSortChange}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            isNetworkScoped={Boolean(networkId)}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
