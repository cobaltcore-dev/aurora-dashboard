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
  PopupMenu,
  PopupMenuItem,
  PopupMenuOptions,
  PopupMenuToggle,
  TabNavigation,
  TabNavigationItem,
} from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { SortInput } from "@/client/components/ListToolbar/SortInput"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { CreateFolderModal } from "./CreateFolderModal"
import { EnableVersioningModal } from "../Buckets/EnableVersioningModal"
import { SuspendVersioningModal } from "../Buckets/SuspendVersioningModal"
import { BucketPolicyModal } from "../Buckets/BucketPolicyModal"
import { DeleteBucketPolicyModal } from "../Buckets/DeleteBucketPolicyModal"
import { EmptyBucketModal } from "../Buckets/EmptyBucketModal"
import { DeleteBucketModal } from "../Buckets/DeleteBucketModal"
import { useNavigate } from "@tanstack/react-router"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects"
import type { S3Object, S3FolderPrefix, S3ObjectVersion } from "@/server/Storage/types/ceph"
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
  const { provider, storageType } = Route.useParams()
  const { prefix: encodedPrefix, sortBy, sortDirection, search: searchParam = "", tab = "all" } = Route.useSearch()
  const currentPrefix = decodePrefix(encodedPrefix)

  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined)
  const [allObjects, setAllObjects] = useState<S3Object[]>([])
  const [allFolders, setAllFolders] = useState<S3FolderPrefix[]>([])
  const [allVersions, setAllVersions] = useState<S3ObjectVersion[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false)
  const [isEnableVersioningModalOpen, setIsEnableVersioningModalOpen] = useState(false)
  const [isSuspendVersioningModalOpen, setIsSuspendVersioningModalOpen] = useState(false)
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [isDeletePolicyModalOpen, setIsDeletePolicyModalOpen] = useState(false)
  const [isEmptyBucketModalOpen, setIsEmptyBucketModalOpen] = useState(false)
  const [isDeleteBucketModalOpen, setIsDeleteBucketModalOpen] = useState(false)
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

  // Reset accumulated data when tab changes (switching between All/Deleted views)
  useEffect(() => {
    setContinuationToken(undefined)
    setAllObjects([])
    setAllFolders([])
    setAllVersions([])
  }, [tab])

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

  // Query bucket policy status
  const { data: policyData } = trpcReact.storage.ceph.bucketPolicy.get.useQuery(
    {
      project_id: projectId ?? "",
      bucketName,
    },
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: false,
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

        if (continuationToken) {
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
  }, [data, continuationToken, currentPrefix, tab])

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

  const navigateToBuckets = () => {
    // Reset pagination/accumulated state before leaving the bucket
    setContinuationToken(undefined)
    setAllObjects([])
    setAllFolders([])
    setHasMore(false)

    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId, provider, storageType },
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

  // When showing deleted files: show the last real version before delete marker (the version we can restore)
  const deletedFilesList = (() => {
    if (tab !== "deleted") return []

    // Group versions by key
    const versionsByKey = allVersions.reduce((acc: Record<string, S3ObjectVersion[]>, version: S3ObjectVersion) => {
      if (!acc[version.key]) acc[version.key] = []
      acc[version.key].push(version)
      return acc
    }, {})

    const deletedFiles: Array<S3ObjectVersion & { isDeleted?: boolean }> = []
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
          deletedFiles.push({
            ...previousVersion,
            isDeleted: true, // Custom flag to show "Deleted" badge
          })
        }
      }
    })

    // Apply search filter
    return deletedFiles.filter((v) => stripPrefix(v.key).toLowerCase().includes(searchParam.toLowerCase().trim()))
  })()

  const totalItemCount =
    tab === "deleted" ? deletedFilesList.length + allFolders.length : allObjects.length + allFolders.length
  const filteredItemCount =
    tab === "deleted"
      ? deletedFilesList.length + filteredFolders.length
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
      {/* Versioning and Policy status badges */}
      <div className="mb-4 flex items-center gap-3">
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
        {policyData?.policy && (
          <Badge variant="info">
            <Trans>Policy</Trans>
          </Badge>
        )}
      </div>

      <ObjectsFileNavigation
        bucketName={bucketName}
        prefix={currentPrefix}
        onBucketsClick={navigateToBuckets}
        onPrefixClick={navigateToPrefix}
      />

      <Stack direction="vertical">
        {/* Tabs row (shown only when versioning is enabled/suspended) */}
        {versioningStatus && versioningStatus.status !== "Unversioned" && (
          <div className="pb-2">
            <TabNavigation>
              <TabNavigationItem
                label={t`All`}
                active={tab === "all"}
                onClick={() => {
                  navigate({
                    search: (prev) => ({ ...prev, tab: "all" }),
                  })
                }}
              />
              <TabNavigationItem
                label={t`Deleted`}
                active={tab === "deleted"}
                onClick={() => {
                  navigate({
                    search: (prev) => ({ ...prev, tab: "deleted" }),
                  })
                }}
              />
            </TabNavigation>
          </div>
        )}

        {/* Zone 1 — sort controls and page-level actions */}
        <Stack distribution="between" alignment="center" gap="2" className="pb-2">
          <Stack gap="0.5" alignment="center">
            <SortInput
              options={sortSettings.options}
              sortBy={sortSettings.sortBy}
              sortDirection={sortSettings.sortDirection ?? "asc"}
              selectClassName="w-40"
              onSortByChange={(value) =>
                handleSortChange({ ...sortSettings, sortBy: value, sortDirection: sortSettings.sortDirection })
              }
              onSortDirectionChange={(direction) => handleSortChange({ ...sortSettings, sortDirection: direction })}
            />
          </Stack>
          <Stack gap="2" alignment="center">
            <Button variant="primary" className="whitespace-nowrap" onClick={() => setIsCreateFolderModalOpen(true)}>
              <Trans>Create Folder</Trans>
            </Button>
            <Button
              variant={policyData?.policy ? "subdued" : "primary"}
              className="whitespace-nowrap"
              onClick={() => setIsPolicyModalOpen(true)}
            >
              {policyData?.policy ? <Trans>View Policy</Trans> : <Trans>Add Policy</Trans>}
            </Button>
            <PopupMenu>
              <PopupMenuToggle as="div">
                <Button icon="moreVert" />
              </PopupMenuToggle>
              <PopupMenuOptions>
                {versioningStatus &&
                  (versioningStatus.status === "Unversioned" || versioningStatus.status === "Suspended") && (
                    <PopupMenuItem label={t`Enable Versioning`} onClick={() => setIsEnableVersioningModalOpen(true)} />
                  )}
                {versioningStatus && versioningStatus.status === "Enabled" && (
                  <PopupMenuItem label={t`Suspend Versioning`} onClick={() => setIsSuspendVersioningModalOpen(true)} />
                )}
                {policyData?.policy && (
                  <PopupMenuItem label={t`Delete Policy`} onClick={() => setIsDeletePolicyModalOpen(true)} />
                )}
                <PopupMenuItem label={t`Empty Bucket`} onClick={() => setIsEmptyBucketModalOpen(true)} />
                <PopupMenuItem label={t`Delete Bucket`} onClick={() => setIsDeleteBucketModalOpen(true)} />
              </PopupMenuOptions>
            </PopupMenu>
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

        {/* Zone 3 — item count. */}
        <DataGridToolbar>
          <Stack distribution="between" gap="2" alignment="center" className="text-sm">
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
        versions={deletedFilesList}
        showingVersions={tab === "deleted"}
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
          setToastData({
            variant: "success",
            children: t`Successfully emptied bucket "${bucketName}". ${deletedCount} objects deleted.`,
          })
        }}
        onError={(bucketName, errorMessage) => {
          setIsEmptyBucketModalOpen(false)
          setToastData({
            variant: "error",
            children: t`Failed to empty bucket "${bucketName}": ${errorMessage}`,
          })
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
          setIsDeleteBucketModalOpen(false)
          setToastData({
            variant: "success",
            children: t`Successfully deleted bucket "${bucketName}".`,
          })
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
          setIsDeleteBucketModalOpen(false)
          setToastData({
            variant: "error",
            children: t`Failed to delete bucket "${bucketName}": ${errorMessage}`,
          })
        }}
      />

      {toastData && <Toast {...toastData} />}
    </div>
  )
}
