import { useLingui } from "@lingui/react/macro"
import { FloatingIpQueryParameters } from "@/server/Network/types/floatingIp"
import { ListToolbar } from "@/client/components/ListToolbar"
import { trpcReact } from "@/client/trpcClient"
import { FloatingIpListContainer } from "./-components/FloatingIpListContainer"
import { buildFilterParams } from "../utils/buildFilterParams"
import { useListWithFiltering } from "../utils/useListWithFiltering"

export const DEFAULT_SORT_KEY = "fixed_ip_address"
export const DEFAULT_SORT_DIR = "asc"
export type FloatingIpsSortKey = NonNullable<FloatingIpQueryParameters["sort_key"]>

export const FloatingIps = () => {
  const { t } = useLingui()

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

  const {
    data: floatingIps = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.floatingIp.list.useQuery({
    sort_key: sortSettings.sortBy,
    sort_dir: sortSettings.sortDirection,
    ...buildFilterParams(filterSettings),
    ...(searchTerm ? { searchTerm } : {}),
  })

  return (
    <div className="relative">
      <ListToolbar
        searchTerm={searchTerm}
        onSearch={handleSearchChange}
        sortSettings={sortSettings}
        onSort={handleSortChange}
        filterSettings={filterSettings}
        onFilter={handleFilterChange}
      />

      <FloatingIpListContainer floatingIps={floatingIps} isLoading={isLoading} isError={isError} error={error} />
    </div>
  )
}
