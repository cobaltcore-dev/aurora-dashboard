import { useState, startTransition } from "react"
import { useLingui } from "@lingui/react/macro"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ContainerListView } from "./-components/ContainerListView"
import { mockAccountContainers } from "./-components/containersList.mock"

interface Container {
  count: number
  bytes: number
  name: string
  last_modified: string
}

type RequiredSortSettings = {
  options: SortSettings["options"]
  sortBy: string
  sortDirection: "asc" | "desc"
}

export const ObjectStorage = () => {
  const { t } = useLingui()

  const [sortSettings, setSortSettings] = useState<RequiredSortSettings>({
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Object Count`, value: "count" },
      { label: t`Total Size`, value: "bytes" },
      { label: t`Last Modified`, value: "last_modified" },
    ],
    sortBy: "name",
    sortDirection: "asc",
  })

  const [searchTerm, setSearchTerm] = useState("")

  // Sort containers based on sort settings
  const sortContainers = (containers: Container[]): Container[] => {
    return [...containers].sort((a, b) => {
      let comparison = 0

      switch (sortSettings.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "count":
          comparison = a.count - b.count
          break
        case "bytes":
          comparison = a.bytes - b.bytes
          break
        case "last_modified":
          comparison = new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime()
          break
        default:
          comparison = a.name.localeCompare(b.name)
      }

      return sortSettings.sortDirection === "desc" ? -comparison : comparison
    })
  }

  // Filter containers based on search term
  const filteredContainers = mockAccountContainers.filter((container) =>
    container.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Apply sorting to filtered containers
  const sortedContainers = sortContainers(filteredContainers)

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const searchValue = typeof term === "string" ? term : ""
    startTransition(() => {
      setSearchTerm(searchValue)
    })
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    const settings: RequiredSortSettings = {
      options: newSortSettings.options,
      sortBy: newSortSettings.sortBy?.toString() || "name",
      sortDirection: newSortSettings.sortDirection || "asc",
    }

    startTransition(() => {
      setSortSettings(settings)
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

      <ContainerListView containers={sortedContainers} />
    </div>
  )
}
