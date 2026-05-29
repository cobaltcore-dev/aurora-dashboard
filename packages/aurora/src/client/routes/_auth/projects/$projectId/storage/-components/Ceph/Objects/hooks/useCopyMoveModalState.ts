import { useState, useCallback } from "react"
import { useObjectBrowser } from "./useObjectBrowser"
import { useBucketSearch } from "./useBucketSearch"
import { useLocalFolders } from "./useLocalFolders"

interface BrowserRow {
  kind: "folder" | "object"
  name: string
  displayName: string
}

interface UseCopyMoveModalStateParams {
  initialBucket: string
  allBuckets: Array<{ name: string }>
  existingRows: BrowserRow[]
}

/**
 * Consolidated state management for Copy/Move modals
 * Combines browser navigation, bucket search, and local folder management
 */
export const useCopyMoveModalState = ({ initialBucket, allBuckets, existingRows }: UseCopyMoveModalStateParams) => {
  const localFoldersState = useLocalFolders()

  const browserState = useObjectBrowser(existingRows, (path) => {
    // When folder is created in browser, add to local folders
    localFoldersState.addFolder(targetBucket, path)
  })

  const bucketSearchState = useBucketSearch(allBuckets)

  // Target bucket state (not extracted to separate hook since it's simple)
  const [targetBucket, setTargetBucket] = useState(initialBucket)

  const handleBucketChange = useCallback(
    (bucket: string) => {
      setTargetBucket(bucket)
      browserState.reset()
      localFoldersState.clearForBucket(bucket)
    },
    [browserState, localFoldersState]
  )

  const resetAll = useCallback(() => {
    setTargetBucket(initialBucket)
    browserState.reset()
    bucketSearchState.reset()
    localFoldersState.reset()
  }, [initialBucket, browserState, bucketSearchState, localFoldersState])

  return {
    // Target bucket
    targetBucket,
    setTargetBucket: handleBucketChange,

    // Browser state
    ...browserState,

    // Bucket search
    ...bucketSearchState,

    // Local folders
    ...localFoldersState,

    // Reset all
    resetAll,
  }
}
