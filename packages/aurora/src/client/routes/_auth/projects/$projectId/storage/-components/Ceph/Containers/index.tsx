import { useState, useEffect, useRef, startTransition } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import { plural } from "@lingui/core/macro"
import { useNavigate } from "@tanstack/react-router"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { Container } from "@/server/Storage/types/ceph"
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
import { ContainerTableView } from "./ContainerTableView"
import {
  getBucketCreatedToast,
  getBucketCreateErrorToast,
  getBucketEmptiedToast,
  getBucketEmptyErrorToast,
  getBucketDeletedToast,
  getBucketDeleteErrorToast,
  getBucketsEmptyCompleteToast,
} from "./ContainerToastNotifications"
import { EmptyBucketsModal } from "./EmptyBucketsModal"
import { CredentialPrompt } from "./CredentialPrompt"
import { useProjectId } from "@/client/hooks/useProjectId"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/containers"

export { ContainerListView } from "./ContainerListView"
export { CredentialPrompt } from "./CredentialPrompt"
export { CreateBucketModal } from "./CreateBucketModal"
export { DeleteBucketModal } from "./DeleteBucketModal"
export { EmptyBucketModal } from "./EmptyBucketModal"
export { EmptyBucketsModal } from "./EmptyBucketsModal"
export * from "./ContainerToastNotifications"

