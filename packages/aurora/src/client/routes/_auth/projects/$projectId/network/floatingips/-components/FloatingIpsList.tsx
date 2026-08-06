import { useState, useRef, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { Button, Stack, DataGridToolbar, SearchInput, Message } from "@cloudoperators/juno-ui-components"
import { FloatingIpQueryParameters } from "@/server/Network/types/floatingIp"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { trpcReact } from "@/client/trpcClient"
import { useModal } from "@/client/utils/useModal"
import { useProjectId } from "@/client/hooks"
import { FloatingIpListContainer } from "./-table/FloatingIpListContainer"
import { AllocateFloatingIpModal } from "./-modals/AllocateFloatingIpModal"
import { parseFiltersFromUrl, buildFilterParams, buildUrlSearchParams, applyFilterSelection } from "../urlHelpers"

const DEFAULT_SORT_KEY = "fixed_ip_address"
const DEFAULT_SORT_DIR = "asc"
export type FloatingIpsSortKey = NonNullable<FloatingIpQueryParameters["sort_key"]>

type FloatingIpsSearchParams = {
  status?: string
  search?: string
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

export const FloatingIpsList = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as FloatingIpsSearchParams
  const projectId = useProjectId()
  const [allocateModalOpen, toggleAllocateModal] = useModal(false)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParams.search || "")
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Fixed IP Address`, value: "fixed_ip_address" },
      { label: t`Floating IP Address`, value: "floating_ip_address" },
      { label: t`Floating Network ID`, value: "floating_network_id" },
      { label: t`ID`, value: "id" },
      { label: t`Router ID`, value: "router_id" },
      { label: t`Status`, value: "status" },
      { label: t`Tenant ID`, value: "tenant_id" },
      { label: t`Project ID`, value: "project_id" },
    ],
    sortBy: searchParams.sortBy || DEFAULT_SORT_KEY,
    sortDirection: searchParams.sortDirection || DEFAULT_SORT_DIR,
  })

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Status`,
        filterName: "status",
        values: ["ACTIVE", "DOWN", "ERROR"],
        supportsMultiValue: false,
      },
    ],
    selectedFilters: parseFiltersFromUrl(searchParams),
  })

  const searchTerm = searchParams.search || ""

  const { data: permissions } = trpcReact.network.canUser.useQuery(
    {
      project_id: projectId,
      permission: ["network:floatingips:create"],
    },
    {
      select: ([canCreate]) => ({
        canCreate,
      }),
    }
  )

  useEffect(() => {
    const urlFilters = parseFiltersFromUrl(searchParams)
    const urlSortBy = searchParams.sortBy || DEFAULT_SORT_KEY
    const urlSortDirection = searchParams.sortDirection || DEFAULT_SORT_DIR
    const urlSearchTerm = searchParams.search || ""

    setFilterSettings((prev) => ({ ...prev, selectedFilters: urlFilters }))
    setSortSettings((prev) => ({ ...prev, sortBy: urlSortBy, sortDirection: urlSortDirection }))
    setLocalSearchTerm(urlSearchTerm)
  }, [searchParams.status, searchParams.sortBy, searchParams.sortDirection, searchParams.search])

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options,
      sortBy: newSortSettings.sortBy?.toString() || DEFAULT_SORT_KEY,
      sortDirection: newSortSettings.sortDirection || DEFAULT_SORT_DIR,
    }
    setSortSettings(settings)
    navigate({
      search: ((prev: FloatingIpsSearchParams) => ({
        ...prev,
        sortBy: settings.sortBy,
        sortDirection: settings.sortDirection,
      })) as unknown as true,
      replace: false,
    })
  }

  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    setFilterSettings(newFilterSettings)
    navigate({
      search: ((prev: FloatingIpsSearchParams) =>
        buildUrlSearchParams(newFilterSettings.selectedFilters || [], newFilterSettings.filters, {
          search: prev.search,
          sortBy: prev.sortBy,
          sortDirection: prev.sortDirection,
        })) as unknown as true,
      replace: false,
    })
  }

  const handleSearchChange = (term: string, replace = false) => {
    navigate({
      search: ((prev: FloatingIpsSearchParams) => ({
        ...prev,
        search: term || undefined,
      })) as unknown as true,
      replace,
    })
  }

  const {
    data: floatingIps = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.floatingIp.list.useQuery(
    {
      project_id: projectId,
      sort_key: sortSettings.sortBy as FloatingIpsSortKey,
      sort_dir: sortSettings.sortDirection,
      ...buildFilterParams(filterSettings.selectedFilters || [], filterSettings.filters),
      ...(searchTerm ? { searchTerm } : {}),
    },
    {
      placeholderData: (prev) => prev,
    }
  )

  if (isLoading && !floatingIps.length) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        <Trans>Loading...</Trans>
      </Stack>
    )
  }

  if (isError && !floatingIps.length) {
    return (
      <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
        {error?.message ?? t`Failed to load Floating IPs`}
      </Stack>
    )
  }

  return (
    <div className="relative">
      {/* Non-blocking error banner for refetch failures with cached data */}
      {isError && floatingIps.length > 0 && (
        <Message variant="error" className="mb-4">
          {error?.message ?? t`Failed to refresh Floating IPs. Showing cached data.`}
        </Message>
      )}

      {/* Zone 1 — sort + create button, no background */}
      <Stack distribution="end" alignment="center" gap="2" className="pb-2">
        <Stack gap="2">
          <SortInput
            options={sortSettings.options}
            sortBy={sortSettings.sortBy}
            sortDirection={sortSettings.sortDirection ?? "asc"}
            onSortByChange={(v) =>
              handleSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
            }
            onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
          />
          {permissions?.canCreate && (
            <Button onClick={toggleAllocateModal} variant="primary" className="whitespace-nowrap">
              <Trans>Allocate Floating IP</Trans>
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Zone 2 — filter + search + active filter pills */}
      <DataGridToolbar>
        <Stack direction="vertical" gap="2">
          <Stack distribution="between" alignment="center">
            <FiltersInput
              filters={filterSettings.filters}
              onChange={(selected) => {
                const newSelected = applyFilterSelection(
                  filterSettings.selectedFilters || [],
                  selected,
                  filterSettings.filters
                )
                if (newSelected === (filterSettings.selectedFilters || [])) return
                handleFilterChange({ ...filterSettings, selectedFilters: newSelected })
              }}
            />
            <SearchInput
              placeholder={t`Search floating IPs...`}
              data-testid="searchbar"
              value={localSearchTerm}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const v = e.currentTarget.value
                setLocalSearchTerm(v)
                clearTimeout(debounceTimer.current)
                debounceTimer.current = window.setTimeout(() => handleSearchChange(v, true), 500)
              }}
              onSearch={(v) => {
                clearTimeout(debounceTimer.current)
                handleSearchChange(typeof v === "string" ? v : "", false)
              }}
              onClear={() => {
                clearTimeout(debounceTimer.current)
                setLocalSearchTerm("")
                handleSearchChange("", false)
              }}
            />
          </Stack>
          {filterSettings.selectedFilters && filterSettings.selectedFilters.length > 0 && (
            <SelectedFilters
              selectedFilters={filterSettings.selectedFilters}
              onDelete={(filterToRemove) =>
                handleFilterChange({
                  ...filterSettings,
                  selectedFilters: (filterSettings.selectedFilters || []).filter(
                    (f) => !(f.name === filterToRemove.name && f.value === filterToRemove.value)
                  ),
                })
              }
              onClear={() => handleFilterChange({ ...filterSettings, selectedFilters: [] })}
            />
          )}
        </Stack>
      </DataGridToolbar>

      <FloatingIpListContainer
        floatingIps={floatingIps}
        isLoading={isLoading}
        isError={isError && !floatingIps.length}
        error={error}
      />

      {allocateModalOpen && <AllocateFloatingIpModal open={allocateModalOpen} onClose={toggleAllocateModal} />}
    </div>
  )
}
