import { useState, useEffect, useRef, startTransition } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { trpcReact } from "@/client/trpcClient"
import {
  Button,
  Checkbox,
  DataGridToolbar,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  SearchInput,
  Spinner,
  Stack,
  Toast,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import { formatBytesBinary } from "@/client/utils/formatBytes"
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
import { useProjectId } from "@/client/hooks/useProjectId"

export const SwiftContainers = () => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })

  // Sort and search state are persisted in the URL so they survive navigation,
  // browser back/forward, and deep links.
  const { sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()

  // Whether the list exposes any bulk action — drives the selection column in
  // ContainerTableView and the Zone 3 bulk-action controls. Hardcoded to true
  // for now; the only bulk action today is the destructive Empty.
  //
  // TODO(perms): wire this to the real Swift container permission source
  // (e.g. a usePermissions hook or a tRPC permissions query) instead of
  // hardcoding it.
  const hasAnyBulkAction = true

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [emptyAllModalOpen, setEmptyAllModalOpen] = useState(false)
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  // Local mirror of the committed search term so typing stays responsive while
  // the URL commit is debounced (see Zone 2 SearchInput below).
  const [localSearchTerm, setLocalSearchTerm] = useState(searchParam)
  const debounceTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => clearTimeout(debounceTimer.current), [])

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
    if (errors.length === 0) {
      setSelectedContainers([])
    } else {
      // Extract the container name from each error string formatted as "<containerName>: <message>".
      // Using exact name extraction avoids the false-positive substring match that
      // errorMessage.includes(containerName) would produce (e.g. "foo" matched inside "foobar" error).
      const failedContainerNames = new Set(errors.map((e) => e.split(": ")[0]))
      setSelectedContainers((prev) => prev.filter((name) => failedContainerNames.has(name)))
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
    project_id: projectId,
    format: "json",
  })

  // Fetch account metadata for quota information
  const { data: accountInfo } = trpcReact.storage.swift.getAccountMetadata.useQuery({
    project_id: projectId,
  })

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
      <Stack className="absolute inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading Containers...</Trans>
      </Stack>
    )
  }

  // Handle error state
  if (error) {
    const errorMessage = error.message

    return (
      <Stack className="absolute inset-0" distribution="center" alignment="center" direction="vertical">
        <Trans>Error Loading Containers: {errorMessage}</Trans>
      </Stack>
    )
  }

  // Calculate quota information
  const bytesUsed = accountInfo?.bytesUsed || 0
  const quotaBytes = accountInfo?.quotaBytes || 0
  const remainingBytes = quotaBytes > 0 ? quotaBytes - bytesUsed : 0

  // Resolve selected ContainerSummary objects from the full unfiltered list so
  // the modal always operates on what was actually selected — not the filtered
  // subset currently visible in the table.
  const selectedContainerSummaries = (containers || []).filter((c) => selectedContainers.includes(c.name))
  const hasSelection = selectedContainerSummaries.length > 0
  const selectedCount = selectedContainerSummaries.length

  const totalCount = (containers || []).length
  const filteredCount = filteredContainers.length
  const isFiltered = filteredCount !== totalCount

  // Select-all operates on the currently displayed (filtered + sorted) rows.
  const displayedNames = sortedContainers.map((c) => c.name)
  const allSelected = displayedNames.length > 0 && displayedNames.every((n) => selectedContainers.includes(n))
  const someSelected = displayedNames.some((n) => selectedContainers.includes(n))

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedContainers((prev) => prev.filter((n) => !displayedNames.includes(n)))
    } else {
      setSelectedContainers((prev) => [...new Set([...prev, ...displayedNames])])
    }
  }

  return (
    <div className="relative">
      <Stack direction="vertical">
        {/* Zone 1 — sort controls left, create button right (no background) */}
        <Stack distribution="end" alignment="center" gap="2" className="pb-2">
          <Stack gap="0.5" alignment="center">
            <SortInput
              options={sortSettings.options}
              sortBy={sortSettings.sortBy}
              sortDirection={sortSettings.sortDirection ?? "asc"}
              onSortByChange={(v) =>
                handleSortChange({ ...sortSettings, sortBy: v, sortDirection: sortSettings.sortDirection })
              }
              onSortDirectionChange={(dir) => handleSortChange({ ...sortSettings, sortDirection: dir })}
            />
          </Stack>
          <Button variant="primary" className="whitespace-nowrap" onClick={() => setCreateModalOpen(true)}>
            <Trans>Create Container</Trans>
          </Button>
        </Stack>

        {/* Zone 2 — search (+ filter pills). DataGridToolbar provides the background.
            Swift containers expose no filterable dimensions yet, so there is no
            FiltersInput / SelectedFilters here. When filter dimensions are added,
            place FiltersInput on the left (switch the inner Stack to
            distribution="between") and render SelectedFilters below, using
            applyFilterSelection from urlHelpers for merge logic. */}
        <DataGridToolbar>
          <Stack direction="vertical" gap="2">
            <Stack distribution="end" alignment="center">
              <SearchInput
                placeholder={t`Search containers...`}
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
          </Stack>
        </DataGridToolbar>

        {/* Zone 3 — bulk actions (gated) on the left, container/quota info on the right.
            Unlike the Images reference (where Zone 3 carries only bulk actions and is
            omitted entirely without permissions), this bar also hosts the Swift-specific
            count + remaining-quota + limits info, which must always be visible. So the
            bar always renders; only the left-hand bulk controls are gated. */}
        <DataGridToolbar>
          <Stack distribution="start" gap="2" alignment="center" className="text-sm">
            {hasAnyBulkAction ? (
              <Stack gap="2" alignment="center">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={handleToggleSelectAll}
                />
                <PopupMenu className="flex items-center">
                  <PopupMenuToggle as="div">
                    <Button size="small" icon="moreVert" label={t`Actions`} />
                  </PopupMenuToggle>
                  <PopupMenuOptions>
                    <PopupMenuItem
                      disabled={!hasSelection}
                      label={hasSelection ? t`Empty Selected (${selectedCount})` : t`Empty Selected`}
                      onClick={() => setEmptyAllModalOpen(true)}
                    />
                  </PopupMenuOptions>
                </PopupMenu>
              </Stack>
            ) : (
              <span />
            )}

            <div className="text-theme-light flex items-center gap-1" data-testid="containers-info-block">
              {isFiltered ? (
                <Plural
                  value={filteredCount}
                  one={`${filteredCount} of ${totalCount} container`}
                  other={`${filteredCount} of ${totalCount} containers`}
                />
              ) : (
                <Plural value={totalCount} one={`${totalCount} container`} other={`${totalCount} containers`} />
              )}
              {quotaBytes > 0 && (
                <>
                  <span>,</span>
                  <span>
                    <Trans>Remaining Quota:</Trans>{" "}
                    <span className="text-theme-default font-semibold">{formatBytesBinary(remainingBytes)}</span>
                  </span>
                </>
              )}
              <ContainerLimitsTooltip serviceInfo={serviceInfo} accountInfo={accountInfo} />
            </div>
          </Stack>
        </DataGridToolbar>
      </Stack>

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
        hasAnyBulkAction={hasAnyBulkAction}
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
