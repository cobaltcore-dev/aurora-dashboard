import { useState, useEffect, useRef } from "react"
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
} from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { formatBytesBinary } from "@/client/utils/formatBytes"
import { ObjectRow } from "./"

// ── Types ──────────────────────────────────────────────────────────────────────

interface MetadataEntry {
  key: string
  value: string
  isEditing?: boolean
  originalKey?: string
  originalValue?: string
}

interface EditObjectMetadataModalProps {
  isOpen: boolean
  object: ObjectRow | null
  onClose: () => void
  onSuccess?: (objectName: string) => void
  onError?: (objectName: string, errorMessage: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// RFC 7230 token: only printable ASCII letters, digits, and safe symbols allowed.
// Using a positive allowlist avoids the ESLint no-control-regex rule.
const VALID_KEY_RE = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/

// Expected format: "YYYY-MM-DD HH:MM:SS" (UTC).
// Checks shape first, then rejects semantically invalid dates (e.g. month 13, day 30 in Feb)
// by parsing as UTC and verifying the parts round-trip back to the same values.
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

const isValidTimestamp = (value: string): boolean => {
  if (!TIMESTAMP_RE.test(value)) return false
  const d = new Date(value.replace(" ", "T") + "Z")
  if (isNaN(d.getTime())) return false
  const [datePart, timePart] = value.split(" ")
  const [y, mo, day] = datePart.split("-").map(Number)
  const [h, min, s] = timePart.split(":").map(Number)
  return (
    d.getUTCFullYear() === y &&
    d.getUTCMonth() + 1 === mo &&
    d.getUTCDate() === day &&
    d.getUTCHours() === h &&
    d.getUTCMinutes() === min &&
    d.getUTCSeconds() === s
  )
}

type MetaKeyError = "required" | "invalid-chars" | "no-alnum"

const validateMetaKey = (key: string): MetaKeyError | null => {
  if (!key.trim()) return "required"
  if (!VALID_KEY_RE.test(key)) return "invalid-chars"
  if (!/[a-zA-Z0-9]/.test(key)) return "no-alnum"
  return null
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })

// Converts a Unix timestamp (seconds) to the "YYYY-MM-DD HH:MM:SS" field format (UTC)
const formatUnixToTimestamp = (unix: number): string => {
  const d = new Date(unix * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

// ── Component ──────────────────────────────────────────────────────────────────

export const EditObjectMetadataModal = ({
  isOpen,
  object,
  onClose,
  onSuccess,
  onError,
}: EditObjectMetadataModalProps) => {
  const { t } = useLingui()
  const { containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  const utils = trpcReact.useUtils()

  // ── Metadata fetch ─────────────────────────────────────────────────────────
  const {
    data: metadataRaw,
    isLoading,
    isError: isMetaError,
    error: metaError,
  } = trpcReact.storage.swift.getObjectMetadata.useQuery(
    { container: containerName, object: object?.name ?? "" },
    { enabled: isOpen && object !== null }
  )

  // ── Form state ─────────────────────────────────────────────────────────────
  const [expiresAt, setExpiresAt] = useState("")
  const [expiresAtError, setExpiresAtError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<MetadataEntry[]>([])
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newKeyError, setNewKeyError] = useState<string | null>(null)

  // Track original state for change detection and cancel-edit rollback
  const originalExpiresAtRef = useRef("")
  const originalMetadataRef = useRef<MetadataEntry[]>([])

  // Survives reset() inside handleClose() before onSuccess/onError fire
  const displayNameRef = useRef("")
  const objectNameRef = useRef("")
  const expiresAtDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Populate form when data arrives ───────────────────────────────────────
  useEffect(() => {
    if (!metadataRaw) return

    const rawExpires = metadataRaw.deleteAt != null ? formatUnixToTimestamp(metadataRaw.deleteAt) : ""
    setExpiresAt(rawExpires)
    originalExpiresAtRef.current = rawExpires

    const entries: MetadataEntry[] = Object.entries(metadataRaw.customMetadata ?? {}).map(([key, value]) => ({
      key,
      value,
      isEditing: false,
      originalKey: key,
      originalValue: value,
    }))
    setMetadata(entries)
    originalMetadataRef.current = entries.map((e) => ({ ...e }))
  }, [metadataRaw])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  const resetForm = () => {
    if (expiresAtDebounceTimer.current) clearTimeout(expiresAtDebounceTimer.current)
    setExpiresAt("")
    setExpiresAtError(null)
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
    if (expiresAt !== originalExpiresAtRef.current) return true
    if (metadata.length !== originalMetadataRef.current.length) return true
    return metadata.some((entry, i) => {
      const orig = originalMetadataRef.current[i]
      return !orig || entry.key !== orig.key || entry.value !== orig.value
    })
  })()

  const hasEditing = metadata.some((e) => e.isEditing)

  // ── Mutation ───────────────────────────────────────────────────────────────
  const updateMutation = trpcReact.storage.swift.updateObjectMetadata.useMutation({
    onSuccess: () => {
      utils.storage.swift.getObjectMetadata.invalidate({ container: containerName, object: objectNameRef.current })
      utils.storage.swift.listObjects.invalidate({ container: containerName })
      onSuccess?.(displayNameRef.current)
      handleClose()
    },
    onError: (error) => {
      onError?.(displayNameRef.current, error.message)
    },
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = () => {
    if (!object) return

    if (expiresAt.trim() && !isValidTimestamp(expiresAt.trim())) {
      setExpiresAtError("invalid")
      return
    }
    setExpiresAtError(null)

    displayNameRef.current = object.displayName
    objectNameRef.current = object.name

    // Build metadata record from current entries (keys are X-Object-Meta-* suffixes).
    // Swift's POST metadata update replaces the full set — keys omitted from the
    // record are automatically removed server-side, so no explicit removeMetadata needed.
    const metadataRecord: Record<string, string> = {}
    for (const entry of metadata) {
      metadataRecord[entry.key] = entry.value
    }

    updateMutation.mutate({
      container: containerName,
      object: object.name,
      metadata: metadataRecord,
      ...(expiresAt.trim()
        ? { deleteAt: Math.floor(new Date(expiresAt.trim().replace(" ", "T") + "Z").getTime() / 1000) }
        : {}),
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
    const keyError = validateMetaKey(entry.key)
    if (keyError) {
      const msg =
        keyError === "required"
          ? t`Key is required`
          : keyError === "invalid-chars"
            ? t`Key contains invalid characters`
            : t`Key must contain at least one alphanumeric character`
      setMetaErrors((prev) => ({ ...prev, [`edit-${index}`]: msg }))
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
    const orig = originalMetadataRef.current[index]
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
    const keyError = validateMetaKey(newKey)
    if (keyError) {
      setNewKeyError(
        keyError === "required"
          ? t`Key is required`
          : keyError === "invalid-chars"
            ? t`Key contains invalid characters`
            : t`Key must contain at least one alphanumeric character`
      )
      return
    }
    const isDuplicate = metadata.some((e) => e.key.toLowerCase() === newKey.trim().toLowerCase())
    if (isDuplicate) {
      setNewKeyError(t`Key already exists`)
      return
    }
    setMetadata((prev) => [...prev, { key: newKey.trim(), value: newValue, isEditing: false }])
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

  if (!isOpen || !object) return null

  const displayName = object.displayName
  const isPending = updateMutation.isPending
  const isBusy = isPending || isLoading
  const isSLO = metadataRaw?.staticLargeObject === true
  const isDLO = !!metadataRaw?.objectManifest
  const metaErrorMessage = metaError?.message ?? ""
  const mutationErrorMessage = updateMutation.error?.message ?? ""

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Properties of</Trans>
          </span>
          <span className="truncate font-mono" title={displayName}>
            {displayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Saving...` : t`Update object`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isBusy || !hasChanges || hasEditing || isAddingNew}
    >
      {isLoading ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-8">
          <Spinner size="small" />
          <Trans>Loading object properties...</Trans>
        </Stack>
      ) : isMetaError ? (
        <Message variant="danger">
          <Trans>Failed to load object metadata: {metaErrorMessage}</Trans>
        </Message>
      ) : (
        <Stack direction="vertical" gap="6">
          {/* ── Large object notices ──────────────────────────────────────── */}
          {isSLO && (
            <Message variant="info">
              <Trans>
                This is a <strong>static large object (SLO)</strong> manifest. Metadata changes apply to the manifest
                only — segment objects are not affected.
              </Trans>
            </Message>
          )}
          {isDLO && (
            <Message variant="info">
              <Trans>
                This is a <strong>dynamic large object (DLO)</strong> manifest. Metadata changes apply to the manifest
                only — segment objects are not affected.
              </Trans>
            </Message>
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
              <span className="font-mono">{metadataRaw?.contentType ?? "—"}</span>

              <span className="text-theme-light text-right">
                <Trans>MD5 checksum</Trans>
              </span>
              <span className="font-mono break-all">{metadataRaw?.etag ?? "—"}</span>

              <span className="text-theme-light text-right">
                <Trans>Size</Trans>
              </span>
              <span>{metadataRaw?.contentLength != null ? formatBytesBinary(metadataRaw.contentLength) : "—"}</span>

              <span className="text-theme-light text-right">
                <Trans>Last modified (UTC)</Trans>
              </span>
              <span>
                {metadataRaw?.lastModified
                  ? formatDate(metadataRaw.lastModified)
                  : object.last_modified
                    ? formatDate(object.last_modified)
                    : "—"}
              </span>
            </div>
          </div>

          {/* ── Expires at ───────────────────────────────────────────────── */}
          <TextInput
            label={t`Expires at (UTC)`}
            value={expiresAt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value
              setExpiresAt(value)
              if (expiresAtDebounceTimer.current) clearTimeout(expiresAtDebounceTimer.current)
              expiresAtDebounceTimer.current = setTimeout(() => {
                if (value.trim() && !isValidTimestamp(value.trim())) {
                  setExpiresAtError("invalid")
                } else {
                  setExpiresAtError(null)
                }
              }, 600)
            }}
            invalid={!!expiresAtError}
            errortext={expiresAtError ? t`Expected format: YYYY-MM-DD HH:MM:SS` : undefined}
            placeholder={t`Enter a timestamp like "2026-05-16 18:14:57" to schedule automatic deletion`}
            helptext={
              expiresAt.trim()
                ? t`Enter a timestamp like "2026-05-16 18:14:57" to schedule automatic deletion`
                : undefined
            }
            disabled={isBusy}
          />

          {/* ── Custom metadata ───────────────────────────────────────────── */}
          <div>
            <Stack direction="horizontal" alignment="center" distribution="between" className="mb-3">
              <p className="text-theme-default text-sm font-semibold">
                <Trans>Metadata</Trans>
              </p>
              <p className="text-theme-light text-xs">
                <Trans>Stored as X-Object-Meta-* headers. Keys are case-insensitive.</Trans>
              </p>
            </Stack>

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
                      placeholder={t`property_key`}
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

              {/* Existing rows */}
              {metadata.map((entry, index) => (
                <DataGridRow key={index}>
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
              <Trans>Failed to update object: {mutationErrorMessage}</Trans>
            </Message>
          )}
        </Stack>
      )}
    </Modal>
  )
}
