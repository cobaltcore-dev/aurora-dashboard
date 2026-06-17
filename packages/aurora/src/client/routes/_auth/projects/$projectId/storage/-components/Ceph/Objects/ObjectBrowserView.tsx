import { useState, useEffect, useRef, startTransition } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import {
  Spinner,
  Stack,
  Button,
  Toast,
  ToastProps,
  Badge,
  Message,
  DataGridToolbar,
  SearchInput,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { CreateFolderModal } from "./CreateFolderModal"
import { EnableVersioningModal } from "../Containers/EnableVersioningModal"
import { SuspendVersioningModal } from "../Containers/SuspendVersioningModal"
import { useNavigate } from "@tanstack/react-router"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/containers/$containerName/objects"
import type { S3Object, S3FolderPrefix } from "@/server/Storage/types/ceph"
import {
  getFolderCreatedToast,
  getObjectDeletedToast,
  getObjectDeleteErrorToast,
  getObjectCopiedToast,
  getObjectCopyErrorToast,
  getObjectMovedToast,
  getObjectMoveErrorToast,
  getObjectMetadataUpdatedToast,
  getObjectMetadataUpdateErrorToast,
} from "./ObjectToastNotifications"

// Prefix encoding (reuse from Swift pattern)
const encodePrefix = (prefix: string): string => {
  const bytes = new TextEncoder().encode(prefix)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("")
  return btoa(binString)
}

const decodePrefix = (encoded: string | undefined): string => {
  if (!encoded) return ""
  try {
    const binString = atob(encoded)
    const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!)
    return new TextDecoder().decode(bytes)
  } catch {
    return ""
  }
}

interface ObjectBrowserViewProps {
  bucketName: string
}

type SortKey = "name" | "lastModified" | "size" | "last_modified" | "bytes"

