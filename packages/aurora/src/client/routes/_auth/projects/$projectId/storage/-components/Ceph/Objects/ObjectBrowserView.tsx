import { useState, useEffect, useRef, startTransition, useMemo } from "react"
import { Plural, Trans, useLingui } from "@lingui/react/macro"
import { plural } from "@lingui/core/macro"
import {
  Spinner,
  Stack,
  Button,
  toast,
  Message,
  DataGridToolbar,
  SearchInput,
  TabNavigation,
  TabNavigationItem,
  Checkbox,
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useCephPermissions } from "../hooks/useCephPermissions"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { CreateFolderModal } from "./CreateFolderModal"
import { UploadObjectModal } from "./UploadObjectModal"
import { DeleteObjectsModal } from "./DeleteObjectsModal"
import { EnableVersioningModal } from "../Buckets/EnableVersioningModal"
import { SuspendVersioningModal } from "../Buckets/SuspendVersioningModal"
import { BucketPolicyModal } from "../Buckets/BucketPolicyModal"
import { DeleteBucketPolicyModal } from "../Buckets/DeleteBucketPolicyModal"
import { EmptyBucketModal } from "../Buckets/EmptyBucketModal"
import { DeleteBucketModal } from "../Buckets/DeleteBucketModal"
import { DeleteVersionsModal } from "../Buckets/DeleteVersionsModal"
import { useNavigate } from "@tanstack/react-router"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects"
import type { S3Object, S3FolderPrefix, S3ObjectVersion } from "@/server/Storage/types/ceph"
import {
  getFolderCreatedToast,
  getObjectDeletedToast,
  getObjectDeleteErrorToast,
  getObjectsBulkDeletedToast,
  getObjectsBulkDeletePartialToast,
  getObjectsBulkDeleteErrorToast,
  getVersionsBulkDeletedToast,
  getVersionsBulkDeletePartialToast,
  getVersionsBulkDeleteErrorToast,
  getObjectCopiedToast,
  getObjectCopyErrorToast,
  getObjectMovedToast,
  getObjectMoveErrorToast,
  getObjectMetadataUpdatedToast,
  getObjectMetadataUpdateErrorToast,
  getObjectDownloadErrorToast,
  getObjectUploadedToast,
  getObjectUploadCancelledToast,
  getObjectUploadErrorToast,
} from "./ObjectToastNotifications"
import { encodePrefix, decodePrefix } from "../../utils/prefixEncoding"

interface ObjectBrowserViewProps {
  bucketName: string
}

type SortKey = "name" | "lastModified" | "size" | "last_modified" | "bytes"

