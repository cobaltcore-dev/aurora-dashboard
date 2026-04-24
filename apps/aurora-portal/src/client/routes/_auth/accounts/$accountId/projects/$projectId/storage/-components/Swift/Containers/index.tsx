import { useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { trpcReact } from "@/client/trpcClient"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { Button, Spinner, Stack, Toast, ToastProps } from "@cloudoperators/juno-ui-components"
import { ContainerTableView } from "./ContainerTableView"
import {
  getContainerCreatedToast,
  getContainerCreateErrorToast,
  getContainerEmptiedToast,
  getContainerEmptyErrorToast,
  getContainerDeletedToast,
  getContainerDeleteErrorToast,
  getContainerUpdatedToast,
  getContainerUpdateErrorToast,
  getContainerAclUpdatedToast,
  getContainerAclUpdateErrorToast,
  getContainersEmptyCompleteToast,
} from "./ContainerToastNotifications"
import { ContainerLimitsTooltip } from "./ContainerLimitsTooltip"
import { EmptyContainersModal } from "./EmptyContainersModal"
import { useNavigate } from "@tanstack/react-router"
import { Route } from "../../../$provider/containers/"

export const SwiftContainers = () => {
  const { t } = useLingui()
  const navigate = useNavigate({ from: Route.fullPath })

  // Sort state is persisted in the URL so that sort order survives navigation,
  // browser back/forward, and deep links.
  // Sort and search state are persisted in the URL so they survive navigation,
  // browser back/forward, and deep links.
  const { sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [emptyAllModalOpen, setEmptyAllModalOpen] = useState(false)
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const handleToastDismiss = () => setToastData(null)

  const handleCreateSuccess = (containerName: string) => {
    setToastData(getContainerCreatedToast(containerName, { onDismiss: handleToastDismiss }))
  }

  const handleCreateError = (containerName: string, errorMessage: string) => {
    setToastData(getContainerCreateErrorToast(containerName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleEmptySuccess = (containerName: string, deletedCount: number) => {
    setToastData(getContainerEmptiedToast(containerName, deletedCount, { onDismiss: handleToastDismiss }))
  }

  const handleEmptyError = (containerName: string, errorMessage: string) => {
    setToastData(getContainerEmptyErrorToast(containerName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleDeleteSuccess = (containerName: string) => {
    setToastData(getContainerDeletedToast(containerName, { onDismiss: handleToastDismiss }))
  }

  const handleDeleteError = (containerName: string, errorMessage: string) => {
    setToastData(getContainerDeleteErrorToast(containerName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handlePropertiesSuccess = (containerName: string) => {
    setToastData(getContainerUpdatedToast(containerName, { onDismiss: handleToastDismiss }))
  }

  const handlePropertiesError = (containerName: string, errorMessage: string) => {
    setToastData(getContainerUpdateErrorToast(containerName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleAclSuccess = (containerName: string) => {
    setToastData(getContainerAclUpdatedToast(containerName, { onDismiss: handleToastDismiss }))
  }

  const handleAclError = (containerName: string, errorMessage: string) => {
    setToastData(getContainerAclUpdateErrorToast(containerName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleEmptyAllComplete = ({
    emptiedCount,
    totalDeleted,
    errors,
  }: {
    emptiedCount: number
    totalDeleted: number
    errors: string[]
  }) => {
    // Only clear selection when all containers succeeded — failed ones remain
    // selected so the user can retry without having to re-select them.
    if (errors.length === 0) {
      setSelectedContainers([])
    }
    setToastData(getContainersEmptyCompleteToast(emptiedCount, totalDeleted, errors, { onDismiss: handleToastDismiss }))
  }

  const sortSettings: SortSettings = {
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Object Count`, value: "count" },
      { label: t`Total Size`, value: "bytes" },
      { label: t`Last Modified`, value: "last_modified" },
    ],
    sortBy: sortBy ?? "name",
    sortDirection: sortDirection ?? "asc",
  }

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

  // Sort containers based on sort settings
  const sortContainers = (containers: ContainerSummary[]): ContainerSummary[] => {
    return [...containers].sort((a, b) => {
      let comparison: number

      switch (sortBy ?? "name") {
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

      return (sortDirection ?? "asc") === "desc" ? -comparison : comparison
    })
  }

  // Filter containers based on search term
  const filteredContainers = (containers || []).filter((container) =>
    container.name.toLowerCase().includes(searchParam.toLowerCase())
  )

  // Apply sorting to filtered containers
  const sortedContainers = sortContainers(filteredContainers)

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => {
      navigate({
        search: (prev) => ({ ...prev, search: value || undefined }),
      })
    })
  }

  const handleSortChange = (newSortSettings: SortSettings) => {
    const resolvedSortBy = (newSortSettings.sortBy?.toString() || "name") as
      | "name"
      | "count"
      | "bytes"
      | "last_modified"
    const resolvedDirection = (newSortSettings.sortDirection || "asc") as "asc" | "desc"
    startTransition(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: resolvedSortBy,
          sortDirection: resolvedDirection,
        }),
      })
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

  const hasSelection = selectedContainers.length > 0
  const selectedCount = selectedContainers.length

  // Resolve selected ContainerSummary objects from the full unfiltered list so
  // the modal always operates on what was actually selected — not the filtered
  // subset currently visible in the table.
  const selectedContainerSummaries = (containers || []).filter((c) => selectedContainers.includes(c.name))

  return (
    <div className="relative">
      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchParam}
        onSort={handleSortChange}
        onSearch={handleSearchChange}
        actions={
          <Stack direction="vertical" alignment="end" gap="4">
            {accountInfo && quotaBytes > 0 && (
              <Stack direction="vertical" alignment="end" className="text-sm">
                <div className="text-theme-default">
                  <Trans>Remaining Quota:</Trans>{" "}
                  <span className="font-semibold">{formatBytesBinary(remainingBytes)} Capacity</span>
                </div>
              </Stack>
            )}
            <Stack direction="horizontal" gap="4" alignment="center">
              <ContainerLimitsTooltip serviceInfo={serviceInfo} accountInfo={accountInfo} />
              <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                <Trans>Create Container</Trans>
              </Button>
              <Button variant="primary-danger" onClick={() => setEmptyAllModalOpen(true)} disabled={!hasSelection}>
                {hasSelection ? <Trans>Empty All ({selectedCount})</Trans> : <Trans>Empty All</Trans>}
              </Button>
            </Stack>
          </Stack>
        }
      />

      <ContainerTableView
        containers={sortedContainers}
        createModalOpen={createModalOpen}
        setCreateModalOpen={setCreateModalOpen}
        maxContainerNameLength={serviceInfo?.swift?.max_container_name_length}
        onCreateSuccess={handleCreateSuccess}
        onCreateError={handleCreateError}
        onEmptySuccess={handleEmptySuccess}
        onEmptyError={handleEmptyError}
        onDeleteSuccess={handleDeleteSuccess}
        onDeleteError={handleDeleteError}
        onPropertiesSuccess={handlePropertiesSuccess}
        onPropertiesError={handlePropertiesError}
        onAclSuccess={handleAclSuccess}
        onAclError={handleAclError}
        selectedContainers={selectedContainers}
        setSelectedContainers={setSelectedContainers}
      />

      <EmptyContainersModal
        isOpen={emptyAllModalOpen}
        containers={selectedContainerSummaries}
        onClose={() => setEmptyAllModalOpen(false)}
        onComplete={handleEmptyAllComplete}
      />

      {toastData && (
        <Toast {...toastData} className="border-theme-light fixed top-5 right-5 z-50 rounded-lg border shadow-lg" />
      )}
    </div>
  )
}
