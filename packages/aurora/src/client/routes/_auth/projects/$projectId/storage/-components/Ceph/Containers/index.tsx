import { useState, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { useNavigate } from "@tanstack/react-router"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { Container } from "@/server/Storage/types/ceph"
import { trpcReact } from "@/client/trpcClient"
import { Button, Spinner, Stack, Toast, ToastProps } from "@cloudoperators/juno-ui-components"
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
  const { t } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })

  // Sort and search state are persisted in the URL so they survive navigation,
  // browser back/forward, and deep links.
  const { sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [emptyAllModalOpen, setEmptyAllModalOpen] = useState(false)
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])
  const [toastData, setToastData] = useState<ToastProps | null>(null)

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
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical">
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

    // Render error with appropriate styling based on error type
    const isAccessDenied = errorMessage.includes("Access denied") || errorMessage.includes("AccessDenied")
    const isAuthError = errorMessage.includes("Invalid access key") || errorMessage.includes("InvalidAccessKeyId")

    return (
      <Stack className="fixed inset-0" distribution="center" alignment="center" direction="vertical" gap="4">
        <div className="max-w-2xl px-4 text-center">
          <h3 className="text-juno-red mb-2 text-lg font-semibold">
            {isAccessDenied ? (
              <Trans>Access Denied</Trans>
            ) : isAuthError ? (
              <Trans>Authentication Failed</Trans>
            ) : (
              <Trans>Error Loading Buckets</Trans>
            )}
          </h3>
          <p className="text-juno-grey-light-1 text-sm">
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
      </Stack>
    )
  }

  // Resolve selected Container objects from the full unfiltered list so
  // the modal always operates on what was actually selected — not the filtered
  // subset currently visible in the table.
  const selectedContainerSummaries = (buckets || []).filter((c) => selectedContainers.includes(c.name))
  const hasSelection = selectedContainerSummaries.length > 0
  const selectedCount = selectedContainerSummaries.length

  return (
    <div className="relative">
      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchParam}
        onSort={handleSortChange}
        onSearch={handleSearchChange}
        actions={
          <Stack direction="horizontal" gap="4" alignment="center">
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              <Trans>Create Bucket</Trans>
            </Button>
            <Button variant="primary-danger" onClick={() => setEmptyAllModalOpen(true)} disabled={!hasSelection}>
              {hasSelection ? <Trans>Empty All ({selectedCount})</Trans> : <Trans>Empty All</Trans>}
            </Button>
          </Stack>
        }
      />

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
