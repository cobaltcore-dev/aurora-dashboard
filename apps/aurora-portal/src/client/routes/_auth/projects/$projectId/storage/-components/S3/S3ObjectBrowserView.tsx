import { useState, useEffect } from "react"
import { Trans } from "@lingui/react/macro"
import { Spinner, Stack, Button } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { S3ObjectsTableView } from "./S3ObjectsTableView"
import { S3ObjectsFileNavigation } from "./S3ObjectsFileNavigation"
import { useSearch, useNavigate } from "@tanstack/react-router"
import type { S3Object, S3FolderPrefix } from "@/server/Storage/types/s3"

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

interface S3ObjectBrowserViewProps {
  bucketName: string
}

export function S3ObjectBrowserView({ bucketName }: S3ObjectBrowserViewProps) {
  const projectId = useProjectId()
  const navigate = useNavigate()
  const search = useSearch({ strict: false })
  const currentPrefix = decodePrefix(search.prefix as string | undefined)
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined)
  const [allObjects, setAllObjects] = useState<S3Object[]>([])
  const [allFolders, setAllFolders] = useState<S3FolderPrefix[]>([])

  const { data, isLoading, error } = trpcReact.storage.s3.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      bucketName,
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
    }
  }, [data, continuationToken])

  const navigateToPrefix = (prefix: string) => {
    // Reset pagination when navigating
    setContinuationToken(undefined)
    setAllObjects([])
    setAllFolders([])
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
    return (
      <p className="text-juno-red mt-4 text-sm">
        <Trans>Failed to load objects: {error.message}</Trans>
      </p>
    )
  }

  const hasMore = data?.isTruncated ?? false

  return (
    <Stack direction="vertical" gap="4">
      <S3ObjectsFileNavigation bucketName={bucketName} prefix={currentPrefix} onPrefixClick={navigateToPrefix} />

      <S3ObjectsTableView
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
