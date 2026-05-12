import { useState, useEffect } from "react"
import { Trans } from "@lingui/react/macro"
import { Spinner, Stack, Button } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { ObjectsTableView } from "./ObjectsTableView"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"
import { useSearch, useNavigate } from "@tanstack/react-router"
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

export function ObjectBrowserView({ bucketName }: ObjectBrowserViewProps) {
  const projectId = useProjectId()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const currentPrefix = decodePrefix(search.prefix as string | undefined)
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined)
  const [allObjects, setAllObjects] = useState<S3Object[]>([])
  const [allFolders, setAllFolders] = useState<S3FolderPrefix[]>([])
  const [hasMore, setHasMore] = useState(false)

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
      if (continuationToken) {
        // Append to existing data (pagination)
        setAllObjects((prev) => [...prev, ...data.objects])
        setAllFolders((prev) => [...prev, ...data.folders])
      } else {
        // First load - replace data
        setAllObjects(data.objects)
        setAllFolders(data.folders)
      }
      // Update hasMore state
      setHasMore(data.isTruncated ?? false)
    }
  }, [data, continuationToken])

  const navigateToPrefix = (prefix: string) => {
    // Reset pagination when navigating
    setContinuationToken(undefined)
    setAllObjects([])
    setAllFolders([])
    setHasMore(false)
    navigate({
      to: ".",
      search: { prefix: prefix ? encodePrefix(prefix) : undefined },
    })
  }

  const loadMore = () => {
    if (data?.nextContinuationToken) {
      setContinuationToken(data.nextContinuationToken)
    }
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
    <Stack direction="vertical" gap="4">
      <ObjectsFileNavigation bucketName={bucketName} prefix={currentPrefix} onPrefixClick={navigateToPrefix} />

      <ObjectsTableView
        bucketName={bucketName}
        objects={allObjects}
        folders={allFolders}
        currentPrefix={currentPrefix}
        onFolderClick={navigateToPrefix}
      />

      {hasMore && (
        <Button onClick={loadMore} disabled={isLoading} variant="subdued">
          {isLoading ? <Trans>Loading more...</Trans> : <Trans>Load More</Trans>}
        </Button>
      )}
    </Stack>
  )
}
