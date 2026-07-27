import { useState, useRef, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, Stack, DataGridToolbar, SearchInput, Message } from "@cloudoperators/juno-ui-components"
import { FloatingIpQueryParameters } from "@/server/Network/types/floatingIp"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SelectedFilters } from "@/client/components/ListToolbar/SelectedFilters"
import { FiltersInput } from "@/client/components/ListToolbar/FiltersInput"
import { trpcReact } from "@/client/trpcClient"
import { buildFilterParams } from "@/client/utils/buildFilterParams"
import { useListWithFiltering } from "@/client/utils/useListWithFiltering"
import { useModal } from "@/client/utils/useModal"
import { useProjectId } from "@/client/hooks"
import { FloatingIpListContainer } from "./-table/FloatingIpListContainer"
import { AllocateFloatingIpModal } from "./-modals/AllocateFloatingIpModal"
import { applyFilterSelection } from "../urlHelpers"

const DEFAULT_SORT_KEY = "fixed_ip_address"
const DEFAULT_SORT_DIR = "asc"
export type FloatingIpsSortKey = NonNullable<FloatingIpQueryParameters["sort_key"]>

export const FloatingIpsList = () => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [allocateModalOpen, toggleAllocateModal] = useModal(false)
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

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

  const { searchTerm, handleSearchChange, sortSettings, handleSortChange, filterSettings, handleFilterChange } =
    useListWithFiltering<FloatingIpsSortKey>({
      defaultSortKey: DEFAULT_SORT_KEY,
      defaultSortDir: DEFAULT_SORT_DIR,
      sortOptions: [
        { label: t`Fixed IP Address`, value: "fixed_ip_address" },
        { label: t`Floating IP Address`, value: "floating_ip_address" },
        { label: t`Floating Network ID`, value: "floating_network_id" },
        { label: t`ID`, value: "id" },
        { label: t`Router ID`, value: "router_id" },
        { label: t`Status`, value: "status" },
        // Tenant_id was kept for backward compatibility in case the deprecated tenant ID was used to sort instead of the project ID.
        { label: t`Tenant ID`, value: "tenant_id" },
        { label: t`Project ID`, value: "project_id" },
      ],
      filterSettings: {
        filters: [
          {
            displayName: t`Status`,
            filterName: "status",
            values: ["ACTIVE", "DOWN", "ERROR"],
            supportsMultiValue: false,
          },
        ],
      },
    })

  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const {
    data: floatingIps = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.floatingIp.list.useQuery(
    {
      project_id: projectId,
      sort_key: sortSettings.sortBy,
      sort_dir: sortSettings.sortDirection,
      ...buildFilterParams(filterSettings),
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
                debounceTimer.current = window.setTimeout(() => handleSearchChange(v), 500)
              }}
              onSearch={(v) => {
                clearTimeout(debounceTimer.current)
                handleSearchChange(typeof v === "string" ? v : "")
              }}
              onClear={() => {
                clearTimeout(debounceTimer.current)
                setLocalSearchTerm("")
                handleSearchChange("")
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
