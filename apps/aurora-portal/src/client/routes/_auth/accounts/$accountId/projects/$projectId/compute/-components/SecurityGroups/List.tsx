import { useState, startTransition } from "react"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { SecurityGroupListContainer } from "./-components/SecurityGroupListContainer"

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

  const [searchTerm, setSearchTerm] = useState("")

  const {
    data: securityGroups = [],
    isLoading,
    isError,
    error,
  } = trpcReact.network.list.useQuery({
    sort_key: sortSettings.sortBy,
    sort_dir: sortSettings.sortDirection,
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
        searchTerm={searchTerm}
        onSort={handleSortChange}
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