export function ObjectBrowserView({ bucketName }: ObjectBrowserViewProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { permissions } = useCephPermissions(projectId ?? "")
  const navigate = useNavigate({ from: Route.fullPath })
  const { provider, storageType } = Route.useParams()
  const { prefix: encodedPrefix, sortBy, sortDirection, search: searchParam = "", tab = "all" } = Route.useSearch()
  const currentPrefix = decodePrefix(encodedPrefix)

  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined)
  const [keyMarker, setKeyMarker] = useState<string | undefined>(undefined)
  const [versionIdMarker, setVersionIdMarker] = useState<string | undefined>(undefined)
  const [allObjects, setAllObjects] = useState<S3Object[]>([])
  const [allFolders, setAllFolders] = useState<S3FolderPrefix[]>([])
  const [allVersions, setAllVersions] = useState<S3ObjectVersion[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isEnableVersioningModalOpen, setIsEnableVersioningModalOpen] = useState(false)
  const [isSuspendVersioningModalOpen, setIsSuspendVersioningModalOpen] = useState(false)
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [isDeletePolicyModalOpen, setIsDeletePolicyModalOpen] = useState(false)
  const [isEmptyBucketModalOpen, setIsEmptyBucketModalOpen] = useState(false)
  const [isDeleteBucketModalOpen, setIsDeleteBucketModalOpen] = useState(false)
  const [isDeleteVersionsModalOpen, setIsDeleteVersionsModalOpen] = useState(false)

  const [selectedItems, setSelectedItems] = useState<{ key: string; versionId?: string }[]>([])
  const [isDeleteObjectsModalOpen, setIsDeleteObjectsModalOpen] = useState(false)

  // The bulk action in the "deleted" tab permanently deletes versions/delete markers; in
  // "all" it deletes current objects - these are gated by different permissions.
  const hasAnyBulkAction = tab === "deleted" ? permissions.canDeleteVersion : permissions.canDeleteObject

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

  // Reset accumulated data when tab changes (switching between All/Deleted views)
  useEffect(() => {
    setContinuationToken(undefined)
    setKeyMarker(undefined)
    setVersionIdMarker(undefined)
    setAllObjects([])
    setAllFolders([])
    setAllVersions([])
    setSelectedItems([])
  }, [tab])

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

  // Query to check which folders contain deleted content
  // Need this in both tabs: "deleted" to show deleted folders, "all" to hide deleted folders
  const { data: folderDeletedStatus } = trpcReact.storage.ceph.versioning.checkDeletedContent.useQuery(
    {
      project_id: projectId ?? "",
      bucket: bucketName,
      folders: allFolders.map((f) => f.prefix),
    },
    {
      enabled: !!projectId && versioningStatus?.status === "Enabled" && allFolders.length > 0,
      staleTime: 30 * 1000, // Cache for 30 seconds
    }
  )

  const { data, isLoading, error } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: bucketName,
      prefix: currentPrefix || undefined,
      delimiter: "/",
      maxKeys: 1000,
      continuationToken: tab === "deleted" ? undefined : continuationToken,
      keyMarker: tab === "deleted" ? keyMarker : undefined,
      versionIdMarker: tab === "deleted" ? versionIdMarker : undefined,
      showVersions: tab === "deleted", // Load versions when showing deleted tab
    },
    {
      enabled: !!projectId,
    }
  )

  // Update accumulated data when new data arrives
  useEffect(() => {
    if (data) {
      if (tab === "deleted" && data.versions) {
        // When showing deleted files, use versions array
        const actualVersions = data.versions.filter((ver) => {
          const stripped = currentPrefix ? ver.key.replace(currentPrefix, "") : ver.key
          return stripped !== "" && stripped !== "/"
        })

        // For deleted tab, check keyMarker for pagination (not continuationToken)
        if (keyMarker) {
          setAllVersions((prev) => [...prev, ...actualVersions])
          setAllFolders((prev) => [...prev, ...data.folders])
        } else {
          setAllVersions(actualVersions)
          setAllFolders(data.folders)
        }
      } else {
        // Default: showing current versions only
        const actualObjects = data.objects.filter((obj) => {
          const stripped = currentPrefix ? obj.key.replace(currentPrefix, "") : obj.key
          return stripped !== "" && stripped !== "/"
        })

        if (continuationToken) {
          setAllObjects((prev) => [...prev, ...actualObjects])
          setAllFolders((prev) => [...prev, ...data.folders])
        } else {
          setAllObjects(actualObjects)
          setAllFolders(data.folders)
        }
      }
      setHasMore(data.isTruncated ?? false)
    }
  }, [data, continuationToken, keyMarker, currentPrefix, tab])

  const navigateToPrefix = (prefix: string) => {
    // Reset pagination when navigating
    setContinuationToken(undefined)
    setKeyMarker(undefined)
    setVersionIdMarker(undefined)
    setAllObjects([])
    setAllFolders([])
    setAllVersions([])
    setHasMore(false)
    setSelectedItems([])
    navigate({
      search: (prev) => ({
        ...prev,
        prefix: prefix ? encodePrefix(prefix) : undefined,
      }),
    })
  }

  const navigateToBuckets = () => {
    // Reset pagination/accumulated state before leaving the bucket
    setContinuationToken(undefined)
    setKeyMarker(undefined)
    setVersionIdMarker(undefined)
    setAllObjects([])
    setAllFolders([])
    setAllVersions([])
    setHasMore(false)
    setSelectedItems([])

    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId, provider, storageType },
    })
  }

  const loadMore = () => {
    if (tab === "deleted") {
      // Version pagination uses both keyMarker and versionIdMarker
      if (data?.nextKeyMarker) {
        setKeyMarker(data.nextKeyMarker)
        setVersionIdMarker(data.nextVersionIdMarker)
      }
    } else {
      // Regular pagination uses continuationToken
      if (data?.nextContinuationToken) {
        setContinuationToken(data.nextContinuationToken)
      }
    }
  }

  // Filter by search term
  const stripPrefix = (fullKey: string) => (currentPrefix ? fullKey.replace(currentPrefix, "") : fullKey)

  const filteredObjects = allObjects.filter((obj) =>
    stripPrefix(obj.key).toLowerCase().includes(searchParam.toLowerCase().trim())
  )

  // When showing deleted files: show the last real version before delete marker (the version we can restore)
  const deletedFilesList = (() => {
    if (tab !== "deleted") return []

    // Group versions by key
    const versionsByKey = allVersions.reduce((acc: Record<string, S3ObjectVersion[]>, version: S3ObjectVersion) => {
      if (!acc[version.key]) acc[version.key] = []
      acc[version.key].push(version)
      return acc
    }, {})

    const deletedFiles: Array<
      S3ObjectVersion & { isDeleted?: boolean; deleteMarkerVersionId?: string; allVersionIds?: string[] }
    > = []
    Object.entries(versionsByKey).forEach(([, versions]: [string, S3ObjectVersion[]]) => {
      // Sort by lastModified descending to find latest version
      const sorted = [...versions].sort((a, b) => {
        if (!a.lastModified || !b.lastModified) return 0
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      })
      const latestVersion = sorted.find((v) => v.isLatest) || sorted[0]

      // If latest version is a delete marker, find the previous real version (the one to restore)
      if (latestVersion?.isDeleteMarker) {
        const previousVersion = sorted.find((v) => !v.isDeleteMarker)
        if (previousVersion) {
          // Add a flag to indicate this is a restorable deleted file
          // Store all versionIds for permanent delete (to delete all versions + delete markers)
          const allVersionIds = sorted.map((v) => v.versionId)
          deletedFiles.push({
            ...previousVersion,
            isDeleted: true, // Custom flag to show "Deleted" badge
            deleteMarkerVersionId: latestVersion.versionId, // Store delete marker versionId
            allVersionIds, // Store all version IDs for complete deletion
          })
        }
      }
    })

    return deletedFiles
  })()

  // Filter folders based on deleted content check from BFF
  // Also add isDeleted flag to folders whose marker is deleted
  const deletedFoldersList: Array<
    S3FolderPrefix & { isDeleted?: boolean; deleteMarkerVersionId?: string; folderMarkerVersionId?: string }
  > = (() => {
    if (tab !== "deleted") {
      // In "All" tab, exclude folders that are deleted (have delete marker as latest version)
      // or have no versions at all (permanently deleted)
      if (!folderDeletedStatus || !Array.isArray(folderDeletedStatus)) return allFolders // Show all while loading or if no data

      const filtered = allFolders.filter((folder) => {
        const status = folderDeletedStatus.find((s) => s.prefix === folder.prefix)
        // No status? Show folder (we don't know if it's deleted)
        if (!status) return true
        // Has status? Show only if not deleted AND has versions
        // If folderMarkerVersionId is undefined, the folder has no versions (was permanently deleted)
        return !status.isFolderDeleted && status.folderMarkerVersionId !== undefined
      })

      return filtered
    }

    if (!folderDeletedStatus || !Array.isArray(folderDeletedStatus)) return allFolders // Show all while loading or if no data

    // In "Deleted" tab: Filter folders that have deleted content or are themselves deleted
    const foldersWithDeleted = allFolders
      .filter((folder) => {
        const status = folderDeletedStatus.find((s) => s.prefix === folder.prefix)
        return status?.hasDeletedContent ?? false
      })
      .map((folder) => {
        const status = folderDeletedStatus.find((s) => s.prefix === folder.prefix)
        return {
          ...folder,
          isDeleted: status?.isFolderDeleted ?? false, // Add isDeleted flag for badge
          deleteMarkerVersionId: status?.folderDeleteMarkerVersionId, // Add delete marker versionId for restore
          folderMarkerVersionId: status?.folderMarkerVersionId, // Add folder marker versionId for permanent delete
        }
      })

    return foldersWithDeleted
  })()

  const filteredFolders = deletedFoldersList.filter((folder) =>
    stripPrefix(folder.prefix).toLowerCase().includes(searchParam.toLowerCase().trim())
  )

  // Sort deleted files (operates on full unfiltered list before search)
  const sortedDeletedFiles = !sortBy
    ? deletedFilesList
    : [...deletedFilesList].sort((a, b) => {
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

  // Apply search filter to sorted deleted files (after sorting)
  const filteredDeletedFiles = sortedDeletedFiles.filter((v) =>
    stripPrefix(v.key).toLowerCase().includes(searchParam.toLowerCase().trim())
  )

  const totalItemCount =
    tab === "deleted" ? deletedFilesList.length + deletedFoldersList.length : allObjects.length + allFolders.length
  const filteredItemCount =
    tab === "deleted"
      ? filteredDeletedFiles.length + filteredFolders.length
      : filteredObjects.length + filteredFolders.length

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

  // Bulk selection derived values
  const { i18n } = useLingui()
  const showSelection = hasAnyBulkAction

  // Helper to build a unique identifier for selected items
  const makeItemKey = (key: string, versionId?: string) => `${key}|${versionId ?? ""}`

  // Performance optimization: Build a Map for O(1) version lookup instead of O(n) find()
  const versionIdByKey = useMemo(() => {
    if (tab !== "deleted") return new Map<string, string>()
    return new Map(filteredDeletedFiles.map((v) => [v.key, v.versionId]))
  }, [tab, filteredDeletedFiles])

  // Performance optimization: Build a Set for O(1) membership checks instead of O(m) some()
  const selectedItemsSet = useMemo(() => {
    return new Set(selectedItems.map((item) => makeItemKey(item.key, item.versionId)))
  }, [selectedItems])

  // Tab-specific selection logic
  const selectableKeys = tab === "deleted" ? filteredDeletedFiles.map((v) => v.key) : sortedObjects.map((o) => o.key)

  const isItemSelected = (key: string, versionId?: string) => selectedItemsSet.has(makeItemKey(key, versionId))

  const allSelected =
    selectableKeys.length > 0 &&
    selectableKeys.every((k) => {
      const versionId = tab === "deleted" ? versionIdByKey.get(k) : undefined
      return isItemSelected(k, versionId)
    })

  const someSelected = selectableKeys.some((k) => {
    const versionId = tab === "deleted" ? versionIdByKey.get(k) : undefined
    return isItemSelected(k, versionId)
  })

  const selectedCount = selectedItems.length

  const handleToggleSelectKey = (key: string, versionId?: string) => {
    setSelectedItems((prev) => {
      const exists = prev.some((item) => item.key === key && item.versionId === versionId)
      return exists
        ? prev.filter((item) => !(item.key === key && item.versionId === versionId))
        : [...prev, { key, versionId }]
    })
  }

  const handleToggleSelectAll = () => {
    setSelectedItems((prev) => {
      if (tab === "deleted") {
        const visibleItemKeys = new Set(filteredDeletedFiles.map((v) => makeItemKey(v.key, v.versionId)))
        if (allSelected) {
          // Deselect all visible versions
          return prev.filter((item) => !visibleItemKeys.has(makeItemKey(item.key, item.versionId)))
        } else {
          // Select all visible versions
          const newItems = filteredDeletedFiles.map((v) => ({ key: v.key, versionId: v.versionId }))
          const existingKeys = new Set(prev.map((item) => makeItemKey(item.key, item.versionId)))
          const toAdd = newItems.filter((item) => !existingKeys.has(makeItemKey(item.key, item.versionId)))
          return [...prev, ...toAdd]
        }
      } else {
        // Objects tab: select/deselect without versionId
        if (allSelected) {
          // Deselect all visible objects
          return prev.filter((item) => !selectableKeys.includes(item.key) || item.versionId !== undefined)
        } else {
          // Select all visible objects
          const existingKeys = new Set(prev.filter((item) => !item.versionId).map((item) => item.key))
          const toAdd = selectableKeys
            .filter((key) => !existingKeys.has(key))
            .map((key) => ({ key, versionId: undefined }))
          return [...prev, ...toAdd]
        }
      }
    })
  }

  const resetAccumulatedObjects = () => {
    setContinuationToken(undefined)
    setKeyMarker(undefined)
    setVersionIdMarker(undefined)
    setAllObjects([])
    setAllFolders([])
    setAllVersions([])
    setHasMore(false)
  }

  const handleBulkDeleted = (deletedKeys: string[], errorCount: number) => {
    // The list accumulates pages; a plain invalidate would refetch only the last
    // page and append it. Drop the accumulator so the refetch rebuilds page 1.
    resetAccumulatedObjects()

    // In Deleted tab, clear all selection after bulk delete (list is being refetched anyway)
    // In All tab, only clear successfully deleted items
    if (tab === "deleted") {
      setSelectedItems([])
    } else {
      setSelectedItems((prev) => prev.filter((item) => !deletedKeys.includes(item.key)))
    }

    if (tab === "deleted") {
      // Version deletion toasts
      if (errorCount === 0) {
        const { message, ...options } = getVersionsBulkDeletedToast(deletedKeys.length)
        toast.success(message, options)
      } else {
        const { message, ...options } = getVersionsBulkDeletePartialToast(deletedKeys.length, errorCount)
        toast.warning(message, options)
      }
    } else {
      // Object deletion toasts
      if (errorCount === 0) {
        const { message, ...options } = getObjectsBulkDeletedToast(deletedKeys.length)
        toast.success(message, options)
      } else {
        const { message, ...options } = getObjectsBulkDeletePartialToast(deletedKeys.length, errorCount)
        toast.warning(message, options)
      }
    }
  }

  const handleBulkDeleteError = (errorMessage: string) => {
    if (tab === "deleted") {
      const { message, ...options } = getVersionsBulkDeleteErrorToast(errorMessage)
      toast.error(message, options)
    } else {
      const { message, ...options } = getObjectsBulkDeleteErrorToast(errorMessage)
      toast.error(message, options)
    }
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
      <Stack direction="vertical">
        {/* Zone 1 — sort controls and page-level actions */}
        <Stack distribution="between" alignment="end" gap="2" className="pb-2">
          {/* Tabs row (shown only when versioning is enabled/suspended) */}
          {versioningStatus && versioningStatus.status !== "Unversioned" ? (
            <TabNavigation>
              <TabNavigationItem
                label={t`All`}
                active={tab === "all"}
                onClick={() => {
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      tab: "all",
                      // Reset prefix when switching from deleted to all
                      // because the current folder might not exist in "all" view
                      prefix: tab === "deleted" ? undefined : prev.prefix,
                    }),
                  })
                }}
              />
              <TabNavigationItem
                label={t`Deleted`}
                active={tab === "deleted"}
                onClick={() => {
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      tab: "deleted",
                      // Reset prefix when switching from all to deleted
                      // because the current folder might not exist in "deleted" view
                      prefix: tab === "all" ? undefined : prev.prefix,
                    }),
                  })
                }}
              />
            </TabNavigation>
          ) : (
            <div />
          )}

          <Stack gap="2" alignment="center">
            <Stack gap="0.5" alignment="center">
              <SortInput
                options={sortSettings.options}
                sortBy={sortSettings.sortBy}
                sortDirection={sortSettings.sortDirection ?? "asc"}
                selectClassName="min-w-40"
                onSortByChange={(value) =>
                  handleSortChange({ ...sortSettings, sortBy: value, sortDirection: sortSettings.sortDirection })
                }
                onSortDirectionChange={(direction) => handleSortChange({ ...sortSettings, sortDirection: direction })}
              />
            </Stack>
            <Stack gap="0.5" alignment="center">
              {permissions.canCreateFolder && (
                <PopupMenu className="flex items-center">
                  <PopupMenuToggle as="div">
                    <Button icon="moreVert" title={t`More Actions`} />
                  </PopupMenuToggle>
                  <PopupMenuOptions>
                    <PopupMenuItem
                      label={t`Create Folder`}
                      onClick={() => setIsCreateFolderModalOpen(true)}
                      data-testid="create-folder-action"
                    />
                  </PopupMenuOptions>
                </PopupMenu>
              )}
              {permissions.canCreateObject && (
                <Button variant="primary" className="whitespace-nowrap" onClick={() => setIsUploadModalOpen(true)}>
                  <Trans>Upload Object</Trans>
                </Button>
              )}
            </Stack>
          </Stack>
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

        {/* Zone 3 — breadcrumb navigation in its own row */}
        <DataGridToolbar>
          <ObjectsFileNavigation
            bucketName={bucketName}
            prefix={currentPrefix}
            onBucketsClick={navigateToBuckets}
            onPrefixClick={navigateToPrefix}
          />
        </DataGridToolbar>

        {/* Zone 4 — item count. */}
        <DataGridToolbar>
          <Stack distribution="between" gap="2" alignment="center" className="text-sm">
            {showSelection ? (
              <Stack gap="2" alignment="center">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={handleToggleSelectAll}
                  aria-label={t`Select all objects`}
                  data-testid="select-all-objects"
                />
                <PopupMenu className="flex items-center">
                  <PopupMenuToggle as="div">
                    <Button disabled={selectedCount === 0} size="small" icon="moreVert" label={t`Actions`} />
                  </PopupMenuToggle>
                  {selectedCount > 0 && (
                    <PopupMenuOptions>
                      {tab === "deleted" ? (
                        <PopupMenuItem
                          label={i18n._(plural(selectedCount, { one: "Delete # Version", other: "Delete # Versions" }))}
                          onClick={() => setIsDeleteObjectsModalOpen(true)}
                          data-testid="bulk-delete-versions-action"
                        />
                      ) : (
                        <PopupMenuItem
                          label={i18n._(plural(selectedCount, { one: "Delete # Object", other: "Delete # Objects" }))}
                          onClick={() => setIsDeleteObjectsModalOpen(true)}
                          data-testid="bulk-delete-action"
                        />
                      )}
                    </PopupMenuOptions>
                  )}
                </PopupMenu>
              </Stack>
            ) : (
              <span />
            )}
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

      {isLoading && !continuationToken && !keyMarker ? (
        <Stack className="py-8" distribution="center" alignment="center" direction="vertical">
          <Spinner variant="primary" size="large" className="mb-2" />
          <Trans>Loading objects...</Trans>
        </Stack>
      ) : (
        <ObjectsTableView
          bucketName={bucketName}
          objects={sortedObjects}
          folders={sortedFolders}
          versions={filteredDeletedFiles}
          showingVersions={tab === "deleted"}
          currentPrefix={currentPrefix}
          versioningEnabled={versioningStatus?.status === "Enabled"}
          selectable={showSelection}
          selectedItems={selectedItems}
          onToggleSelectKey={handleToggleSelectKey}
          onFolderClick={navigateToPrefix}
          canCopyObject={permissions.canCopyObject}
          canMoveObject={permissions.canMoveObject}
          canUpdateObject={permissions.canUpdateObject}
          canShareObject={permissions.canShareObject}
          canDeleteObject={permissions.canDeleteObject}
          canDeleteFolder={permissions.canDeleteFolder}
          canDeleteVersion={permissions.canDeleteVersion}
          canRestoreVersion={permissions.canRestoreVersion}
          onDeleteObjectSuccess={(objectKey) => {
            const { message, ...options } = getObjectDeletedToast(objectKey)
            toast.success(message, options)
          }}
          onDeleteObjectError={(objectKey, errorMessage) => {
            const { message, ...options } = getObjectDeleteErrorToast(objectKey, errorMessage)
            toast.error(message, options)
          }}
          onCopyObjectSuccess={(objectKey, targetBucket, targetKey, wasOverwritten) => {
            const { message, ...options } = getObjectCopiedToast(objectKey, targetBucket, targetKey, wasOverwritten)
            toast.success(message, options)
          }}
          onCopyObjectError={(objectKey, errorMessage) => {
            const { message, ...options } = getObjectCopyErrorToast(objectKey, errorMessage)
            toast.error(message, options)
          }}
          onMoveObjectSuccess={(objectKey, targetBucket, targetKey) => {
            const { message, ...options } = getObjectMovedToast(objectKey, targetBucket, targetKey)
            toast.success(message, options)
          }}
          onMoveObjectError={(objectKey, errorMessage) => {
            const { message, ...options } = getObjectMoveErrorToast(objectKey, errorMessage)
            toast.error(message, options)
          }}
          onEditMetadataSuccess={(objectKey) => {
            const { message, ...options } = getObjectMetadataUpdatedToast(objectKey)
            toast.success(message, options)
          }}
          onEditMetadataError={(objectKey, errorMessage) => {
            const { message, ...options } = getObjectMetadataUpdateErrorToast(objectKey, errorMessage)
            toast.error(message, options)
          }}
          onDownloadError={(objectKey, errorMessage) => {
            const { message, ...options } = getObjectDownloadErrorToast(objectKey, errorMessage)
            toast.error(message, options)
          }}
        />
      )}

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
          const { message, ...options } = getFolderCreatedToast(folderPath)
          toast.success(message, options)
        }}
      />

      <UploadObjectModal
        isOpen={isUploadModalOpen}
        bucketName={bucketName}
        projectId={projectId ?? ""}
        currentPrefix={currentPrefix}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(objectName) => {
          setIsUploadModalOpen(false)
          const { message, ...options } = getObjectUploadedToast(objectName)
          toast.success(message, options)
        }}
        onError={(objectName, errorMessage) => {
          const { message, ...options } = getObjectUploadErrorToast(objectName, errorMessage)
          toast.error(message, options)
        }}
        onCancelled={(objectName) => {
          const { message, ...options } = getObjectUploadCancelledToast(objectName)
          toast.warning(message, options)
        }}
      />

      <DeleteObjectsModal
        bucketName={bucketName}
        objectKeys={tab === "deleted" ? [] : selectedItems.filter((item) => !item.versionId).map((item) => item.key)}
        versions={
          tab === "deleted"
            ? selectedItems
                .filter((item) => item.versionId)
                .flatMap((item) => {
                  // Find the deleted file entry to get all version IDs (including delete marker)
                  const deletedFile = filteredDeletedFiles.find((f) => f.key === item.key)
                  if (deletedFile?.allVersionIds) {
                    // Delete ALL versions including delete markers for complete removal
                    return deletedFile.allVersionIds.map((vid) => ({ key: item.key, versionId: vid }))
                  }
                  // Fallback: if allVersionIds not found, delete just the selected version
                  return [{ key: item.key, versionId: item.versionId! }]
                })
            : []
        }
        currentPrefix={currentPrefix}
        versioningEnabled={versioningStatus?.status === "Enabled"}
        isVersionMode={tab === "deleted"}
        isOpen={isDeleteObjectsModalOpen}
        onClose={() => setIsDeleteObjectsModalOpen(false)}
        onDeleted={handleBulkDeleted}
        onError={handleBulkDeleteError}
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

      <BucketPolicyModal
        isOpen={isPolicyModalOpen}
        bucketName={bucketName}
        onClose={() => setIsPolicyModalOpen(false)}
      />

      <DeleteBucketPolicyModal
        isOpen={isDeletePolicyModalOpen}
        bucketName={bucketName}
        onClose={() => setIsDeletePolicyModalOpen(false)}
        onSuccess={() => {
          setIsDeletePolicyModalOpen(false)
        }}
        onError={() => {
          setIsDeletePolicyModalOpen(false)
        }}
      />

      <EmptyBucketModal
        isOpen={isEmptyBucketModalOpen}
        bucket={{
          name: bucketName,
          count: 0, // We don't have these stats in this context
          bytes: 0,
        }}
        onClose={() => setIsEmptyBucketModalOpen(false)}
        onSuccess={(bucketName, deletedCount) => {
          setIsEmptyBucketModalOpen(false)
          toast.success(t`Successfully emptied bucket "${bucketName}". ${deletedCount} objects deleted.`)
        }}
        onError={(bucketName, errorMessage) => {
          setIsEmptyBucketModalOpen(false)
          toast.error(t`Failed to empty bucket "${bucketName}": ${errorMessage}`)
        }}
      />

      <DeleteBucketModal
        isOpen={isDeleteBucketModalOpen}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={() => setIsDeleteBucketModalOpen(false)}
        onSuccess={(bucketName) => {
          toast.success(t`Successfully deleted bucket "${bucketName}".`)
          // Navigate back to buckets list
          navigate({
            to: "/projects/$projectId/storage/$provider/$storageType",
            params: {
              projectId: projectId ?? "",
              provider: (provider as string) ?? "ceph",
              storageType: (storageType as string) ?? "buckets",
            },
          })
        }}
        onError={(bucketName, errorMessage) => {
          toast.error(t`Failed to delete bucket "${bucketName}": ${errorMessage}`)
        }}
      />

      <DeleteVersionsModal
        isOpen={isDeleteVersionsModalOpen}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={() => setIsDeleteVersionsModalOpen(false)}
        onSuccess={(bucketName, deletedCount) => {
          setIsDeleteVersionsModalOpen(false)
          toast.success(
            t`Successfully deleted ${deletedCount} versions and delete markers from bucket "${bucketName}".`
          )
        }}
        onError={(bucketName, errorMessage) => {
          setIsDeleteVersionsModalOpen(false)
          toast.error(t`Failed to delete versions from bucket "${bucketName}": ${errorMessage}`)
        }}
      />
    </div>
  )
}
