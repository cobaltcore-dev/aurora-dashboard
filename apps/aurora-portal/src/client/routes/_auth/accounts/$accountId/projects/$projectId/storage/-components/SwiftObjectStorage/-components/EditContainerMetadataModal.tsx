import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  TextInput,
  Stack,
  Message,
  Spinner,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Button,
  Checkbox,
  Badge,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"

// ── Reserved metadata keys that are exposed as dedicated fields ──────────────
const RESERVED_META_KEYS = new Set([
  "quota-bytes",
  "quota-count",
  "web-index",
  "web-listings",
  "web-listings-css",
  "web-error",
])

interface MetadataEntry {
  key: string
  value: string
  isNew?: boolean
  isEditing?: boolean
  originalKey?: string
  originalValue?: string
}

interface EditContainerMetadataModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const EditContainerMetadataModal = ({
  isOpen,
  container,
  onClose,
  onSuccess,
  onError,
}: EditContainerMetadataModalProps) => {
  const { t } = useLingui()

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: info, isLoading } = trpcReact.storage.swift.getContainerMetadata.useQuery(
    { container: container?.name ?? "" },
    { enabled: isOpen && container !== null }
  )

  const utils = trpcReact.useUtils()

  // ── Form state ────────────────────────────────────────────────────────────
  // Quota fields
  const [quotaBytes, setQuotaBytes] = useState("")
  const [quotaBytesError, setQuotaBytesError] = useState<string | null>(null)
  const [quotaCount, setQuotaCount] = useState("")
  const [quotaCountError, setQuotaCountError] = useState<string | null>(null)

  // Versioning
  const [versionsEnabled, setVersionsEnabled] = useState(false)

  // Custom metadata
  const [metadata, setMetadata] = useState<MetadataEntry[]>([])
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newKeyError, setNewKeyError] = useState<string | null>(null)
  const [newValueError, setNewValueError] = useState<string | null>(null)

  // ── Populate form when data arrives ──────────────────────────────────────
  useEffect(() => {
    if (!info) return

    setQuotaBytes(info.quotaBytes != null ? String(info.quotaBytes) : "")
    setQuotaCount(info.quotaCount != null ? String(info.quotaCount) : "")
    setVersionsEnabled(!!(info.versionsEnabled || info.versionsLocation || info.historyLocation))

    // Custom metadata — exclude reserved keys
    const rawMeta = info.metadata ?? {}
    const entries: MetadataEntry[] = Object.entries(rawMeta)
      .filter(([key]) => !RESERVED_META_KEYS.has(key))
      .map(([key, value]) => ({
        key,
        value,
        isNew: false,
        isEditing: false,
        originalKey: key,
        originalValue: value,
      }))
    setMetadata(entries)
  }, [info])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setQuotaBytes("")
    setQuotaBytesError(null)
    setQuotaCount("")
    setQuotaCountError(null)
    setVersionsEnabled(false)
    setMetadata([])
    setMetaErrors({})
    setIsAddingNew(false)
    setNewKey("")
    setNewValue("")
    setNewKeyError(null)
    setNewValueError(null)
    updateMutation.reset()
  }

  // ── Mutation ──────────────────────────────────────────────────────────────
  const updateMutation = trpcReact.storage.swift.updateContainerMetadata.useMutation({
    onSuccess: () => {
      utils.storage.swift.getContainerMetadata.invalidate({ container: container!.name })
      utils.storage.swift.listContainers.invalidate()
      onSuccess?.(container!.name)
      handleClose()
    },
    onError: (error) => {
      onError?.(container!.name, error.message)
    },
  })

  // ── Validation ────────────────────────────────────────────────────────────
  const validateQuotas = (): boolean => {
    let valid = true
    if (quotaBytes !== "" && (isNaN(Number(quotaBytes)) || Number(quotaBytes) < 0)) {
      setQuotaBytesError(t`Must be a non-negative integer`)
      valid = false
    } else {
      setQuotaBytesError(null)
    }
    if (quotaCount !== "" && (isNaN(Number(quotaCount)) || Number(quotaCount) < 0)) {
      setQuotaCountError(t`Must be a non-negative integer`)
      valid = false
    } else {
      setQuotaCountError(null)
    }
    return valid
  }

  const validateMetaKey = (key: string, originalKey?: string): string | null => {
    if (!key.trim()) return t`Key is required`
    if (RESERVED_META_KEYS.has(key.toLowerCase())) return t`This key is reserved and managed separately`
    const isDuplicate = metadata.some((e) => e.key.toLowerCase() === key.toLowerCase() && e.originalKey !== originalKey)
    if (isDuplicate) return t`A property with this key already exists`
    return null
  }

  // ── Metadata row handlers ─────────────────────────────────────────────────
  const handleAddNew = () => {
    const keyErr = validateMetaKey(newKey)
    if (keyErr) {
      setNewKeyError(keyErr)
      return
    }
    if (!newValue.trim()) {
      setNewValueError(t`Value is required`)
      return
    }

    setMetadata([...metadata, { key: newKey.trim(), value: newValue.trim(), isNew: true, isEditing: false }])
    setNewKey("")
    setNewValue("")
    setIsAddingNew(false)
    setNewKeyError(null)
    setNewValueError(null)
  }

  const handleCancelAdd = () => {
    setNewKey("")
    setNewValue("")
    setIsAddingNew(false)
    setNewKeyError(null)
    setNewValueError(null)
  }

  const handleEdit = (index: number) => {
    setMetadata(metadata.map((e, i) => (i === index ? { ...e, isEditing: true } : { ...e, isEditing: false })))
    setIsAddingNew(false)
  }

  const handleSaveEdit = (index: number) => {
    const entry = metadata[index]
    const keyErr = validateMetaKey(entry.key, entry.originalKey)
    if (keyErr) {
      setMetaErrors({ [`edit-${index}`]: keyErr })
      return
    }
    if (!entry.value.trim()) {
      setMetaErrors({ [`edit-${index}`]: t`Value is required` })
      return
    }

    setMetadata(
      metadata.map((e, i) => (i === index ? { ...e, isEditing: false, key: e.key.trim(), value: e.value.trim() } : e))
    )
    setMetaErrors({})
  }

  const handleCancelEdit = (index: number) => {
    setMetadata(
      metadata.map((e, i) =>
        i === index ? { ...e, isEditing: false, key: e.originalKey ?? e.key, value: e.originalValue ?? e.value } : e
      )
    )
    setMetaErrors({})
  }

  const handleDeleteMeta = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index))
    setMetaErrors({})
  }

  const handleKeyChange = (index: number, value: string) => {
    setMetadata(metadata.map((e, i) => (i === index ? { ...e, key: value } : e)))
    setMetaErrors((prev) => {
      const n = { ...prev }
      delete n[`edit-${index}`]
      return n
    })
  }

  const handleValueChange = (index: number, value: string) => {
    setMetadata(metadata.map((e, i) => (i === index ? { ...e, value } : e)))
    setMetaErrors((prev) => {
      const n = { ...prev }
      delete n[`edit-${index}`]
      return n
    })
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!container) return
    if (!validateQuotas()) return

    const rawMeta = info?.metadata ?? {}

    // Build custom metadata updates/removals
    const metadataToSet: Record<string, string> = {}
    const removeMetadata: string[] = []

    // New or changed entries
    metadata.forEach((entry) => {
      if (entry.isNew || entry.value !== entry.originalValue || entry.key !== entry.originalKey) {
        metadataToSet[entry.key] = entry.value
      }
    })

    // Removed entries — keys that were in original but not in current list
    const originalKeys = Object.keys(rawMeta).filter((k) => !RESERVED_META_KEYS.has(k))
    const currentOriginalKeys = metadata.map((e) => e.originalKey).filter(Boolean) as string[]
    originalKeys.forEach((k) => {
      if (!currentOriginalKeys.includes(k)) removeMetadata.push(k)
    })

    // Determine versioning changes
    const wasVersioned = !!(info?.versionsEnabled || info?.versionsLocation || info?.historyLocation)

    updateMutation.mutate({
      container: container.name,
      metadata: metadataToSet,
      removeMetadata: removeMetadata.length ? removeMetadata : undefined,
      quotaBytes: quotaBytes !== "" ? Number(quotaBytes) : undefined,
      quotaCount: quotaCount !== "" ? Number(quotaCount) : undefined,
      // Versioning: enable via versionsLocation header if toggled on; remove if toggled off
      versionsLocation: versionsEnabled && !wasVersioned ? "versions" : undefined,
      removeVersionsLocation: !versionsEnabled && wasVersioned ? true : undefined,
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen || !container) return null

  const isBusy = isLoading || updateMutation.isPending
  const hasEditing = metadata.some((e) => e.isEditing)

  // ── Render ────────────────────────────────────────────────────────────────
  const displayedQuotaBytes = info?.quotaBytes != null ? `${info.quotaBytes} B` : null

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <Trans>Container:</Trans>
          <span>{container.name}</span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Update container`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isBusy || isAddingNew || hasEditing}
    >
      {isLoading ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-8">
          <Spinner size="small" />
          <Trans>Loading container properties…</Trans>
        </Stack>
      ) : (
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <Stack direction="vertical" gap="6">
            {/* ── Read-only stats ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <TextInput label={t`Object count`} value={String(container.count)} disabled readOnly />
              <TextInput
                label={t`Total size`}
                value={
                  info?.bytesUsed != null
                    ? `${info.bytesUsed.toLocaleString()} B`
                    : `${container.bytes.toLocaleString()} B`
                }
                disabled
                readOnly
              />
            </div>

            {/* ── Quotas ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <TextInput
                  label={t`Object count quota`}
                  value={quotaCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setQuotaCount(e.target.value)
                    if (quotaCountError) setQuotaCountError(null)
                  }}
                  placeholder={t`No limit`}
                  invalid={!!quotaCountError}
                  errortext={quotaCountError ?? undefined}
                  disabled={isBusy}
                />
              </div>
              <div>
                <TextInput
                  label={t`Total size quota`}
                  value={quotaBytes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setQuotaBytes(e.target.value)
                    if (quotaBytesError) setQuotaBytesError(null)
                  }}
                  placeholder={t`No limit`}
                  invalid={!!quotaBytesError}
                  errortext={quotaBytesError ?? undefined}
                  disabled={isBusy}
                  helptext={quotaBytes && displayedQuotaBytes ? displayedQuotaBytes : undefined}
                />
              </div>
            </div>

            {/* ── Static website serving ───────────────────────────────────── */}
            <div>
              <p className="text-theme-default mb-3 text-sm font-semibold">
                <Trans>Static website serving</Trans>
              </p>
              {info?.read !== ".r:*,.rlistings" ? (
                <Message variant="warning">
                  <Trans>Public read access is not enabled.</Trans>
                </Message>
              ) : (
                <Message variant="info">
                  <Trans>
                    Before configuring static website serving, go to <Badge variant="info">Manage Access</Badge> and
                    enable public read access.
                  </Trans>
                </Message>
              )}
            </div>

            {/* ── Object versioning ────────────────────────────────────────── */}
            <div>
              <p className="text-theme-default mb-2 text-sm font-semibold">
                <Trans>Object versioning</Trans>
              </p>
              <Checkbox
                label={t`Store old object versions`}
                checked={versionsEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVersionsEnabled(e.target.checked)}
                disabled={isBusy}
              />
            </div>

            {/* ── Custom Metadata ──────────────────────────────────────────── */}
            <div>
              <Stack direction="horizontal" alignment="center" distribution="between" className="mb-3">
                <p className="text-theme-default text-sm font-semibold">
                  <Trans>Metadata</Trans>
                </p>
                <p className="text-theme-light text-xs">
                  <Trans>Reserved keys: web-index, web-listings, quota-count, quota-bytes</Trans>
                </p>
              </Stack>

              {/* Add Property button */}
              <Stack direction="horizontal" className="jn:bg-theme-background-lvl-1 mb-3 justify-end p-2">
                <Button
                  label={t`Add Property`}
                  onClick={() => setIsAddingNew(true)}
                  variant="primary"
                  icon="addCircle"
                  disabled={isAddingNew || hasEditing || isBusy}
                />
              </Stack>

              <DataGrid columns={3}>
                <DataGridRow>
                  <DataGridHeadCell>
                    <Trans>Key</Trans>
                  </DataGridHeadCell>
                  <DataGridHeadCell>
                    <Trans>Value</Trans>
                  </DataGridHeadCell>
                  <DataGridHeadCell>
                    <Trans>Actions</Trans>
                  </DataGridHeadCell>
                </DataGridRow>

                {/* New row input */}
                {isAddingNew && (
                  <DataGridRow>
                    <DataGridCell>
                      <TextInput
                        value={newKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setNewKey(e.target.value)
                          if (newKeyError) setNewKeyError(null)
                        }}
                        placeholder={t`property_key`}
                        errortext={newKeyError ?? undefined}
                        invalid={!!newKeyError}
                        autoFocus
                      />
                    </DataGridCell>
                    <DataGridCell>
                      <TextInput
                        value={newValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setNewValue(e.target.value)
                          if (newValueError) setNewValueError(null)
                        }}
                        placeholder={t`Value`}
                        errortext={newValueError ?? undefined}
                        invalid={!!newValueError}
                      />
                    </DataGridCell>
                    <DataGridCell>
                      <Stack direction="horizontal" gap="2">
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

                {/* Existing metadata rows */}
                {metadata.map((entry, index) => (
                  <DataGridRow key={`${entry.originalKey ?? entry.key}-${index}`}>
                    <DataGridCell>
                      {entry.isEditing ? (
                        <TextInput
                          value={entry.key}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKeyChange(index, e.target.value)}
                          errortext={metaErrors[`edit-${index}`]}
                          invalid={!!metaErrors[`edit-${index}`]}
                        />
                      ) : (
                        <span className="block max-w-xs truncate font-mono text-sm" title={entry.key}>
                          {entry.key}
                        </span>
                      )}
                    </DataGridCell>
                    <DataGridCell>
                      {entry.isEditing ? (
                        <TextInput
                          value={entry.value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleValueChange(index, e.target.value)
                          }
                        />
                      ) : (
                        <span className="block max-w-md truncate text-sm" title={entry.value}>
                          {entry.value}
                        </span>
                      )}
                    </DataGridCell>
                    <DataGridCell>
                      {entry.isEditing ? (
                        <Stack direction="horizontal" gap="2">
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
                        <Stack direction="horizontal" gap="2">
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

            {/* Mutation error */}
            {updateMutation.isError && (
              <Message variant="danger">
                <Trans>Failed to update container: {updateMutation.error.message}</Trans>
              </Message>
            )}
          </Stack>
        </div>
      )}
    </Modal>
  )
}
