import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  Textarea,
  Stack,
  Message,
  Spinner,
  Checkbox,
  Badge,
  Button,
  Icon,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"

// ── ACL parsing helpers ──────────────────────────────────────────────────────

interface ParsedAclEntry {
  raw: string
  label: string
  description: string
  requiresToken: boolean
}

/**
 * Parses a single ACL entry string into a human-readable representation.
 * Handles the following Swift ACL formats:
 *   .r:*           — public read (any referer)
 *   .rlistings     — public container listing
 *   PROJECT:USER   — specific user from a specific project
 *   PROJECT:*      — all users from a project
 *   *:USER         — specific user from any project
 */
function parseAclEntry(raw: string): ParsedAclEntry {
  const entry = raw.trim()

  if (entry === ".r:*") {
    return { raw: entry, label: "ANY referer", description: "", requiresToken: false }
  }

  if (entry === ".rlistings") {
    return { raw: entry, label: "Listing access", description: "", requiresToken: false }
  }

  // PROJECT_ID:* — all users from a project
  if (/^[^:]+:\*$/.test(entry) && !entry.startsWith("*")) {
    const [projectId] = entry.split(":")
    return {
      raw: entry,
      label: `All referrers from project ${projectId}`,
      description: "",
      requiresToken: true,
    }
  }

  // *:USER_ID — specific user, any project
  if (entry.startsWith("*:")) {
    const userId = entry.slice(2)
    return {
      raw: entry,
      label: `Referrer ${userId} (any project)`,
      description: "",
      requiresToken: true,
    }
  }

  // PROJECT_ID:USER_ID
  if (entry.includes(":")) {
    const [projectId, userId] = entry.split(":")
    return {
      raw: entry,
      label: `Referrer ${userId} for project ${projectId}`,
      description: "",
      requiresToken: true,
    }
  }

  // Fallback — unknown format
  return { raw: entry, label: entry, description: "", requiresToken: true }
}

function parseAclString(aclString: string): ParsedAclEntry[] {
  if (!aclString.trim()) return []
  return aclString
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseAclEntry)
}

// ── Public read sentinel values ──────────────────────────────────────────────
// const PUBLIC_READ_ACL = ".r:*,.rlistings"
const PUBLIC_READ_ENTRIES = [".r:*", ".rlistings"]

function isPublicRead(readAcl: string): boolean {
  const entries = readAcl
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return PUBLIC_READ_ENTRIES.every((e) => entries.includes(e))
}

function addPublicReadEntries(current: string): string {
  const existing = current
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const merged = [...new Set([...PUBLIC_READ_ENTRIES, ...existing])]
  return merged.join(",")
}

function removePublicReadEntries(current: string): string {
  return current
    .split(",")
    .map((s) => s.trim())
    .filter((e) => !PUBLIC_READ_ENTRIES.includes(e))
    .join(",")
}

// ── Component ────────────────────────────────────────────────────────────────

