import { useState, useRef, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { Modal, Stack, Spinner, ComboBox, ComboBoxOption, TextInput, Button } from "@cloudoperators/juno-ui-components"
import { MdFolder, MdDescription, MdCreateNewFolder, MdArrowBack, MdWarning } from "react-icons/md"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useCopyMoveModalState } from "./hooks/useCopyMoveModalState"
import { validateObjectName } from "./utils/objectValidation"

const MAX_COMBO_OPTIONS = 50

interface MoveObjectModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  objectSize?: number
  onClose: () => void
  onSuccess?: (objectKey: string, targetBucket: string, targetKey: string) => void
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

export const MoveObjectModal = ({
  isOpen,
  bucketName,
  objectKey,
  objectSize,
  onClose,
  onSuccess,
  onError,
}: MoveObjectModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const submittedKeyRef = useRef("")
  const submittedTargetKeyRef = useRef("")
  const submittedTargetBucketRef = useRef("")

  const [newObjectName, setNewObjectName] = useState("")
  const [newObjectNameError, setNewObjectNameError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: buckets, isLoading: isLoadingBuckets } = trpcReact.storage.ceph.containers.list.useQuery(
    { project_id: projectId ?? "", includeMetadata: false },
    { enabled: isOpen && !!projectId }
  )

  const modalState = useCopyMoveModalState({
    initialBucket: bucketName,
    allBuckets: buckets ?? [],
    existingRows: [],
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

  // Initialize object name when modal opens
  useEffect(() => {
    if (isOpen && objectKey) {
      const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
      setNewObjectName(displayName)
      modalState.resetAll()
    }
  }, [isOpen, objectKey])

  useEffect(() => {
    if (!isOpen) {
      setNewObjectName("")
      setNewObjectNameError(null)
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

  // ── Move mutation = copy + delete ─────────────────────────────────────────

  const deleteMutation = trpcReact.storage.ceph.objects.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.objects.list.invalidate()
      // Use captured target values instead of recomputing from mutable state
      onSuccess?.(submittedKeyRef.current, submittedTargetBucketRef.current, submittedTargetKeyRef.current)
    },
    onError: (error: { message: string }) => {
      onError?.(submittedKeyRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  const copyMutation = trpcReact.storage.ceph.objects.copy.useMutation({
    onSuccess: () => {
      deleteMutation.mutate({
        project_id: projectId ?? "",
        containerName: bucketName,
        objectKey,
      })
    },
    onError: (error: { message: string }) => {
      onError?.(submittedKeyRef.current, error.message)
      handleClose()
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = () => {
    copyMutation.reset()
    deleteMutation.reset()
    onClose()
  }

  const handleBucketChange = (value?: string | number | string[] | undefined) => {
    const v = Array.isArray(value) ? value[0] : typeof value === "number" ? String(value) : value
    if (v) {
      modalState.setTargetBucket(v)
    }
  }

  const handleNewFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") modalState.createFolder()
    if (e.key === "Escape") modalState.cancelCreateFolder()
  }

  const handleMove = () => {
    if (!projectId) return

    const error = validateObjectName(newObjectName)
    if (error) {
      setNewObjectNameError(t(error.message))
      return
    }

    const trimmedName = newObjectName.trim()
    const targetKey = `${modalState.currentPrefix}${trimmedName}`

    // Capture immutable values at submit time
    submittedKeyRef.current = objectKey
    submittedTargetKeyRef.current = targetKey
    submittedTargetBucketRef.current = modalState.targetBucket

    copyMutation.mutate({
      project_id: projectId,
      sourceBucket: bucketName,
      sourceKey: objectKey,
      destinationBucket: modalState.targetBucket,
      destinationKey: targetKey,
      copyMetadata: true,
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

  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  const isPending = copyMutation.isPending || deleteMutation.isPending
  const isLoading = isLoadingObjects

  const targetPathDisplay = `${modalState.targetBucket}/${modalState.currentPrefix}${newObjectName.trim() || displayName}`
  const initialPrefix = objectKey.endsWith(displayName) ? objectKey.slice(0, objectKey.length - displayName.length) : ""
  const isUnchanged =
    modalState.targetBucket === bucketName &&
    modalState.currentPrefix === initialPrefix &&
    newObjectName.trim() === displayName

  return (
    <Modal
      title={
        <span className="flex max-w-[500px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Move/Rename object:</Trans>
          </span>
          <span className="truncate font-mono" title={displayName}>
            {displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Moving...` : t`Move`}
      onConfirm={handleMove}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isPending || isLoadingBuckets || isUnchanged}
    >
      {isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-8">
          <Spinner size="small" />
          <Trans>Moving object...</Trans>
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          {/* New object name */}
          <TextInput
            label={t`New object name`}
            value={newObjectName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNewObjectName(e.target.value)
              if (newObjectNameError) setNewObjectNameError(null)
            }}
            invalid={!!newObjectNameError}
            errortext={newObjectNameError ?? undefined}
            helptext={t`You can rename the object by changing the name here.`}
            required
          />

          {/* Warning banner */}
          <div className="text-theme-default flex items-start gap-2">
            <MdWarning size={20} className="shrink-0" />
            <div>
              <strong>
                <Trans>Warning:</Trans>
              </strong>{" "}
              <Trans>This will delete the original object after copying it to the destination.</Trans>
            </div>
          </div>

          {(copyMutation.isError || deleteMutation.isError) &&
            (() => {
              const copyErrorMessage = copyMutation.error?.message ?? ""
              const deleteErrorMessage = deleteMutation.error?.message ?? ""
              return (
                <p className="text-theme-error">
                  {copyMutation.isError ? (
                    <Trans>Failed to move object: {copyErrorMessage}</Trans>
                  ) : (
                    <Trans>Object was copied but could not be deleted from the source: {deleteErrorMessage}</Trans>
                  )}
                </p>
              )
            })()}

          {/* Source object info */}
          <div className="bg-theme-background-lvl-2 rounded p-3">
            <div className="text-theme-light text-sm">
              <Trans>Source:</Trans>
            </div>
            <div className="mt-1 font-mono text-sm">{`${bucketName}/${objectKey}`}</div>
            {objectSize !== undefined && (
              <div className="text-theme-light mt-1 text-xs">{(objectSize / 1024).toFixed(2)} KB</div>
            )}
          </div>

          {/* Target bucket */}
          <ComboBox
            label={t`Target bucket`}
            value={modalState.targetBucket}
            onChange={handleBucketChange}
            onInputChange={modalState.handleSearchChange}
            placeholder={t`Type to search buckets...`}
            helptext={(() => {
              if (isLoadingBuckets) return t`Loading buckets...`
              if (modalState.searchTerm.trim().length === 0) return t`Start typing to search for a bucket`
              if (modalState.hiddenCount > 0) {
                const totalBuckets = modalState.visibleBuckets.length + modalState.hiddenCount
                return t`Showing first ${MAX_COMBO_OPTIONS} of ${totalBuckets} — refine your search to narrow results`
              }
              return undefined
            })()}
            disabled={isLoadingBuckets || isPending}
            required
          >
            {modalState.visibleBuckets.map((b) => (
              <ComboBoxOption key={b.name} value={b.name}>
                {b.name}
              </ComboBoxOption>
            ))}
          </ComboBox>

          {/* Folder browser */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">
                <Trans>Select destination folder</Trans>
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
                <span className="text-theme-light truncate font-mono text-xs">/ {modalState.currentPrefix}</span>
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
                  <Trans>This folder is empty — use New Folder to create one.</Trans>
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

          {/* Target path preview */}
          <TextInput
            label={t`Target path`}
            value={targetPathDisplay}
            readOnly
            className="font-mono"
            helptext={
              isUnchanged
                ? t`Cannot move to the same location. Please select a different bucket, folder, or change the name.`
                : t`The object will be moved to this path. Navigate folders above to change the destination.`
            }
            invalid={isUnchanged}
          />

          {/* Info: metadata is always copied */}
          <p className="text-theme-default">
            <Trans>Object metadata will be automatically copied during the move operation.</Trans>
          </p>
        </Stack>
      )}
    </Modal>
  )
}
