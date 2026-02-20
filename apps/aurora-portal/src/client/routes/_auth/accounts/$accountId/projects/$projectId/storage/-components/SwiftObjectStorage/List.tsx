import { useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { trpcReact } from "@/client/trpcClient"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { Button, Spinner, Stack } from "@cloudoperators/juno-ui-components"
import { ContainerListView } from "./-components/ContainerListView"

export const SwiftObjectStorage = () => {
  const { t } = useLingui()

  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [sortSettings, setSortSettings] = useState<SortSettings>({
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
  } = trpcReact.storage.swift.listContainers.useQuery({
    format: "json",
  })

  // Fetch account metadata for quota information
  const { data: accountInfo } = trpcReact.storage.swift.getAccountMetadata.useQuery({})

  // Fetch Swift service info
  const { data: serviceInfo } = trpcReact.storage.swift.getServiceInfo.useQuery()

  console.log("service info: ", serviceInfo)
  console.log("account info: ", accountInfo)

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
    const settings: SortSettings = {
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
        <Trans>Error Loading Containers: {errorMessage}</Trans>
      </Stack>
    )
  }

  // Calculate quota information
  const bytesUsed = accountInfo?.bytesUsed || 0
  const quotaBytes = accountInfo?.quotaBytes || 0
  const remainingBytes = quotaBytes > 0 ? quotaBytes - bytesUsed : 0

  return (
    <div className="relative">
      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchTerm}
        onSort={handleSortChange}
        onSearch={handleSearchChange}
        actions={
          <Stack direction="vertical" alignment="end" gap="4">
            {accountInfo && quotaBytes > 0 && (
              <Stack direction="vertical" alignment="end" gap="1" className="text-sm">
                <div className="text-theme-default">
                  <Trans>Remaining Quota:</Trans>{" "}
                  <span className="font-semibold">{formatBytesBinary(remainingBytes)} Capacity</span>
                </div>
                <div className="text-theme-light">
                  <Trans>Space Used:</Trans> {formatBytesBinary(bytesUsed)} / {formatBytesBinary(quotaBytes)}
                </div>
              </Stack>
            )}
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              <Trans>Create Container</Trans>
            </Button>
          </Stack>
        }
      />

      <ContainerListView
        containers={sortedContainers}
        createModalOpen={createModalOpen}
        setCreateModalOpen={setCreateModalOpen}
        maxContainerNameLength={serviceInfo?.swift?.max_container_name_length}
      />
    </div>
  )
}
