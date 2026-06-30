import { useState, useEffect, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  Modal,
  TextInput,
  Stack,
  Spinner,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Button,
} from "@cloudoperators/juno-ui-components"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { validateMetadataKey } from "./utils/objectValidation"

// ── Types ──────────────────────────────────────────────────────────────────────

interface MetadataEntry {
  uid: number
  key: string
  value: string
  isEditing?: boolean
  originalKey?: string
  originalValue?: string
}

interface EditMetadataModalProps {
  isOpen: boolean
  bucketName: string
  objectKey: string
  onClose: () => void
  onSuccess?: (objectKey: string) => void
  onError?: (objectKey: string, errorMessage: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Calculate metadata size in bytes (header format: "x-amz-meta-key: value\r\n")
const calculateMetadataSize = (entries: MetadataEntry[]): number => {
  let totalBytes = 0
  for (const entry of entries) {
    // Format: "x-amz-meta-{key}: {value}\r\n"
    totalBytes += "x-amz-meta-".length + entry.key.length + 2 + entry.value.length + 2
  }
  return totalBytes
}

const MAX_METADATA_BYTES = 2048 // 2KB limit for S3 user metadata

// ── Component ──────────────────────────────────────────────────────────────────

export const EditMetadataModal = ({
  isOpen,
  bucketName,
  objectKey,
  onClose,
  onSuccess,
  onError,
}: EditMetadataModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  // ── Metadata fetch ─────────────────────────────────────────────────────────
  const {
    data: objectDetails,
    isLoading,
    isError: isMetaError,
    error: metaError,
  } = trpcReact.storage.ceph.objects.getDetails.useQuery(
    { project_id: projectId ?? "", containerName: bucketName, objectKey },
    { enabled: isOpen && !!projectId, refetchOnWindowFocus: false }
  )

  const uidRef = useRef(0)
  const nextUid = () => ++uidRef.current

  // ── Form state ─────────────────────────────────────────────────────────────
  const [metadata, setMetadata] = useState<MetadataEntry[]>([])
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newKeyError, setNewKeyError] = useState<string | null>(null)

  // Track original state for change detection and cancel-edit rollback
  const originalMetadataRef = useRef<MetadataEntry[]>([])

  // Survives reset() inside handleClose() before onSuccess/onError fire
  const objectKeyRef = useRef("")

  // ── Populate form when data arrives ───────────────────────────────────────
  useEffect(() => {
    if (!objectDetails?.metadata) return

    const entries: MetadataEntry[] = Object.entries(objectDetails.metadata).map(([key, value]) => ({
      uid: nextUid(),
      key,
      value,
      isEditing: false,
      originalKey: key,
      originalValue: value,
    }))
    setMetadata(entries)
    originalMetadataRef.current = entries.map((e) => ({ ...e }))
  }, [objectDetails])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  const resetForm = () => {
    setMetadata([])
    setMetaErrors({})
    setIsAddingNew(false)
    setNewKey("")
    setNewValue("")
    setNewKeyError(null)
    updateMutation.reset()
  }

  // ── Change detection ───────────────────────────────────────────────────────
  const hasChanges = (() => {
    if (metadata.length !== originalMetadataRef.current.length) return true
    const originalMetadataByKey = new Map(originalMetadataRef.current.map((entry) => [entry.key, entry.value]))
    return metadata.some((entry) => originalMetadataByKey.get(entry.key) !== entry.value)
  })()

  const hasEditing = metadata.some((e) => e.isEditing)

  // Calculate current metadata size
  const currentMetadataSize = calculateMetadataSize(metadata)
  const isSizeExceeded = currentMetadataSize > MAX_METADATA_BYTES

  // ── Mutation ───────────────────────────────────────────────────────────────
  const updateMutation = trpcReact.storage.ceph.objects.updateMetadata.useMutation({
    onSuccess: () => {
      utils.storage.ceph.objects.getDetails.invalidate({
        project_id: projectId ?? "",
        containerName: bucketName,
        objectKey: objectKeyRef.current,
      })
      utils.storage.ceph.objects.list.invalidate()
      onSuccess?.(objectKeyRef.current)
      handleClose()
    },
    onError: (error) => {
      onError?.(objectKeyRef.current, error.message)
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = () => {
    if (!projectId) return

    if (isSizeExceeded) {
      return
    }

    objectKeyRef.current = objectKey

    // Build metadata record from current entries
    const metadataRecord: Record<string, string> = {}
    for (const entry of metadata) {
      metadataRecord[entry.key] = entry.value
    }

    updateMutation.mutate({
      project_id: projectId,
      containerName: bucketName,
      objectKey,
      metadata: metadataRecord,
    })
  }

  // ── Metadata row handlers ──────────────────────────────────────────────────
  const handleEdit = (index: number) => {
    setMetadata((prev) => prev.map((e, i) => (i === index ? { ...e, isEditing: true } : e)))
  }

  const handleKeyChange = (index: number, value: string) => {
    setMetadata((prev) => prev.map((e, i) => (i === index ? { ...e, key: value } : e)))
    if (metaErrors[`edit-${index}`]) {
      setMetaErrors((prev) => {
        const next = { ...prev }
        delete next[`edit-${index}`]
        return next
      })
    }
  }

  const handleValueChange = (index: number, value: string) => {
    setMetadata((prev) => prev.map((e, i) => (i === index ? { ...e, value } : e)))
  }

  const handleSaveEdit = (index: number) => {
    const entry = metadata[index]
    const error = validateMetadataKey(entry.key)
    if (error) {
      setMetaErrors((prev) => ({ ...prev, [`edit-${index}`]: t(error.message) }))
      return
    }
    const isDuplicate = metadata.some((e, i) => i !== index && e.key.toLowerCase() === entry.key.toLowerCase())
    if (isDuplicate) {
      setMetaErrors((prev) => ({ ...prev, [`edit-${index}`]: t`Key already exists` }))
      return
    }
    setMetadata((prev) => prev.map((e, i) => (i === index ? { ...e, isEditing: false } : e)))
    setMetaErrors((prev) => {
      const next = { ...prev }
      delete next[`edit-${index}`]
      return next
    })
  }

  const handleCancelEdit = (index: number) => {
    const currentEntry = metadata[index]
    // Find original by uid, not by index (which shifts when rows are added/removed)
    const orig = originalMetadataRef.current.find((e) => e.uid === currentEntry.uid)
    if (orig) {
      setMetadata((prev) => prev.map((e, i) => (i === index ? { ...orig, isEditing: false } : e)))
    } else {
      // Newly added row that was put into edit mode — drop it
      setMetadata((prev) => prev.filter((_, i) => i !== index))
    }
    setMetaErrors((prev) => {
      const next = { ...prev }
      delete next[`edit-${index}`]
      return next
    })
  }

  const handleDeleteMeta = (index: number) => {
    setMetadata((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddNew = () => {
    const error = validateMetadataKey(newKey)
    if (error) {
      setNewKeyError(t(error.message))
      return
    }
    const isDuplicate = metadata.some((e) => e.key.toLowerCase() === newKey.trim().toLowerCase())
    if (isDuplicate) {
      setNewKeyError(t`Key already exists`)
      return
    }
    setMetadata((prev) => [...prev, { uid: nextUid(), key: newKey.trim(), value: newValue, isEditing: false }])
    setNewKey("")
    setNewValue("")
    setNewKeyError(null)
    setIsAddingNew(false)
  }

  const handleCancelAdd = () => {
    setNewKey("")
    setNewValue("")
    setNewKeyError(null)
    setIsAddingNew(false)
  }

  if (!isOpen) return null

  const displayName = objectKey.split("/").filter(Boolean).pop() ?? objectKey
  const isPending = updateMutation.isPending
  const isBusy = isPending || isLoading
  const metadataErrorMessage = metaError?.message ?? ""
  const mutationErrorMessage = updateMutation.error?.message ?? ""

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <Trans>
            <span className="shrink-0">Edit metadata:</span>{" "}
            <span className="truncate" title={displayName}>
              {displayName}
            </span>
          </Trans>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Saving...` : t`Update object`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isBusy || !hasChanges || hasEditing || isAddingNew || isSizeExceeded}
    >
      {isLoading ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-8">
          <Spinner size="small" />
          <Trans>Loading object properties...</Trans>
        </Stack>
      ) : isMetaError ? (
        <p className="text-theme-error" role="alert">
          <Trans>Failed to load object metadata: {metadataErrorMessage}</Trans>
        </p>
      ) : (
        <Stack direction="vertical" gap="6">
          {/* Mutation error */}
          {updateMutation.isError && (
            <p className="text-theme-error" role="alert">
              <Trans>Failed to update object: {mutationErrorMessage}</Trans>
            </p>
          )}

          {/* ── Read-only properties ──────────────────────────────────────── */}
          <div>
            <p className="text-theme-default mb-3 text-sm font-semibold">
              <Trans>Object properties</Trans>
            </p>
            <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              <span className="text-theme-light text-right">
                <Trans>Content type</Trans>
              </span>
              <span className="font-mono">{objectDetails?.contentType ?? "—"}</span>

              <span className="text-theme-light text-right">
                <Trans>ETag</Trans>
              </span>
              <span className="font-mono break-all">{objectDetails?.etag ?? "—"}</span>

              <span className="text-theme-light text-right">
                <Trans>Size</Trans>
              </span>
              <span>{objectDetails?.size != null ? formatBytesBinary(objectDetails.size) : "—"}</span>

              <span className="text-theme-light text-right">
                <Trans>Last modified</Trans>
              </span>
              <span>{objectDetails?.lastModified ? formatDate(objectDetails.lastModified) : "—"}</span>
            </div>
          </div>

          {/* ── Custom metadata ───────────────────────────────────────────── */}
          <div>
            <Stack direction="horizontal" alignment="center" distribution="between" className="mb-3">
              <p className="text-theme-default text-sm font-semibold">
                <Trans>Metadata</Trans>
              </p>
              <div className="flex items-center gap-4">
                <p className="text-theme-light text-xs">
                  <Trans>Stored as x-amz-meta-* headers. Keys are case-insensitive.</Trans>
                </p>
                <p
                  className={`font-mono text-xs ${isSizeExceeded ? "text-theme-danger font-semibold" : "text-theme-light"}`}
                >
                  {currentMetadataSize} / {MAX_METADATA_BYTES} bytes
                </p>
              </div>
            </Stack>

            {isSizeExceeded && (
              <p className="text-theme-default mb-3" role="alert">
                <Trans>Metadata size exceeds the 2KB limit. Please remove or shorten some entries before saving.</Trans>
              </p>
            )}

            <Stack direction="horizontal" className="jn:bg-theme-background-lvl-1 justify-end p-2">
              <Button
                label={t`Add Property`}
                onClick={() => setIsAddingNew(true)}
                variant="primary"
                icon="addCircle"
                size="small"
                disabled={isAddingNew || hasEditing || isBusy}
              />
            </Stack>

            <DataGrid columns={3} gridColumnTemplate="minmax(150px, 1fr) minmax(200px, 2fr) 120px">
              <DataGridRow>
                <DataGridHeadCell>
                  <Trans>Key</Trans>
                </DataGridHeadCell>
                <DataGridHeadCell>
                  <Trans>Value</Trans>
                </DataGridHeadCell>
                <DataGridHeadCell className="text-right">
                  <Trans>Actions</Trans>
                </DataGridHeadCell>
              </DataGridRow>

              {/* New row */}
              {isAddingNew && (
                <DataGridRow>
                  <DataGridCell>
                    <TextInput
                      value={newKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setNewKey(e.target.value)
                        if (newKeyError) setNewKeyError(null)
                      }}
                      placeholder={t`property-key`}
                      errortext={newKeyError ?? undefined}
                      invalid={!!newKeyError}
                      autoFocus
                    />
                  </DataGridCell>
                  <DataGridCell>
                    <TextInput
                      value={newValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewValue(e.target.value)}
                      placeholder={t`Value`}
                    />
                  </DataGridCell>
                  <DataGridCell>
                    <Stack direction="horizontal" gap="2" distribution="end" className="whitespace-nowrap">
                      <Button size="small" variant="primary" onClick={handleAddNew} icon="check" title={t`Save`} />
                      <Button
                        size="small"
                        variant="subdued"
                        onClick={handleCancelAdd}
                        icon="close"
                        title={t`Discard`}
                      />
                    </Stack>
                  </DataGridCell>
                </DataGridRow>
              )}

              {/* Existing rows */}
              {metadata.map((entry, index) => (
                <DataGridRow key={entry.uid}>
                  <DataGridCell>
                    {entry.isEditing ? (
                      <TextInput
                        value={entry.key}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKeyChange(index, e.target.value)}
                        errortext={metaErrors[`edit-${index}`]}
                        invalid={!!metaErrors[`edit-${index}`]}
                      />
                    ) : (
                      <span className="block max-w-xs truncate text-sm" title={entry.key}>
                        {entry.key}
                      </span>
                    )}
                  </DataGridCell>
                  <DataGridCell>
                    {entry.isEditing ? (
                      <TextInput
                        value={entry.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleValueChange(index, e.target.value)}
                      />
                    ) : (
                      <span className="block max-w-md truncate text-sm" title={entry.value}>
                        {entry.value}
                      </span>
                    )}
                  </DataGridCell>
                  <DataGridCell>
                    {entry.isEditing ? (
                      <Stack direction="horizontal" gap="2" distribution="end" className="whitespace-nowrap">
                        <Button
                          size="small"
                          variant="primary"
                          onClick={() => handleSaveEdit(index)}
                          icon="check"
                          title={t`Save`}
                        />
                        <Button
                          size="small"
                          variant="subdued"
                          onClick={() => handleCancelEdit(index)}
                          icon="close"
                          title={t`Discard`}
                        />
                      </Stack>
                    ) : (
                      <Stack direction="horizontal" gap="2" distribution="end" className="whitespace-nowrap">
                        <Button
                          size="small"
                          variant="subdued"
                          onClick={() => handleEdit(index)}
                          icon="edit"
                          title={t`Edit`}
                          disabled={isAddingNew || hasEditing || isBusy}
                        />
                        <Button
                          size="small"
                          variant="primary-danger"
                          onClick={() => handleDeleteMeta(index)}
                          icon="deleteForever"
                          title={t`Delete`}
                          disabled={isAddingNew || hasEditing || isBusy}
                        />
                      </Stack>
                    )}
                  </DataGridCell>
                </DataGridRow>
              ))}

              {/* Empty state */}
              {metadata.length === 0 && !isAddingNew && (
                <DataGridRow>
                  <DataGridCell colSpan={3} className="py-6 text-center">
                    <Stack alignment="center">
                      <span className="text-theme-light text-sm">
                        <Trans>No custom metadata. Click "Add Property" to create one.</Trans>
                      </span>
                    </Stack>
                  </DataGridCell>
                </DataGridRow>
              )}
            </DataGrid>
          </div>
        </Stack>
      )}
    </Modal>
  )
}
