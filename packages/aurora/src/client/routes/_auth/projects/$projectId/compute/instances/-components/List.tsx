import { use, Suspense, useState, useRef, startTransition, useEffect, useCallback } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { useLingui } from "@lingui/react/macro"
import { useSearch, useNavigate } from "@tanstack/react-router"
import { TrpcClient } from "@/client/trpcClient"
import { Button, Stack, DataGridToolbar, SearchInput, Status } from "@cloudoperators/juno-ui-components"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { SortSettings, SelectedFilter, Filter } from "@/client/components/ListToolbar/types"
import { InstanceListView } from "./InstanceListView"
import { availabilityZones, instanceStatuses, flavorFacet, imageFacet, keyNameFacet } from "../-utils/instanceDisplay"
import { createInstancesPromise, createPermissionsPromise, type InstancesResult } from "../apiHelpers"
import { parseFiltersFromUrl, buildFilterParams, buildUrlFilterParams, applyFilterSelection } from "../urlHelpers"
import type { InstancesSearchParams } from "@/client/routes/_auth/projects/$projectId/compute/instances"

const PAGE_SIZE = 50

interface InstancesProps {
  client: TrpcClient
  project: string
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

// Filter facet definitions. Facets whose values are open-ended per project
// (flavor, image id, key name) are derived from the data; status/az likewise.
// Multi-value facets encode as "in:a,b" in the URL and BFF query, mirroring Images.
const buildFilters = (servers: InstancesResult["servers"], t: (s: TemplateStringsArray) => string): Filter[] => [
  { displayName: t`Status`, filterName: "status", values: instanceStatuses(servers), supportsMultiValue: true },
  { displayName: t`Availability Zone`, filterName: "az", values: availabilityZones(servers) },
  { displayName: t`Flavor`, filterName: "flavor", values: flavorFacet(servers), supportsMultiValue: true },
  { displayName: t`Image ID`, filterName: "image", values: imageFacet(servers), supportsMultiValue: true },
  { displayName: t`Key Name`, filterName: "key_name", values: keyNameFacet(servers), supportsMultiValue: true },
  {
    displayName: t`Locked`,
    filterName: "locked",
    values: ["true", "false"],
    valueLabels: { true: t`Yes`, false: t`No` },
  },
]

function InstancesContent({
  instancesPromise,
  permissionsPromise,
  allServers,
  searchTerm,
  setSearchTerm,
  sortSettings,
  handleSortChange,
  selectedFilters,
  onApplyFilter,
  onRemoveFilter,
  onClearFilters,
  currentPage,
  onPageChange,
}: {
  instancesPromise: Promise<InstancesResult>
  permissionsPromise: Promise<{ canList: boolean }>
  allServers: InstancesResult["servers"]
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortSettings: RequiredSortSettings
  handleSortChange: (settings: SortSettings) => void
  selectedFilters: SelectedFilter[]
  onApplyFilter: (filter: SelectedFilter, filters: Filter[]) => void
  onRemoveFilter: (filter: SelectedFilter) => void
  onClearFilters: () => void
  currentPage: number
  onPageChange: (page: number) => void
}) {
  const { t } = useLingui()
  const { servers, listForbidden } = use(instancesPromise)
  const { canList } = use(permissionsPromise)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  if (listForbidden || !canList) {
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You don't have permission to view instances in this project. Contact your administrator to grant you the necessary permissions.`}
      />
    )
  }

  // Facet values are built from the broadest result we've seen so the dropdown
  // options don't collapse to only what the current filter already matches.
  const filters = buildFilters(allServers.length >= servers.length ? allServers : servers, t)

  const totalPages = Math.max(1, Math.ceil(servers.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = servers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <>
      {/* Zone 1 — sort, no background */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <SortInput
          options={sortSettings.options}
          sortBy={sortSettings.sortBy}
          sortDirection={sortSettings.sortDirection ?? "asc"}
          selectClassName="min-w-40"
          onSortByChange={(v) =>
            handleSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
          }
          onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
        />
      </Stack>

      {/* Zone 2 — filter + search + active filter pills */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="between" alignment="center">
            <FiltersInput
              filters={filters}
              selectClassName="sm:min-w-40"
              comboboxClassName="sm:min-w-40"
              onChange={(selected) => onApplyFilter(selected, filters)}
            />
            <SearchInput
              placeholder={t`Search instances...`}
              data-testid="searchbar"
              value={localSearchTerm}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setLocalSearchTerm(v)
                clearTimeout(debounceTimer.current)
                debounceTimer.current = window.setTimeout(() => setSearchTerm(v), 500)
              }}
              onSearch={(v) => {
                clearTimeout(debounceTimer.current)
                setSearchTerm(typeof v === "string" ? v : "")
              }}
              onClear={() => {
                clearTimeout(debounceTimer.current)
                setLocalSearchTerm("")
                setSearchTerm("")
              }}
            />
          </Stack>
          {selectedFilters.length > 0 && (
            <SelectedFilters
              selectedFilters={selectedFilters}
              filters={filters}
              onDelete={onRemoveFilter}
              onClear={onClearFilters}
            />
          )}
        </Stack>
      </DataGridToolbar>

      <InstanceListView
        instances={paginated}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}

export const Instances = ({ client, project }: InstancesProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as InstancesSearchParams

  const sortOptions = [
    { label: t`Name`, value: "name" },
    { label: t`Status`, value: "status" },
    { label: t`Flavor`, value: "flavor" },
    { label: t`Availability Zone`, value: "availability_zone" },
    { label: t`Created`, value: "created" },
    { label: t`Updated`, value: "updated" },
  ]

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: sortOptions,
    sortBy: searchParams.sortBy || "name",
    sortDirection: searchParams.sortDirection || "asc",
  })

  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const currentPage = searchParams.page ?? 1

