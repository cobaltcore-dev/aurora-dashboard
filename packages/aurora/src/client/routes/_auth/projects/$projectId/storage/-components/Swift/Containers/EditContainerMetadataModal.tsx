import React, { useState, useEffect, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  TextInput,
  Stack,
  Status,
  Button,
  Icon,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { useProjectId } from "@/client/hooks/useProjectId"

// ── Reserved metadata keys that are exposed as dedicated fields ──────────────
const RESERVED_META_KEYS = new Set([
  "quota-bytes",
  "quota-count",
  "web-index",
  "web-listings",
  "web-listings-css",
  "web-error",
])

// RFC 7230 token allowlist — letters, digits, and safe symbols only.
// Using a positive allowlist avoids the ESLint no-control-regex rule.
const VALID_KEY_RE = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/

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
  // Retained for API compatibility with callers, but intentionally NOT wired to
  // a toast: container-update is recoverable, so failures are shown inline in the
  // modal (see #1162). Kept optional so existing callers still type-check.
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
  const projectId = useProjectId()

  // ── Query ─────────────────────────────────────────────────────────────────
  const {
    data: info,
    isLoading,
    isError: isMetaError,
    error: metaError,
  } = trpcReact.storage.swift.getContainerMetadata.useQuery(
    { project_id: projectId, container: container?.name ?? "" },
    { enabled: isOpen && container !== null }
  )

  const isPublicAccess = info?.read === ".r:*,.rlistings"

  const { data: publicUrl } = trpcReact.storage.swift.getContainerPublicUrl.useQuery(
    { project_id: projectId, container: container?.name ?? "" },
    { enabled: isOpen && container !== null && isPublicAccess }
  )

  const utils = trpcReact.useUtils()

  // ── Form state ────────────────────────────────────────────────────────────
  // Quota fields
  const [quotaBytes, setQuotaBytes] = useState("")
  const [quotaBytesError, setQuotaBytesError] = useState<string | null>(null)
  const [quotaCount, setQuotaCount] = useState("")
  const [quotaCountError, setQuotaCountError] = useState<string | null>(null)

  // Custom metadata
  const [metadata, setMetadata] = useState<MetadataEntry[]>([])
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newKeyError, setNewKeyError] = useState<string | null>(null)
  const [newValueError, setNewValueError] = useState<string | null>(null)
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Populate form when data arrives ──────────────────────────────────────
  useEffect(() => {
    if (!info) return

    setQuotaBytes(info.quotaBytes != null ? String(info.quotaBytes) : "")
    setQuotaCount(info.quotaCount != null ? String(info.quotaCount) : "")

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
      handleClose()
    },
  })

  // ── Validation ────────────────────────────────────────────────────────────
  const validateQuotas = (): boolean => {
    let valid = true
    if (
      quotaBytes !== "" &&
      (isNaN(Number(quotaBytes)) || !Number.isInteger(Number(quotaBytes)) || Number(quotaBytes) < 0)
    ) {
      setQuotaBytesError(t`Must be a whole number, 0 or greater`)
      valid = false
    } else {
      setQuotaBytesError(null)
    }
    if (
      quotaCount !== "" &&
      (isNaN(Number(quotaCount)) || !Number.isInteger(Number(quotaCount)) || Number(quotaCount) < 0)
    ) {
      setQuotaCountError(t`Must be a whole number, 0 or greater`)
      valid = false
    } else {
      setQuotaCountError(null)
    }
    return valid
  }

  const validateMetaKey = (key: string, originalKey?: string): string | null => {
    if (!key.trim()) return t`Key is required`
    if (!VALID_KEY_RE.test(key)) return t`Key contains invalid characters`
    if (!/[a-zA-Z0-9]/.test(key)) return t`Key must contain at least one alphanumeric character`
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
        // Key was renamed — remove the old key explicitly
        if (!entry.isNew && entry.originalKey && entry.key !== entry.originalKey) {
          removeMetadata.push(entry.originalKey)
        }
      }
    })

    // Deleted entries — keys that were in original but not in current list at all
    const originalKeys = Object.keys(rawMeta).filter((k) => !RESERVED_META_KEYS.has(k))
    const currentOriginalKeys = metadata.map((e) => e.originalKey).filter(Boolean) as string[]
    originalKeys.forEach((k) => {
      if (!currentOriginalKeys.includes(k) && !removeMetadata.includes(k)) removeMetadata.push(k)
    })

    updateMutation.mutate({
      project_id: projectId,
      container: container.name,
      metadata: metadataToSet,
      removeMetadata: removeMetadata.length ? removeMetadata : undefined,
      quotaBytes: quotaBytes !== "" ? Number(quotaBytes) : undefined,
      quotaCount: quotaCount !== "" ? Number(quotaCount) : undefined,
    })
  }

  const handleCopyPublicUrl = () => {
    if (!publicUrl) return
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => {
        setCopiedPublicUrl(true)
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = setTimeout(() => {
          setCopiedPublicUrl(false)
          copyTimeoutRef.current = null
        }, 2000)
      })
      .catch(() => {})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen || !container) return null

  const isBusy = isLoading || updateMutation.isPending
  const isMetaFailed = isMetaError && !isLoading
  const hasEditing = metadata.some((e) => e.isEditing)

  const initialQuotaBytes = info?.quotaBytes != null ? String(info.quotaBytes) : ""
  const initialQuotaCount = info?.quotaCount != null ? String(info.quotaCount) : ""
  const initialMetadataKeys = Object.keys(info?.metadata ?? {}).filter((k) => !RESERVED_META_KEYS.has(k))

  const metadataUnchanged =
    metadata.length === initialMetadataKeys.length &&
    metadata.every((e) => !e.isNew && e.key === e.originalKey && e.value === e.originalValue)

  const isUnchanged = quotaBytes === initialQuotaBytes && quotaCount === initialQuotaCount && metadataUnchanged

  // ── Render ────────────────────────────────────────────────────────────────
  const displayedQuotaBytes = info?.quotaBytes != null ? `${info.quotaBytes} B` : null

  return (
    <Modal
      title={t`Edit/Preview Container Metadata`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={updateMutation.isPending ? t`Saving...` : t`Save`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="xl"
      disableConfirmButton={isBusy || isAddingNew || hasEditing || isUnchanged || isMetaFailed}
    >
      {isLoading ? (
        <Status status="progress" title={t`Loading Container Properties...`} className="mt-0" />
      ) : isMetaFailed ? (
        <Status
          status="error"
          title={t`Failed to Load Container Properties`}
          body={metaError?.message ?? t`Unknown Error`}
          className="mt-0"
        />
      ) : (
        <div className="max-h-[65vh] overflow-y-auto pr-1 pl-1">
          <Stack direction="vertical" gap="6">
            {/* ── Description ──────────────────────────────────────────────── */}
            <p className="text-theme-default mb-4">
              <Trans>
                Custom metadata lets you attach arbitrary key-value pairs to this container. Each entry is stored as a
                Swift container header (<strong>X-Container-Meta-*</strong>) and returned with every request. Keys are
                case-insensitive. The following keys are reserved and managed through dedicated form fields:{" "}
                <strong>web-index, web-listings, quota-count, quota-bytes</strong>.
              </Trans>
            </p>

            {/* ── Read-only stats ─────────────────────────────────────────── */}
            <DescriptionList>
              <DescriptionTerm>
                <Trans>Name</Trans>
              </DescriptionTerm>
              <DescriptionDefinition>{container.name}</DescriptionDefinition>
              <DescriptionTerm>
                <Trans>Object count</Trans>
              </DescriptionTerm>
              <DescriptionDefinition>{String(container.count)}</DescriptionDefinition>
              <DescriptionTerm>
                <Trans>Total size</Trans>
              </DescriptionTerm>
              <DescriptionDefinition>
                {info?.bytesUsed != null
                  ? `${info.bytesUsed.toLocaleString()} B`
                  : `${container.bytes.toLocaleString()} B`}
              </DescriptionDefinition>
            </DescriptionList>

            {/* ── Public URL ──────────────────────────────────────────────── */}
            {isPublicAccess && publicUrl && (
              <div className="relative">
                <TextInput label={t`Public Access URL`} value={publicUrl} readOnly className="pr-10 text-xs" />
                <button
                  type="button"
                  onClick={handleCopyPublicUrl}
                  title={copiedPublicUrl ? t`Copied!` : t`Copy URL`}
                  aria-label={copiedPublicUrl ? t`Copied!` : t`Copy URL`}
                  className="text-theme-light hover:text-theme-default absolute top-1/2 right-2 inline-flex items-center transition-colors"
                  style={{ transform: "translateY(-50%)" }}
                >
                  <Icon icon={copiedPublicUrl ? "checkCircle" : "contentCopy"} size="18" />
                </button>
              </div>
            )}

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
                  placeholder={t`e.g. 1000`}
                  invalid={!!quotaCountError}
                  errortext={quotaCountError ?? undefined}
                  disabled={isBusy}
                  helptext={t`Maximum number of objects. Leave empty for no limit.`}
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
                  placeholder={t`e.g. 10737418240`}
                  invalid={!!quotaBytesError}
                  errortext={quotaBytesError ?? undefined}
                  disabled={isBusy}
                  helptext={
                    quotaBytes && displayedQuotaBytes
                      ? displayedQuotaBytes
                      : t`Maximum total storage in bytes (e.g. 10 GiB = 10737418240). Leave empty for no limit.`
                  }
                />
              </div>
            </div>

            {/* ── Custom Metadata ──────────────────────────────────────────── */}
            <div>
              <div className="mb-2 flex justify-end">
                <Button
                  label={t`Add Property`}
                  onClick={() => setIsAddingNew(true)}
                  disabled={isAddingNew || hasEditing || isBusy}
                />
              </div>

              {metadata.length === 0 && !isAddingNew ? (
                <p className="jn:text-theme-light py-8 text-center">
                  <Trans>No custom metadata. Click "Add Property" to create one.</Trans>
                </p>
              ) : (
                <DescriptionList className="mb-6" alignTerms="left">
                  <>
                    {isAddingNew && (
                      <>
                        <DescriptionTerm>
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
                        </DescriptionTerm>
                        <DescriptionDefinition>
                          <Stack direction="horizontal" gap="2" alignment="center" className="justify-between">
                            <div className="flex-1">
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
                            </div>
                            <Stack direction="horizontal" gap="2" className="shrink-0">
                              <Button
                                size="small"
                                variant="primary"
                                onClick={handleAddNew}
                                icon="check"
                                title={t`Save`}
                                disabled={!newKey.trim()}
                              />
                              <Button
                                size="small"
                                variant="subdued"
                                onClick={handleCancelAdd}
                                icon="close"
                                title={t`Discard`}
                              />
                            </Stack>
                          </Stack>
                        </DescriptionDefinition>
                      </>
                    )}
                  </>
                  <>
                    {metadata.map((entry, index) => (
                      <React.Fragment key={`${entry.originalKey ?? entry.key}-${index}`}>
                        <DescriptionTerm>
                          {entry.isEditing ? (
                            <TextInput
                              value={entry.key}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleKeyChange(index, e.target.value)
                              }
                              errortext={metaErrors[`edit-${index}`]}
                              invalid={!!metaErrors[`edit-${index}`]}
                            />
                          ) : (
                            <span className="jn:text-theme-high block max-w-xs truncate" title={entry.key}>
                              {entry.key}
                            </span>
                          )}
                        </DescriptionTerm>
                        <DescriptionDefinition className="flex items-center justify-between gap-2">
                          {entry.isEditing ? (
                            <>
                              <div className="flex-1">
                                <TextInput
                                  value={entry.value}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    handleValueChange(index, e.target.value)
                                  }
                                />
                              </div>
                              <Stack direction="horizontal" gap="2" className="shrink-0">
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
                            </>
                          ) : (
                            <>
                              <span className="jn:text-theme-default block max-w-md truncate" title={entry.value}>
                                {entry.value}
                              </span>
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
                                  onClick={() => handleDeleteMeta(index)}
                                  icon="deleteForever"
                                  title={t`Delete`}
                                  disabled={isAddingNew || hasEditing || isBusy}
                                />
                              </Stack>
                            </>
                          )}
                        </DescriptionDefinition>
                      </React.Fragment>
                    ))}
                  </>
                </DescriptionList>
              )}
            </div>
          </Stack>
        </div>
      )}
    </Modal>
  )
}
