import { startTransition, useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { ListToolbar } from "@/client/components/ListToolbar"
import { trpcReact } from "@/client/trpcClient"
import { FilterSettings, SortSettings } from "@/client/components/ListToolbar/types"
import { FloatingIpListContainer } from "./-components/FloatingIpListContainer"
import { FloatingIpsSortDir, FloatingIpsSortKey, RequiredSortSettings } from "./types"
import { DEFAULT_SORT_DIR, DEFAULT_SORT_KEY } from "./constants"
import { buildFilterParams } from "../utils"

export const FloatingIps = () => {
  const { t } = useLingui()

  const [searchTerm, setSearchTerm] = useState("")
  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => setSearchTerm(searchValue))
  }

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
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
    sortBy: DEFAULT_SORT_KEY,
    sortDirection: DEFAULT_SORT_DIR,
  })
  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options ?? sortSettings.options,
      sortBy: (newSortSettings.sortBy?.toString() as FloatingIpsSortKey) || DEFAULT_SORT_KEY,
      sortDirection: (newSortSettings.sortDirection as FloatingIpsSortDir) || DEFAULT_SORT_DIR,
    }
    setSortSettings(settings)
  }

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Status`,
        filterName: "status",
        values: ["ACTIVE", "DOWN", "ERROR"],
        supportsMultiValue: false,
      },
    ],
  })
  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    startTransition(() => {
      setFilterSettings(newFilterSettings)
    })
  }

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