  const filterDefs = buildFilters([], t)
  const selectedFilters = parseFiltersFromUrl(searchParams)

  // Keep the widest server set seen so filter-facet dropdowns stay complete.
  const [allServers, setAllServers] = useState<InstancesResult["servers"]>([])

  // filterDefs is stable: buildFilterParams only reads filterName/supportsMultiValue,
  // not facet values, so a plain function (not useCallback) is correct here.
  const makePromise = (sortBy: string, sortDirection: string, term: string, filters: SelectedFilter[]) =>
    createInstancesPromise(client, project, sortBy, sortDirection, term, buildFilterParams(filters, filterDefs)).then(
      (res) => {
        if (!term && filters.length === 0) setAllServers(res.servers)
        return res
      }
    )

  const [instancesPromise, setInstancesPromise] = useState(() =>
    makePromise(sortSettings.sortBy, sortSettings.sortDirection, searchTerm, selectedFilters)
  )
  const [permissionsPromise] = useState(() => createPermissionsPromise(client, project))

  const refetch = (sortBy: string, sortDirection: string, term: string, filters: SelectedFilter[]) => {
    startTransition(() => setInstancesPromise(makePromise(sortBy, sortDirection, term, filters)))
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    const sortBy = newSortSettings.sortBy?.toString() || "name"
    const sortDirection = newSortSettings.sortDirection || "asc"
    setSortSettings({ options: sortOptions, sortBy, sortDirection })
    navigate({
      search: ((prev: InstancesSearchParams) => ({
        ...prev,
        sortBy,
        sortDirection,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
    refetch(sortBy, sortDirection, searchTerm, selectedFilters)
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    navigate({
      search: ((prev: InstancesSearchParams) => ({
        ...prev,
        search: term || undefined,
        page: undefined,
      })) as unknown as true,
      replace: true,
    })
    refetch(sortSettings.sortBy, sortSettings.sortDirection, term, selectedFilters)
  }

  const navigateFilters = (next: SelectedFilter[]) => {
    const urlParams = buildUrlFilterParams(next, filterDefs)
    navigate({
      search: ((prev: InstancesSearchParams) => ({ ...prev, ...urlParams, page: undefined })) as unknown as true,
      replace: true,
    })
    refetch(sortSettings.sortBy, sortSettings.sortDirection, searchTerm, next)
  }

  const handleApplyFilter = (selected: SelectedFilter, filters: Filter[]) => {
    const next = applyFilterSelection(selectedFilters, selected, filters)
    if (next === selectedFilters) return
    navigateFilters(next)
  }

  const handleRemoveFilter = (filter: SelectedFilter) => {
    navigateFilters(selectedFilters.filter((f) => !(f.name === filter.name && f.value === filter.value)))
  }

  const handleClearFilters = () => navigateFilters([])

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        search: ((prev: InstancesSearchParams) => ({
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
        fallbackRender={({ error, resetErrorBoundary }) => (
          <Status
            status="error"
            title={t`Failed to Load Instances`}
            body={error instanceof Error ? error.message : t`An unexpected error occurred.`}
            action={
              <Button variant="primary" onClick={() => startTransition(() => resetErrorBoundary())}>
                {t`Retry`}
              </Button>
            }
          />
        )}
      >
        <Suspense fallback={<Status status="progress" title={t`Loading Instances...`} />}>
          <InstancesContent
            instancesPromise={instancesPromise}
            permissionsPromise={permissionsPromise}
            allServers={allServers}
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            sortSettings={sortSettings}
            handleSortChange={handleSortChange}
            selectedFilters={selectedFilters}
            onApplyFilter={handleApplyFilter}
            onRemoveFilter={handleRemoveFilter}
            onClearFilters={handleClearFilters}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
