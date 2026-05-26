import { useState, useEffect, startTransition } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Spinner, Stack, Button, Toast, ToastProps } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { ListToolbar } from "@/client/components/ListToolbar"
import { SortSettings } from "@/client/components/ListToolbar/types"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { CreateFolderModal } from "./CreateFolderModal"
import { useNavigate } from "@tanstack/react-router"
import { Route } from "@/client/routes/_auth/projects/$projectId/storage/$provider/containers/$containerName/objects"
import type { S3Object, S3FolderPrefix } from "@/server/Storage/types/ceph"

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
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const handleToastDismiss = () => setToastData(null)

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
      <Stack direction="horizontal" gap="2" alignment="center" className="mt-8">
        <Spinner />
        <span className="text-juno-grey-light-1 text-sm">
          <Trans>Loading objects...</Trans>
        </span>
      </Stack>
    )
  }

  if (error) {
    const errorMessage = error.message
    return (
      <p className="text-juno-red mt-4 text-sm">
        <Trans>Failed to load objects: {errorMessage}</Trans>
      </p>
    )
  }

  return (
    <div className="relative">
      <ObjectsFileNavigation bucketName={bucketName} prefix={currentPrefix} onPrefixClick={navigateToPrefix} />

      <ListToolbar
        sortSettings={sortSettings}
        searchTerm={searchParam}
        onSort={handleSortChange}
        onSearch={handleSearchChange}
        actions={
          <Stack direction="horizontal" gap="2">
            <Button variant="primary" onClick={() => setIsCreateFolderModalOpen(true)}>
              <Trans>Create Folder</Trans>
            </Button>
          </Stack>
        }
      />

      <ObjectsTableView
        bucketName={bucketName}
        objects={sortedObjects}
        folders={sortedFolders}
        currentPrefix={currentPrefix}
        onFolderClick={navigateToPrefix}
        onDeleteObjectSuccess={(objectKey) => {
          setToastData({
            variant: "success",
            text: `Deleted ${objectKey}`,
            onDismiss: handleToastDismiss,
          })
        }}
        onDeleteObjectError={(objectKey, errorMessage) => {
          setToastData({
            variant: "error",
            text: `Failed to delete ${objectKey}: ${errorMessage}`,
            onDismiss: handleToastDismiss,
          })
        }}
        onCopyObjectSuccess={(objectKey, targetBucket, targetKey) => {
          setToastData({
            variant: "success",
            text: `Copied ${objectKey} to ${targetBucket}/${targetKey}`,
            onDismiss: handleToastDismiss,
          })
        }}
        onCopyObjectError={(objectKey, errorMessage) => {
          setToastData({
            variant: "error",
            text: `Failed to copy ${objectKey}: ${errorMessage}`,
            onDismiss: handleToastDismiss,
          })
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
          setToastData({
            variant: "success",
            text: `Folder created: ${folderPath}`,
            onDismiss: handleToastDismiss,
          })
          navigateToPrefix(folderPath)
        }}
      />

      {toastData && <Toast {...toastData} />}
    </div>
  )
}