export const CephContainers = () => {
  const { t, i18n } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })

  // Sort and search state are persisted in the URL so they survive navigation,
  // browser back/forward, and deep links.
  const { sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()

  // TODO(perms): wire to a real permission source once CephContainers exposes one.
  // Hardcoded true preserves the current always-on bulk behavior while putting the
  // selection-column gating structure in place.
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

  // Keep the input in sync when the committed search term changes from outside
  // the input — browser back/forward, deep links, or programmatic navigation —
  // so the field never drifts from the URL-backed filter state. When the change
  // originated from our own debounced commit, searchParam already equals
  // localSearchTerm, so this is a no-op and won't disturb the caret.
  useEffect(() => {
    setLocalSearchTerm(searchParam)
  }, [searchParam])

  const handleToastDismiss = () => setToastData(null)

  const handleCreateSuccess = (bucketName: string) => {
    setToastData(getBucketCreatedToast(bucketName, { onDismiss: handleToastDismiss }))
  }

  const handleCreateError = (bucketName: string, errorMessage: string) => {
    setToastData(getBucketCreateErrorToast(bucketName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleEmptySuccess = (bucketName: string, deletedCount: number) => {
    setToastData(getBucketEmptiedToast(bucketName, deletedCount, { onDismiss: handleToastDismiss }))
  }

  const handleEmptyError = (bucketName: string, errorMessage: string) => {
    setToastData(getBucketEmptyErrorToast(bucketName, errorMessage, { onDismiss: handleToastDismiss }))
  }

  const handleDeleteSuccess = (bucketName: string) => {
    setToastData(getBucketDeletedToast(bucketName, { onDismiss: handleToastDismiss }))
  }

  const handleDeleteError = (bucketName: string, errorMessage: string) => {
    setToastData(getBucketDeleteErrorToast(bucketName, errorMessage, { onDismiss: handleToastDismiss }))
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
      // Extract the bucket name from each error string formatted as "<bucketName>: <message>".
      // Using exact name extraction avoids the false-positive substring match that
      // errorMessage.includes(bucketName) would produce (e.g. "foo" matched inside "foobar" error).
      const failedBucketNames = new Set(errors.map((e) => e.split(": ")[0]))
      setSelectedContainers((prev) => prev.filter((name) => failedBucketNames.has(name)))
    }
    setToastData(getBucketsEmptyCompleteToast(emptiedCount, totalDeleted, errors, { onDismiss: handleToastDismiss }))
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

  // Fetch buckets from tRPC
  const {
    data: buckets,
    isLoading,
    error,
  } = trpcReact.storage.ceph.containers.list.useQuery(
    {
      project_id: projectId,
      includeMetadata: true, // Fetch full metadata for table view with sorting
    },
    {
      enabled: !!projectId,
      retry: false, // Don't retry on NO_CEPH_CREDENTIALS error
    }
  )

  // Sort buckets based on sort settings
  const sortContainers = (containers: Container[]): Container[] => {
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
          if (!a.last_modified && !b.last_modified) {
            return 0
          }
          if (!a.last_modified) {
            return 1
          }
          if (!b.last_modified) {
            return -1
          }
          comparison = new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime()
          break
        default:
          comparison = a.name.localeCompare(b.name)
      }

      return (sortDirection ?? "asc") === "desc" ? -comparison : comparison
    })
  }

  // Filter buckets based on search term
  const filteredContainers = (buckets || []).filter((container) =>
    container.name.toLowerCase().includes(searchParam.toLowerCase())
  )

  // Apply sorting to filtered buckets
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
        <Trans>Loading Buckets...</Trans>
      </Stack>
    )
  }

  // Handle error state
  if (error) {
    const errorMessage = error.message

    // Check if this is a NO_CEPH_CREDENTIALS error
    if (errorMessage === "NO_CEPH_CREDENTIALS") {
      return <CredentialPrompt onSuccess={() => window.location.reload()} />
    }

    // Render error message based on error type
    const isAccessDenied = errorMessage.includes("Access denied") || errorMessage.includes("AccessDenied")
    const isAuthError = errorMessage.includes("Invalid access key") || errorMessage.includes("InvalidAccessKeyId")

    return (
      <div className="p-8">
        <p className="text-theme-default text-sm">
          {isAccessDenied ? (
            <Trans>
              Your credentials are valid but you don't have permission to perform this operation. Please contact your
              administrator to grant you the necessary permissions.
            </Trans>
          ) : isAuthError ? (
            <Trans>
              Your S3 credentials are invalid or expired. Please try creating new credentials or contact your
              administrator.
            </Trans>
          ) : (
            <Trans>Failed to load containers: {errorMessage}</Trans>
          )}
        </p>
      </div>
    )
  }

  // Resolve selected Container objects from the full unfiltered list so
  // the modal always operates on what was actually selected — not the filtered
  // subset currently visible in the table.
  const selectedContainerSummaries = (buckets || []).filter((c) => selectedContainers.includes(c.name))
  const hasSelection = selectedContainerSummaries.length > 0
  const selectedCount = selectedContainerSummaries.length
  const totalCount = (buckets || []).length
  const filteredCount = filteredContainers.length

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
        {/* Zone 1 — sort controls and the create action (plain Stack, no background) */}
        <Stack distribution="end" alignment="center" gap="2" className="pb-2">
          <Stack gap="0.5" alignment="center">
            <SortInput
              options={sortSettings.options}
              sortBy={sortSettings.sortBy}
              sortDirection={sortSettings.sortDirection ?? "asc"}
              onSortByChange={(value) =>
                handleSortChange({ ...sortSettings, sortBy: value, sortDirection: sortSettings.sortDirection })
              }
              onSortDirectionChange={(direction) => handleSortChange({ ...sortSettings, sortDirection: direction })}
            />
          </Stack>
          <Button variant="primary" className="whitespace-nowrap" onClick={() => setCreateModalOpen(true)}>
            <Trans>Create Bucket</Trans>
          </Button>
        </Stack>

        {/* Zone 2 — debounced search. DataGridToolbar provides the background.
            Ceph buckets expose no filterable dimensions yet, so there is no
            FiltersInput / SelectedFilters here. When filter dimensions are added,
            add FiltersInput alongside the search (switch the inner Stack to
            distribution="between") and render SelectedFilters below. */}
        <DataGridToolbar>
          <Stack direction="vertical" gap="2">
            <Stack distribution="end" alignment="center">
              <SearchInput
                placeholder={t`Search buckets...`}
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

        {/* Zone 3 — bulk actions (gated) plus the bucket count. The bar also hosts the
            count info, which must always be visible, so it always renders; only the
            bulk controls are gated. */}
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
                    <Button disabled={!hasSelection} size="small" icon="moreVert" label={t`Actions`} />
                  </PopupMenuToggle>
                  {hasSelection && (
                    <PopupMenuOptions>
                      <PopupMenuItem
                        disabled={!hasSelection}
                        label={i18n._(
                          plural(selectedCount, {
                            one: "Empty Bucket",
                            other: "Empty Buckets",
                          })
                        )}
                        onClick={() => setEmptyAllModalOpen(true)}
                      />
                    </PopupMenuOptions>
                  )}
                </PopupMenu>
              </Stack>
            ) : (
              <span />
            )}

            <div className="text-theme-light flex items-center gap-1" data-testid="containers-info-block">
              {searchParam.trim() ? (
                <Plural
                  value={totalCount}
                  one={`${filteredCount} of ${totalCount} bucket`}
                  other={`${filteredCount} of ${totalCount} buckets`}
                />
              ) : (
                <Plural value={totalCount} one={`${totalCount} bucket`} other={`${totalCount} buckets`} />
              )}
            </div>
          </Stack>
        </DataGridToolbar>
      </Stack>

      <ContainerTableView
        containers={sortedContainers}
        createModalOpen={createModalOpen}
        setCreateModalOpen={setCreateModalOpen}
        onCreateSuccess={handleCreateSuccess}
        onCreateError={handleCreateError}
        onEmptySuccess={handleEmptySuccess}
        onEmptyError={handleEmptyError}
        onDeleteSuccess={handleDeleteSuccess}
        onDeleteError={handleDeleteError}
        selectedContainers={selectedContainers}
        setSelectedContainers={setSelectedContainers}
        hasAnyBulkAction={hasAnyBulkAction}
      />

      <EmptyBucketsModal
        isOpen={emptyAllModalOpen}
        buckets={selectedContainerSummaries}
        onClose={() => setEmptyAllModalOpen(false)}
        onComplete={handleEmptyAllComplete}
      />

      {toastData && (
        <Toast {...toastData} className="border-theme-light fixed top-5 right-5 z-50 rounded-lg border shadow-lg" />
      )}
    </div>
  )
}
