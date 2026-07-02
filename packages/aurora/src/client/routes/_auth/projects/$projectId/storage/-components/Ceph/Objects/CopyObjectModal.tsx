import { useState, useRef, useEffect, useCallback } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { Modal, Stack, Spinner, ComboBox, ComboBoxOption, TextInput, Button } from "@cloudoperators/juno-ui-components"
import { MdFolder, MdDescription, MdCreateNewFolder, MdArrowBack } from "react-icons/md"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useCopyMoveModalState } from "./hooks/useCopyMoveModalState"

const MAX_COMBO_OPTIONS = 50

interface CopyObjectModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  objectSize?: number
  onClose: () => void
  onSuccess?: (objectKey: string, targetBucket: string, targetKey: string, wasOverwritten: boolean) => void
  onError?: (objectKey: string, errorMessage: string) => void
}

interface FolderRow {
  kind: "folder"
  name: string
  displayName: string
}

interface ObjectRow {
  kind: "object"
  name: string
  displayName: string
}

type BrowserRow = FolderRow | ObjectRow

export const CopyObjectModal = ({
  isOpen,
  bucketName,
  objectKey,
  objectSize,
  onClose,
  onSuccess,
  onError,
}: CopyObjectModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const submittedKeyRef = useRef("")

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.object.copy",
  })

  const [copyMetadata, setCopyMetadata] = useState(true)
  const [targetExists, setTargetExists] = useState(false)
  const [checkingTarget, setCheckingTarget] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: buckets, isLoading: isLoadingBuckets } = trpcReact.storage.ceph.containers.list.useQuery(
    { project_id: projectId ?? "", includeMetadata: false },
    { enabled: isOpen && !!projectId }
  )

  // Initialize modal state with consolidated hook
  const modalState = useCopyMoveModalState({
    initialBucket: bucketName,
    allBuckets: buckets ?? [],
    existingRows: [], // Will be populated from objectsData
  })

  const { data: objectsData, isLoading: isLoadingObjects } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: modalState.targetBucket,
      prefix: modalState.currentPrefix || undefined,
      delimiter: "/",
      maxKeys: 1000,
    },
    { enabled: isOpen && !!modalState.targetBucket && !!projectId }
  )

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      modalState.resetAll()
    }
  }, [isOpen])

  // ── Build rows from S3 response ───────────────────────────────────────────

  const buildRows = (): BrowserRow[] => {
    if (!objectsData) return []

    const folders: FolderRow[] = objectsData.folders.map((folder) => ({
      kind: "folder" as const,
      name: folder.prefix,
      displayName: modalState.currentPrefix
        ? folder.prefix.replace(modalState.currentPrefix, "").replace(/\/$/, "")
        : folder.prefix.replace(/\/$/, ""),
    }))

    const objects: ObjectRow[] = objectsData.objects
      .filter((obj) => {
        const stripped = modalState.currentPrefix ? obj.key.replace(modalState.currentPrefix, "") : obj.key
        return stripped !== "" && stripped !== "/"
      })
      .map((obj) => ({
        kind: "object" as const,
        name: obj.key,
        displayName: modalState.currentPrefix ? obj.key.replace(modalState.currentPrefix, "") : obj.key,
      }))

    return [...folders, ...objects]
  }

  // ── Rows: merge server data with locally created folders ──────────────────

  const serverRows = buildRows()
  const bucketLocalFolders = modalState.localFolders[modalState.targetBucket] ?? []
  const localFolderRows: BrowserRow[] = bucketLocalFolders
    .filter((fp) => {
      const withoutPrefix = fp.startsWith(modalState.currentPrefix) ? fp.slice(modalState.currentPrefix.length) : null
      if (!withoutPrefix) return false
      const parts = withoutPrefix.split("/").filter(Boolean)
      return parts.length === 1
    })
    .filter((fp) => !serverRows.some((r) => r.name === fp))
    .map((fp) => ({
      kind: "folder" as const,
      name: fp,
      displayName: fp.slice(modalState.currentPrefix.length).replace(/\/$/, ""),
    }))

  const rows: BrowserRow[] = [
    ...serverRows.filter((r) => r.kind === "folder"),
    ...localFolderRows,
    ...serverRows.filter((r) => r.kind === "object"),
  ]

  // ── Copy mutation ─────────────────────────────────────────────────────────

  const copyMutation = trpcReact.storage.ceph.objects.copy.useMutation({
    onSuccess: () => {
      utils.storage.ceph.objects.list.invalidate()
      utils.storage.ceph.containers.list.invalidate()
      const targetKey = `${modalState.currentPrefix}${displayName}`
      onSuccess?.(submittedKeyRef.current, modalState.targetBucket, targetKey, targetExists)
      handleClose()
    },
    onError: (error: { message: string }) => {
      onError?.(submittedKeyRef.current, error.message)
    },
  })

  // ── Check if target object exists ─────────────────────────────────────────

  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey

  const checkTargetExists = useCallback(async () => {
    if (!projectId || !modalState.targetBucket) return

    const targetKey = `${modalState.currentPrefix}${displayName}`

    // Don't check if source and target are the same
    if (modalState.targetBucket === bucketName && targetKey === objectKey) {
      setTargetExists(false)
      return
    }

    setCheckingTarget(true)
    try {
      await utils.storage.ceph.objects.getDetails.fetch({
        project_id: projectId,
        containerName: modalState.targetBucket,
        objectKey: targetKey,
      })
      setTargetExists(true)
    } catch {
      setTargetExists(false)
    } finally {
      setCheckingTarget(false)
    }
  }, [projectId, modalState.targetBucket, modalState.currentPrefix, displayName, bucketName, objectKey, utils])

  useEffect(() => {
    if (isOpen) {
      checkTargetExists()
    }
  }, [isOpen, checkTargetExists])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = () => {
    trackClose()
    copyMutation.reset()
    resetTracking()
    onClose()
  }

  const handleBucketChange = (value?: string | number | string[] | undefined) => {
    const v = Array.isArray(value) ? value[0] : typeof value === "number" ? String(value) : value
    if (v) {
      modalState.setTargetBucket(v)
    }
  }

  // Synchronize targetBucket with searchTerm when it matches an exact bucket name
  useEffect(() => {
    const trimmedSearch = modalState.searchTerm.trim()
    if (trimmedSearch && buckets) {
      const matchingBucket = buckets.find((b) => b.name === trimmedSearch)
      if (matchingBucket && matchingBucket.name !== modalState.targetBucket) {
        modalState.setTargetBucket(matchingBucket.name)
      }
    }
  }, [modalState.searchTerm, buckets, modalState.targetBucket, modalState])

  const handleNewFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") modalState.createFolder()
    if (e.key === "Escape") modalState.cancelCreateFolder()
  }

  const handleCopy = () => {
    if (!projectId) return
    markSubmitted()
    submittedKeyRef.current = objectKey
    const targetKey = `${modalState.currentPrefix}${displayName}`
    copyMutation.mutate({
      project_id: projectId,
      sourceBucket: bucketName,
      sourceKey: objectKey,
      destinationBucket: modalState.targetBucket,
      destinationKey: targetKey,
      copyMetadata,
    })
  }

  // ── Virtualized folder browser ─────────────────────────────────────────────

  const folderRows = rows.filter((r) => r.kind === "folder")
  const objectRows = rows.filter((r) => r.kind === "object")
  const allBrowserRows = [...folderRows, ...objectRows]

  const rowVirtualizer = useVirtualizer({
    count: allBrowserRows.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 32,
    overscan: 5,
  })

  if (!isOpen) return null

  const isPending = copyMutation.isPending
  const isLoading = isLoadingObjects

  const targetPathDisplay = `${modalState.targetBucket}/${modalState.currentPrefix}${displayName}`
  const initialPrefix = objectKey.endsWith(displayName) ? objectKey.slice(0, objectKey.length - displayName.length) : ""
  const isUnchanged = modalState.targetBucket === bucketName && modalState.currentPrefix === initialPrefix

  return (
    <Modal
      title={
        <span className="flex max-w-[500px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Copy object:</Trans>
          </span>
          <span className="truncate" title={displayName}>
            {displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Copying...` : t`Copy`}
      onConfirm={handleCopy}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isPending || isLoadingBuckets || isUnchanged}
    >
      {isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-8">
          <Spinner size="small" />
          <Trans>Copying object...</Trans>
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          {/* Target bucket — ComboBox with debounced search */}
          <ComboBox
            label={t`Target bucket`}
            value={modalState.searchTerm || undefined}
            onChange={handleBucketChange}
            onInputChange={modalState.handleSearchChange}
            placeholder={bucketName}
            helptext={(() => {
              if (isLoadingBuckets) return t`Loading buckets...`
              const bucketsCount = buckets?.length ?? 0
              if (!modalState.searchTerm.trim() && bucketsCount > MAX_COMBO_OPTIONS) {
                return t`There are ${bucketsCount} buckets, start typing to search`
              }
              if (modalState.hiddenCount > 0) {
                const totalBuckets = modalState.visibleBuckets.length + modalState.hiddenCount
                return t`Showing first ${MAX_COMBO_OPTIONS} of ${totalBuckets}, refine your search to narrow results`
              }
              return undefined
            })()}
            disabled={isLoadingBuckets || isPending}
            required
          >
            {!modalState.searchTerm.trim() && (buckets?.length ?? 0) > MAX_COMBO_OPTIONS ? (
              <ComboBoxOption key="__placeholder__" value="" disabled>
                {t`Start typing to search for a bucket`}
              </ComboBoxOption>
            ) : (
              modalState.visibleBuckets.map((b) => (
                <ComboBoxOption key={b.name} value={b.name}>
                  {b.name}
                </ComboBoxOption>
              ))
            )}
          </ComboBox>

          {/* Folder browser */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">
                <Trans>Select destination folder within target bucket</Trans>
              </span>
              <Button
                size="small"
                variant="subdued"
                icon="addCircle"
                onClick={modalState.startCreateFolder}
                disabled={isPending}
                title={t`Create new folder here`}
              >
                <Trans>New Folder</Trans>
              </Button>
            </div>

            {/* Breadcrumb / back navigation */}
            <div className="border-theme-background-lvl-2 bg-theme-background-lvl-1 flex items-center gap-2 border-b px-3 py-2 text-sm">
              {modalState.currentPrefix ? (
                <button
                  type="button"
                  onClick={modalState.navigateUp}
                  className="text-theme-link hover:text-theme-default flex items-center gap-1"
                >
                  <MdArrowBack size={16} />
                  <Trans>Back</Trans>
                </button>
              ) : (
                <span className="text-theme-light">
                  <Trans>Root</Trans>
                </span>
              )}
              {modalState.currentPrefix && (
                <span className="text-theme-light truncate text-xs">/ {modalState.currentPrefix}</span>
              )}
            </div>

            {/* Object browser list */}
            <div ref={listRef} className="border-theme-background-lvl-2 max-h-56 overflow-y-auto rounded-b border">
              {isLoading ? (
                <Stack direction="horizontal" alignment="center" gap="2" className="py-6">
                  <Spinner size="small" />
                  <Trans>Loading...</Trans>
                </Stack>
              ) : allBrowserRows.length === 0 && !modalState.showNewFolderInput ? (
                <div className="text-theme-light px-4 py-6 text-center text-sm">
                  <Trans>This folder is empty, use New Folder to create one.</Trans>
                </div>
              ) : (
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = allBrowserRows[virtualRow.index]
                    const isFolder = row.kind === "folder"
                    return (
                      <div
                        key={row.name}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {isFolder ? (
                          <button
                            type="button"
                            className="hover:bg-theme-background-lvl-2 focus-visible:outline-theme-focus flex w-full items-center gap-2 px-4 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2"
                            onClick={() => modalState.navigateToPrefix(row.name)}
                          >
                            <MdFolder size={16} className="text-theme-light shrink-0" />
                            <span className="truncate">{row.displayName}</span>
                          </button>
                        ) : (
                          <span className="text-theme-light flex items-center gap-2 px-4 py-2 text-sm">
                            <MdDescription size={16} className="shrink-0" />
                            <span className="truncate">{row.displayName}</span>
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Inline new folder input */}
              {modalState.showNewFolderInput && (
                <div className="border-theme-background-lvl-2 border-t px-4 py-3">
                  <Stack direction="vertical" gap="2">
                    <Stack direction="horizontal" gap="2" alignment="center">
                      <MdCreateNewFolder size={16} className="text-theme-light shrink-0" />
                      <TextInput
                        value={modalState.newFolderName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          modalState.setNewFolderName(e.target.value)
                        }
                        onKeyDown={handleNewFolderKeyDown}
                        placeholder={t`new-folder-name`}
                        invalid={!!modalState.newFolderError}
                        errortext={modalState.newFolderError ?? undefined}
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        size="small"
                        variant="primary"
                        onClick={modalState.createFolder}
                        disabled={!modalState.newFolderName.trim()}
                      >
                        <Trans>Create</Trans>
                      </Button>
                      <Button size="small" variant="subdued" onClick={modalState.cancelCreateFolder}>
                        <Trans>Cancel</Trans>
                      </Button>
                    </Stack>
                  </Stack>
                </div>
              )}
            </div>
          </div>

          {/* Source + Target info box */}
          <div className="bg-theme-background-lvl-2 rounded p-3">
            <Stack direction="vertical" gap="2">
              <div>
                <div className="text-theme-light mb-1 text-sm">
                  <Trans>Source</Trans>
                </div>
                <div className="text-sm break-all">{`${bucketName}/${objectKey}`}</div>
                {objectSize !== undefined && (
                  <div className="text-theme-light mt-1 text-xs">{(objectSize / 1024).toFixed(2)} KB</div>
                )}
              </div>
              <div>
                <div className="text-theme-light mb-1 text-sm">
                  <Trans>Target path</Trans>
                </div>
                <div className="text-sm break-all">{targetPathDisplay}</div>
              </div>
            </Stack>
          </div>

          {/* Warning if target exists */}
          {checkingTarget ? (
            <Stack direction="horizontal" alignment="center" gap="2">
              <Spinner size="small" />
              <span className="text-theme-light text-sm">
                <Trans>Checking if object exists...</Trans>
              </span>
            </Stack>
          ) : targetExists ? (
            <p className="text-theme-default">
              <Trans>An object with this name already exists at the destination and will be overwritten.</Trans>
            </p>
          ) : null}

          {/* Copy metadata checkbox */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={copyMetadata}
              onChange={(e) => setCopyMetadata(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">
              <Trans>Copy metadata</Trans>
            </span>
          </label>

          {copyMutation.isError &&
            (() => {
              const errorMessage = copyMutation.error.message
              return (
                <p className="text-theme-error">
                  <Trans>Failed to copy object: {errorMessage}</Trans>
                </p>
              )
            })()}
        </Stack>
      )}
    </Modal>
  )
}
