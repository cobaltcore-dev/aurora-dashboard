import { useState, useRef, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  Stack,
  DataGridToolbar,
  SearchInput,
  Checkbox,
  PopupMenu,
  PopupMenuItem,
  PopupMenuToggle,
  PopupMenuOptions,
  Message,
} from "@cloudoperators/juno-ui-components"
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
  const [selectedFloatingIps, setSelectedFloatingIps] = useState<Array<string>>([])
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  const { data: permissions } = trpcReact.network.canUser.useQuery(
    {
      project_id: projectId,
      permission: ["network:floatingips:create", "network:floatingips:delete", "network:floatingips:update"],
    },
    {
      select: ([canCreate, canDelete, canUpdate]) => ({
        canCreate,
        canDelete,
        canUpdate,
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

  const displayedFloatingIpIds = new Set(floatingIps.map((ip) => ip.id))
  const validSelectedFloatingIps = selectedFloatingIps.filter((id) => displayedFloatingIpIds.has(id))

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

      {/* Zone 3 — select all + bulk actions (only when at least one bulk action is available) */}
      {(permissions?.canDelete || permissions?.canUpdate) && (
        <DataGridToolbar>
          <Stack distribution="between" alignment="center">
            <Stack gap="2" alignment="center">
              <Checkbox
                checked={
                  validSelectedFloatingIps.length > 0 &&
                  floatingIps.every((ip) => validSelectedFloatingIps.includes(ip.id))
                }
                indeterminate={
                  validSelectedFloatingIps.length > 0 &&
                  !floatingIps.every((ip) => validSelectedFloatingIps.includes(ip.id))
                }
                onChange={() => {
                  const allIds = floatingIps.map((ip) => ip.id)
                  const allSelected = allIds.every((id) => validSelectedFloatingIps.includes(id))
                  if (allSelected) {
                    setSelectedFloatingIps(validSelectedFloatingIps.filter((id) => !allIds.includes(id)))
                  } else {
                    setSelectedFloatingIps([...new Set([...validSelectedFloatingIps, ...allIds])])
                  }
                }}
              />
              <PopupMenu>
                <PopupMenuToggle as="div">
                  <Button size="small" icon="moreVert" label={t`Actions`} />
                </PopupMenuToggle>
                <PopupMenuOptions>
                  {permissions?.canDelete && (
                    <PopupMenuItem
                      disabled={validSelectedFloatingIps.length === 0}
                      label={t`Delete Selected`}
                      onClick={() => {
                        // TODO: Implement bulk delete
                      }}
                    />
                  )}
                  {permissions?.canUpdate && (
                    <PopupMenuItem
                      disabled={validSelectedFloatingIps.length === 0}
                      label={t`Update Selected`}
                      onClick={() => {
                        // TODO: Implement bulk update
                      }}
                    />
                  )}
                </PopupMenuOptions>
              </PopupMenu>
            </Stack>
          </Stack>
        </DataGridToolbar>
      )}

      <FloatingIpListContainer
        floatingIps={floatingIps}
        isLoading={isLoading}
        isError={isError && !floatingIps.length}
        error={error}
        selectedFloatingIps={selectedFloatingIps}
        setSelectedFloatingIps={setSelectedFloatingIps}
        hasAnyBulkAction={permissions?.canDelete || permissions?.canUpdate}
      />

      {allocateModalOpen && <AllocateFloatingIpModal open={allocateModalOpen} onClose={toggleAllocateModal} />}
    </div>
  )
}