interface ManageContainerAccessModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const ManageContainerAccessModal = ({
  isOpen,
  container,
  onClose,
  onSuccess,
  onError,
}: ManageContainerAccessModalProps) => {
  const { t } = useLingui()

  const [readAcl, setReadAcl] = useState("")
  const [writeAcl, setWriteAcl] = useState("")
  const [publicRead, setPublicRead] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Auto-collapse preview when both ACL fields are cleared
  useEffect(() => {
    if (!readAcl.trim() && !writeAcl.trim()) setShowPreview(false)
  }, [readAcl, writeAcl])

  // ── Query ─────────────────────────────────────────────────────────────────
  const {
    data: info,
    isLoading,
    isError: isMetaError,
    error: metaError,
  } = trpcReact.storage.swift.getContainerMetadata.useQuery(
    { container: container?.name ?? "" },
    { enabled: isOpen && container !== null }
  )

  // ── Populate form when data arrives ──────────────────────────────────────
  useEffect(() => {
    if (!info) return
    const read = info.read ?? ""
    const write = info.write ?? ""
    setReadAcl(read)
    setWriteAcl(write)
    setPublicRead(isPublicRead(read))
  }, [info])

  // ── Reset when closed ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setReadAcl("")
      setWriteAcl("")
      setPublicRead(false)
      updateMutation.reset()
    }
  }, [isOpen])

  // ── Mutation ──────────────────────────────────────────────────────────────
  const utils = trpcReact.useUtils()

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

  const handleClose = () => {
    setReadAcl("")
    setWriteAcl("")
    setPublicRead(false)
    setShowPreview(false)
    updateMutation.reset()
    onClose()
  }

  // ── Public read checkbox sync ─────────────────────────────────────────────
  const handlePublicReadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setPublicRead(checked)
    setReadAcl((prev) => (checked ? addPublicReadEntries(prev) : removePublicReadEntries(prev)))
  }

  const handleReadAclChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setReadAcl(value)
    setPublicRead(isPublicRead(value))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!container) return
    updateMutation.mutate({
      container: container.name,
      read: readAcl.trim(),
      write: writeAcl.trim(),
    })
  }

  if (!isOpen || !container) return null

  const isBusy = isLoading || updateMutation.isPending
  const hasAnyAcl = readAcl.trim().length > 0 || writeAcl.trim().length > 0

  const parsedReadEntries = parseAclString(readAcl)
  const parsedWriteEntries = parseAclString(writeAcl)

  const modalTitle = (
    <span className="flex items-center gap-2">
      <Trans>Access Control for container:</Trans>
      <span className="max-w-[250px] truncate font-mono" title={container.name}>
        {container.name}
      </span>
    </span>
  )

  return (
    <Modal
      title={modalTitle}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Save`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="large"
      disableConfirmButton={isBusy || isMetaError}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1 pl-1">
        {/* ── Info message ─────────────────────────────────────────────────── */}
        <Message variant="info" className="mb-4">
          <Trans>
            ACL entries control who can read from or write to this container. Multiple entries are comma-separated.
            Changes take effect immediately after saving.
          </Trans>
        </Message>

        {isLoading ? (
          <Stack direction="horizontal" alignment="center" gap="2" className="py-6">
            <Spinner size="small" />
            <Trans>Loading ACLs...</Trans>
          </Stack>
        ) : isMetaError ? (
          <Message variant="danger">
            <Trans>Failed to load container ACLs: {metaError?.message}</Trans>
          </Message>
        ) : (
          <>
            <div className="flex gap-6">
              {/* ── Left: editable inputs ──────────────────────────────────── */}
              <div className="min-w-0 flex-1">
                <Stack direction="vertical" gap="6">
                  {/* Read ACLs */}
                  <div>
                    <AclFieldLabel label={t`Read ACLs`} />
                    <Textarea
                      value={readAcl}
                      onChange={handleReadAclChange}
                      disabled={isBusy || publicRead}
                      placeholder={t`e.g. .r:*,.rlistings`}
                      className="font-mono text-sm"
                      rows={3}
                    />
                    <Checkbox
                      label={t`Public Read Access`}
                      checked={publicRead}
                      onChange={handlePublicReadChange}
                      disabled={isBusy}
                      className="mt-2"
                    />
                  </div>

                  {/* Write ACLs */}
                  <div>
                    <AclFieldLabel label={t`Write ACLs`} />
                    <Textarea
                      value={writeAcl}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const value = e.target.value
                        setWriteAcl(value)
                      }}
                      disabled={isBusy}
                      placeholder={t`e.g. PROJECT_ID:USER_ID`}
                      className="font-mono text-sm"
                      rows={3}
                    />
                  </div>

                  {/* ── Preview toggle button — only shown when at least one ACL is set (only shown when ACL fields have content) ──────────────────────────── */}
                  {hasAnyAcl && (
                    <Button
                      label={showPreview ? t`Hide ACLs Preview` : t`Show ACLs Preview`}
                      onClick={() => setShowPreview((v) => !v)}
                      variant="subdued"
                      disabled={isBusy}
                    />
                  )}
                </Stack>
              </div>

              {/* ── Right: reference panel ─────────────────────────────────── */}
              <div className="border-theme-background-lvl-3 w-72 shrink-0 border-l pl-6">
                <p className="text-theme-light mb-3 text-xs">
                  <Trans>Entries in ACLs are comma-separated. Examples:</Trans>
                </p>

                <Stack direction="vertical" gap="4">
                  <AclExample
                    code=".r:*"
                    description={t`Any user has read access to objects. No token is required in the request.`}
                  />
                  <AclExample
                    code=".rlistings"
                    description={t`Any user can perform a HEAD or GET operation on the container provided the user also has read access on objects. No token is required.`}
                  />
                  <AclExample
                    code="PROJECT_ID:USER_ID"
                    description={t`Grant access to a user from a different project.`}
                  />
                  <AclExample code="PROJECT_ID:*" description={t`Grant access to all users from that project.`} />
                  <AclExample
                    code="*:USER_ID"
                    description={t`The specified user has access. A token for the user (scoped to any project) must be included in the request.`}
                  />
                </Stack>

                <p className="text-theme-light mt-4 text-xs">
                  <Trans>
                    For more details, have a look at the{" "}
                    <a
                      href="https://docs.openstack.org/swift/latest/overview_acl.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-link underline"
                    >
                      documentation
                    </a>
                    .
                  </Trans>
                </p>
              </div>
            </div>

            {/* ── Full-width parsed ACL preview ─────────────────────────────────── */}
            {showPreview && (parsedReadEntries.length > 0 || parsedWriteEntries.length > 0) && (
              <Stack direction="vertical" gap="4" className="mt-6">
                {parsedReadEntries.length > 0 && (
                  <div>
                    <p className="text-theme-default mb-2 text-sm font-semibold">
                      <Trans>Read ACLs</Trans>
                    </p>
                    <div className="border-theme-background-lvl-3 divide-theme-background-lvl-3 divide-y rounded border">
                      {parsedReadEntries.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-theme-default truncate text-sm font-medium">{entry.label}</p>
                            <p className="text-theme-light text-xs">
                              {entry.requiresToken ? (
                                <Trans>valid token required: true</Trans>
                              ) : (
                                <Trans>valid token required: false</Trans>
                              )}
                            </p>
                          </div>
                          <Badge variant="info" className="shrink-0 font-mono text-xs">
                            {entry.raw}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedWriteEntries.length > 0 && (
                  <div>
                    <p className="text-theme-default mb-2 text-sm font-semibold">
                      <Trans>Write ACLs</Trans>
                    </p>
                    <div className="border-theme-background-lvl-3 divide-theme-background-lvl-3 divide-y rounded border">
                      {parsedWriteEntries.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-theme-default truncate text-sm font-medium">{entry.label}</p>
                            <p className="text-theme-light text-xs">
                              <Trans>valid token required: true</Trans>
                            </p>
                          </div>
                          <Badge variant="warning" className="shrink-0 font-mono text-xs">
                            {entry.raw}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Stack>
            )}

            {/* Mutation error */}
            {updateMutation.isError && (
              <Message variant="danger" className="mt-4">
                <Trans>Failed to update ACLs: {updateMutation.error.message}</Trans>
              </Message>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ── AclExample sub-component ─────────────────────────────────────────────────

interface AclExampleProps {
  code: string
  description: string
}

function AclExample({ code, description }: AclExampleProps) {
  return (
    <div>
      <Badge variant="info" className="mb-1 font-mono text-xs">
        {code}
      </Badge>
      <p className="text-theme-light text-xs leading-relaxed">{description}</p>
    </div>
  )
}

// ── AclFieldLabel sub-component ──────────────────────────────────────────────

interface AclFieldLabelProps {
  label: string
}

function AclFieldLabel({ label }: AclFieldLabelProps) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <label className="text-theme-default text-sm font-semibold">{label}</label>
      <Tooltip triggerEvent="hover">
        <TooltipTrigger>
          <Icon icon="info" size="14" className="text-theme-light cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="z-10 max-w-[350px]">
          <Trans>
            Ensure ACL entries are valid — correct project IDs, user IDs, and formats are your responsibility. Invalid
            entries may silently grant or deny unintended access.
          </Trans>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
