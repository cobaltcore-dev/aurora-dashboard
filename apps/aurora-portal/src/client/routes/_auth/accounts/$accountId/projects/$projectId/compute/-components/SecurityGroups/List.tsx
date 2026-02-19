import { useState, startTransition } from "react"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings, FilterSettings } from "@/client/components/ListToolbar/types"
import { SecurityGroupListContainer } from "./-components/SecurityGroupListContainer"
import { SECURITY_GROUP_SHARED } from "./constants"

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

export const SecurityGroups = () => {
  const { t } = useLingui()

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [{ label: t`Name`, value: "name" }],
    sortBy: "name",
    sortDirection: "asc",
  })

  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    filters: [
      {
        displayName: t`Shared`,
        filterName: "shared",
        values: Object.values(SECURITY_GROUP_SHARED),
        supportsMultiValue: false,
      },
    ],
  })

  const [searchTerm, setSearchTerm] = useState("")

  /**
   * Builds filter parameters from current filter settings
   */
  const buildFilterParams = (): Record<string, string | boolean> => {
    const params: Record<string, string | boolean> = {}

    if (!filterSettings.selectedFilters?.length) return params

    filterSettings.selectedFilters
      .filter((sf) => !sf.inactive)
      .forEach((sf) => {
        if (sf.value === "true" || sf.value === "false") {
          params[sf.name] = sf.value === "true"
          return
        }
        params[sf.name] = sf.value
      })
    return params
  }

  const {
    data: securityGroups = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.list.useQuery({
    sort_key: sortSettings.sortBy,
    sort_dir: sortSettings.sortDirection,
    ...buildFilterParams(),
    ...(searchTerm ? { name: searchTerm } : {}),
  })

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options ?? sortSettings.options,
      sortBy: (newSortSettings.sortBy?.toString() as string) || "name",
      sortDirection: (newSortSettings.sortDirection as "asc" | "desc") || "asc",
    }
    setSortSettings(settings)
  }

  const handleFilterChange = (newFilterSettings: FilterSettings) => {
    startTransition(() => {
      setFilterSettings(newFilterSettings)
    })
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => {
      setSearchTerm(searchValue)
    })
  }

  return (
    <div className="relative">
      <ListToolbar
        sortSettings={sortSettings}
        filterSettings={filterSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onFilter={handleFilterChange}
        onSearch={handleSearchChange}
      />

      <SecurityGroupListContainer
        securityGroups={securityGroups}
        isLoading={isLoading}
        isError={isError}
        error={error}
      />
    </div>
  )
}