export function ObjectBrowserView({ bucketName }: ObjectBrowserViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const navigate = useNavigate({ from: Route.fullPath })
  const { prefix: encodedPrefix, sortBy, sortDirection, search: searchParam = "" } = Route.useSearch()
  const currentPrefix = decodePrefix(encodedPrefix)

  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined)
  const [allObjects, setAllObjects] = useState<S3Object[]>([])
  const [allFolders, setAllFolders] = useState<S3FolderPrefix[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [isEnableVersioningModalOpen, setIsEnableVersioningModalOpen] = useState(false)
  const [isSuspendVersioningModalOpen, setIsSuspendVersioningModalOpen] = useState(false)
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

  // Query versioning status for current bucket
  const { data: versioningStatus } = trpcReact.storage.ceph.versioning.getStatus.useQuery(
    {
      project_id: projectId ?? "",
      bucket: bucketName,
    },
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  const { data, isLoading, error } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: bucketName,
      prefix: currentPrefix || undefined,
      delimiter: "/",
      maxKeys: 1000,
      continuationToken,
    },
    {
      enabled: !!projectId,
    }
  )

  // Update accumulated data when new data arrives
  useEffect(() => {
    if (data) {
      // Filter out the folder marker itself (object key === current prefix)
      // When inside "first/", S3 returns "first/" as an object - we don't want to show it
      const actualObjects = data.objects.filter((obj) => {
        const stripped = currentPrefix ? obj.key.replace(currentPrefix, "") : obj.key
        // Skip if stripped is empty (the folder marker itself) or just "/"
        return stripped !== "" && stripped !== "/"
      })

      if (continuationToken) {
        // Append to existing data (pagination)
        setAllObjects((prev) => [...prev, ...actualObjects])
        setAllFolders((prev) => [...prev, ...data.folders])
      } else {
        // First load - replace data
        setAllObjects(actualObjects)
        setAllFolders(data.folders)
      }
      // Update hasMore state
      setHasMore(data.isTruncated ?? false)
    }
  }, [data, continuationToken, currentPrefix])

  const navigateToPrefix = (prefix: string) => {
    // Reset pagination when navigating
    setContinuationToken(undefined)
    setAllObjects([])
    setAllFolders([])
    setHasMore(false)
    navigate({
      search: (prev) => ({
        ...prev,
        prefix: prefix ? encodePrefix(prefix) : undefined,
      }),
    })
  }

  const loadMore = () => {
    if (data?.nextContinuationToken) {
      setContinuationToken(data.nextContinuationToken)
    }
  }

  // Filter by search term
  const stripPrefix = (fullKey: string) => (currentPrefix ? fullKey.replace(currentPrefix, "") : fullKey)

  const filteredObjects = allObjects.filter((obj) =>
    stripPrefix(obj.key).toLowerCase().includes(searchParam.toLowerCase().trim())
  )

  const filteredFolders = allFolders.filter((folder) =>
    stripPrefix(folder.prefix).toLowerCase().includes(searchParam.toLowerCase().trim())
  )

  const totalItemCount = allObjects.length + allFolders.length
  const filteredItemCount = filteredObjects.length + filteredFolders.length

  // Sort
  const sortedObjects = !sortBy
    ? filteredObjects
    : [...filteredObjects].sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case "name":
            comparison = stripPrefix(a.key).localeCompare(stripPrefix(b.key))
            break
          case "lastModified":
          case "last_modified": {
            const aDate = a.lastModified
            const bDate = b.lastModified
            if (!aDate || !bDate) break
            comparison = new Date(aDate).getTime() - new Date(bDate).getTime()
            break
          }
          case "size":
          case "bytes":
            comparison = a.size - b.size
            break
        }
        return sortDirection === "desc" ? -comparison : comparison
      })

  const sortedFolders = !sortBy
    ? filteredFolders
    : [...filteredFolders].sort((a, b) => {
        if (sortBy === "name") {
          return sortDirection === "desc"
            ? stripPrefix(b.prefix).localeCompare(stripPrefix(a.prefix))
            : stripPrefix(a.prefix).localeCompare(stripPrefix(b.prefix))
        }
        return 0
      })

  const sortSettings: SortSettings = {
    options: [
      { label: t`Name`, value: "name" },
      { label: t`Last Modified`, value: "lastModified" },
      { label: t`Size`, value: "size" },
    ],
    sortBy: sortBy ?? undefined,
    sortDirection: sortDirection ?? "asc",
  }

  const handleSearchChange = (term: string | number | string[] | undefined) => {
    const value = typeof term === "string" ? term : ""
    startTransition(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: value || undefined,
        }),
      })
    })
  }

  const handleSortChange = (newSort: SortSettings) => {
    const resolvedSortBy = newSort.sortBy as SortKey | undefined
    const resolvedDirection = (newSort.sortDirection as "asc" | "desc") || "asc"
    startTransition(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: resolvedSortBy,
          sortDirection: resolvedSortBy ? resolvedDirection : undefined,
        }),
      })
    })
  }

  if (isLoading && !continuationToken) {
    return (
      <Stack className="absolute inset-0" distribution="center" alignment="center" direction="vertical">
        <Spinner variant="primary" size="large" className="mb-2" />
        <Trans>Loading objects...</Trans>
      </Stack>
    )
  }

  if (error) {
    const errorMessage = error.message
    return (
      <Message variant="error" title={t`Failed to load objects`}>
        {errorMessage}
      </Message>
    )
  }

  return (
    <div className="relative">
      {/* Bucket header with versioning status badge */}
      <div className="mb-4 flex items-center justify-between">
        <Stack direction="horizontal" gap="3" alignment="center">
          <h2 className="text-xl font-semibold">{bucketName}</h2>
          {versioningStatus && versioningStatus.status === "Enabled" && (
            <Badge variant="success">
              <Trans>Versioning Enabled</Trans>
            </Badge>
          )}
          {versioningStatus && versioningStatus.status === "Suspended" && (
            <Badge variant="warning">
              <Trans>Versioning Suspended</Trans>
            </Badge>
          )}
        </Stack>
      </div>

      <ObjectsFileNavigation bucketName={bucketName} prefix={currentPrefix} onPrefixClick={navigateToPrefix} />

      <Stack direction="vertical">
        {/* Zone 1 — sort controls and the primary actions (plain Stack, no background) */}
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
          <Button variant="primary" className="whitespace-nowrap" onClick={() => setIsCreateFolderModalOpen(true)}>
            <Trans>Create Folder</Trans>
          </Button>
          {versioningStatus && versioningStatus.status === "Enabled" && (
            <Button
              variant="subdued"
              className="whitespace-nowrap"
              onClick={() => setIsSuspendVersioningModalOpen(true)}
            >
              <Trans>Suspend Versioning</Trans>
            </Button>
          )}
          {versioningStatus &&
            (versioningStatus.status === "Unversioned" || versioningStatus.status === "Suspended") && (
              <Button className="whitespace-nowrap" onClick={() => setIsEnableVersioningModalOpen(true)}>
                <Trans>Enable Versioning</Trans>
              </Button>
            )}
        </Stack>

        {/* Zone 2 — debounced search. DataGridToolbar provides the background. */}
        <DataGridToolbar>
          <Stack direction="vertical" gap="2">
            <Stack distribution="end" alignment="center">
              <SearchInput
                placeholder={t`Search objects...`}
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

        {/* Zone 3 — item count. Ceph objects has no bulk selection/delete, so this
            zone carries only the count (no select-all or Actions menu). */}
        <DataGridToolbar>
          <Stack distribution="start" gap="2" alignment="center" className="text-sm">
            <div className="text-theme-light flex items-center gap-1" data-testid="objects-info-block">
              {searchParam.trim() ? (
                <Plural
                  value={totalItemCount}
                  one={`${filteredItemCount} of ${totalItemCount} item`}
                  other={`${filteredItemCount} of ${totalItemCount} items`}
                />
              ) : (
                <Plural value={totalItemCount} one={`${totalItemCount} item`} other={`${totalItemCount} items`} />
              )}
            </div>
          </Stack>
        </DataGridToolbar>
      </Stack>

      <ObjectsTableView
        bucketName={bucketName}
        objects={sortedObjects}
        folders={sortedFolders}
        currentPrefix={currentPrefix}
        versioningEnabled={versioningStatus?.status === "Enabled"}
        onFolderClick={navigateToPrefix}
        onDeleteObjectSuccess={(objectKey) => {
          setToastData(getObjectDeletedToast(objectKey, { onDismiss: handleToastDismiss }))
        }}
        onDeleteObjectError={(objectKey, errorMessage) => {
          setToastData(getObjectDeleteErrorToast(objectKey, errorMessage, { onDismiss: handleToastDismiss }))
        }}
        onCopyObjectSuccess={(objectKey, targetBucket, targetKey, wasOverwritten) => {
          setToastData(
            getObjectCopiedToast(objectKey, targetBucket, targetKey, { onDismiss: handleToastDismiss }, wasOverwritten)
          )
        }}
        onCopyObjectError={(objectKey, errorMessage) => {
          setToastData(getObjectCopyErrorToast(objectKey, errorMessage, { onDismiss: handleToastDismiss }))
        }}
        onMoveObjectSuccess={(objectKey, targetBucket, targetKey) => {
          setToastData(getObjectMovedToast(objectKey, targetBucket, targetKey, { onDismiss: handleToastDismiss }))
        }}
        onMoveObjectError={(objectKey, errorMessage) => {
          setToastData(getObjectMoveErrorToast(objectKey, errorMessage, { onDismiss: handleToastDismiss }))
        }}
        onEditMetadataSuccess={(objectKey) => {
          setToastData(getObjectMetadataUpdatedToast(objectKey, { onDismiss: handleToastDismiss }))
        }}
        onEditMetadataError={(objectKey, errorMessage) => {
          setToastData(getObjectMetadataUpdateErrorToast(objectKey, errorMessage, { onDismiss: handleToastDismiss }))
        }}
        onRestoreVersion={() => {
          // Version restored successfully - no toast
        }}
        onDeleteVersion={() => {
          // Version deleted successfully - no toast
        }}
      />

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button onClick={loadMore} disabled={isLoading} variant="subdued">
            {isLoading ? <Trans>Loading more...</Trans> : <Trans>Load More</Trans>}
          </Button>
        </div>
      )}

      <CreateFolderModal
        bucketName={bucketName}
        currentPrefix={currentPrefix}
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSuccess={(folderPath) => {
          setIsCreateFolderModalOpen(false)
          setToastData(getFolderCreatedToast(folderPath, { onDismiss: handleToastDismiss }))
          navigateToPrefix(folderPath)
        }}
      />

      <EnableVersioningModal
        isOpen={isEnableVersioningModalOpen}
        bucketName={bucketName}
        onClose={() => setIsEnableVersioningModalOpen(false)}
        onSuccess={() => {
          setIsEnableVersioningModalOpen(false)
        }}
        onError={() => {
          setIsEnableVersioningModalOpen(false)
        }}
      />

      <SuspendVersioningModal
        isOpen={isSuspendVersioningModalOpen}
        bucketName={bucketName}
        onClose={() => setIsSuspendVersioningModalOpen(false)}
        onSuccess={() => {
          setIsSuspendVersioningModalOpen(false)
        }}
        onError={() => {
          setIsSuspendVersioningModalOpen(false)
        }}
      />

      {toastData && <Toast {...toastData} />}
    </div>
  )
}
