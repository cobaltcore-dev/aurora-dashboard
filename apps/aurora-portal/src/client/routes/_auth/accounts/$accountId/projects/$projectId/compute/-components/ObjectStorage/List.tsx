import { useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ContainerSummary } from "@/server/Storage/types/swiftObjectStorage"
import { trpcReact } from "@/client/trpcClient"
import { Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { ContainerListView } from "./-components/ContainerListView"

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

  // Fetch containers from tRPC
  const {
    data: containers,
    isLoading,
    error,
  } = trpcReact.objectStorage.listContainers.useQuery({
    format: "json",
  })

  // Sort containers based on sort settings
  const sortContainers = (containers: ContainerSummary[]): ContainerSummary[] => {
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
          if (!a.last_modified || !b.last_modified) {
            return a.last_modified ? -1 : 1
          }
          comparison = new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime()
          break
        default:
          comparison = a.name.localeCompare(b.name)
      }

      return sortSettings.sortDirection === "desc" ? -comparison : comparison
    })
  }

  // Filter containers based on search term
  const filteredContainers = (containers || []).filter((container) =>
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

  // Handle loading state
  if (isLoading) {
    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Containers...</Trans>
      </Stack>
    )
  }

  // Handle error state
  if (error) {
    const errorMessage = error.message

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
        <Trans>Error loading containers: {errorMessage}</Trans>
      </Stack>
    )
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
