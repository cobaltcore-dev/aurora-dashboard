import { useState, useEffect, useRef, Fragment } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { t } from "@lingui/core/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  Modal,
  Textarea,
  Stack,
  Spinner,
  Checkbox,
  Badge,
  Button,
  Icon,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Message,
  DescriptionList,
  DescriptionTerm,
  DescriptionDefinition,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"

// ── ACL parsing helpers ──────────────────────────────────────────────────────

type AclEntryType =
  | "any-referrer"
  | "denied-referrer"
  | "specific-referrer"
  | "listing-access"
  | "all-project-users"
  | "specific-user-any-project"
  | "specific-user"
  | "unknown"

interface ParsedAclEntry {
  raw: string
  type: AclEntryType
  host?: string
  projectId?: string
  userId?: string
  description: string
  requiresToken: boolean
}

/**
 * Parses a single ACL entry string into a human-readable representation.
 * Handles the following Swift ACL formats:
 *   .r:*           — public read (any referrer)
 *   .rlistings     — public container listing
 *   PROJECT:USER   — specific user from a specific project
 *   PROJECT:*      — all users from a project
 *   *:USER         — specific user from any project
 */
function parseAclEntry(raw: string): ParsedAclEntry {
  const entry = raw.trim()

  if (entry === ".r:*") {
    return { raw: entry, type: "any-referrer", description: "", requiresToken: false }
  }

  // .r:<referrer> or .r:-<referrer> — specific referrer granted (or denied) access
  if (entry.startsWith(".r:")) {
    const referrer = entry.slice(3)
    const isDeny = referrer.startsWith("-")
    const host = isDeny ? referrer.slice(1) : referrer
    return {
      raw: entry,
      type: isDeny ? "denied-referrer" : "specific-referrer",
      host,
      description: "",
      requiresToken: false,
    }
  }

  if (entry === ".rlistings") {
    return { raw: entry, type: "listing-access", description: "", requiresToken: false }
  }

  // PROJECT_ID:* — all users from a project
  if (/^[^:]+:\*$/.test(entry) && !entry.startsWith("*")) {
    const [projectId] = entry.split(":")
    return {
      raw: entry,
      type: "all-project-users",
      projectId,
      description: "",
      requiresToken: true,
    }
  }

  // *:USER_ID — specific user, any project
  if (entry.startsWith("*:")) {
    const userId = entry.slice(2)
    return {
      raw: entry,
      type: "specific-user-any-project",
      userId,
      description: "",
      requiresToken: true,
    }
  }

  // PROJECT_ID:USER_ID
  if (entry.includes(":")) {
    const [projectId, userId] = entry.split(":")
    return {
      raw: entry,
      type: "specific-user",
      projectId,
      userId,
      description: "",
      requiresToken: true,
    }
  }

  // Fallback — unknown format
  return { raw: entry, type: "unknown", description: "", requiresToken: true }
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

// ── ACL label rendering helper ──────────────────────────────────────────────

function aclEntryLabel(entry: ParsedAclEntry): string {
  switch (entry.type) {
    case "any-referrer":
      return t`ANY referrer`
    case "denied-referrer": {
      const host = entry.host || ""
      return t`Denied referrer: ${host}`
    }
    case "specific-referrer": {
      const host = entry.host || ""
      return t`Specific referrer: ${host}`
    }
    case "listing-access":
      return t`Listing access`
    case "all-project-users": {
      const projectId = entry.projectId || ""
      return t`All users from project ${projectId}`
    }
    case "specific-user-any-project": {
      const userId = entry.userId || ""
      return t`User ${userId} (any project)`
    }
    case "specific-user": {
      const projectId = entry.projectId || ""
      const userId = entry.userId || ""
      return t`User ${userId} from project ${projectId}`
    }
    case "unknown":
    default:
      return entry.raw
  }
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
  const projectId = useProjectId()

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
    { project_id: projectId, container: container?.name ?? "" },
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

  // ── Mutation ──────────────────────────────────────────────────────────────
  const utils = trpcReact.useUtils()

  const updateMutation = trpcReact.storage.swift.updateContainerMetadata.useMutation({
    onSuccess: () => {
      utils.storage.swift.getContainerMetadata.invalidate({ project_id: projectId, container: container!.name })
      utils.storage.swift.listContainers.invalidate()
      onSuccess?.(container!.name)
      handleClose()
    },
    onError: (error) => {
      onError?.(container!.name, error.message)
    },
  })

  // Keep a stable ref to reset() so the cleanup effect below doesn't need
  // updateMutation in its dependency array (the mutation object is recreated
  // on every render, which would cause an infinite loop).
  const resetMutationRef = useRef(updateMutation.reset)
  resetMutationRef.current = updateMutation.reset

  const handleClose = () => {
    setReadAcl("")
    setWriteAcl("")
    setPublicRead(false)
    setShowPreview(false)
    updateMutation.reset()
    onClose()
  }

  // ── Reset when closed ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setReadAcl("")
      setWriteAcl("")
      setPublicRead(false)
      resetMutationRef.current()
    }
  }, [isOpen])

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
      project_id: projectId,
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
      <Trans>Access Control for Container:</Trans>
      <span className="max-w-[250px] truncate" title={container.name}>
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
      size="xl"
      disableConfirmButton={isBusy || isMetaError}
    >
      {updateMutation.isError && (
        <p className="text-theme-error mb-4">
          {(() => {
            const errorMessage = updateMutation.error.message
            return <Trans>Failed to update ACLs: {errorMessage}</Trans>
          })()}
        </p>
      )}
      <div className="max-h-[70vh] overflow-y-auto pr-1 pl-1">
        {/* ── Info message ─────────────────────────────────────────────────── */}
        <div className="mb-4">
          <Message variant="warning" className="mb-4">
            <Trans>
              Ensure that the Project ID and User ID you enter are correct. The system cannot validate these values —
              incorrect IDs may apply access to wrong projects and users.
            </Trans>
          </Message>
        </div>

        {isLoading ? (
          <Stack direction="horizontal" alignment="center" gap="2" className="py-6">
            <Spinner size="small" />
            <Trans>Loading ACLs...</Trans>
          </Stack>
        ) : isMetaError ? (
          <p className="text-theme-error py-2">
            {(() => {
              const errorMessage = metaError?.message ?? ""
              return <Trans>Failed to load container ACLs: {errorMessage}</Trans>
            })()}
          </p>
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
                      className="text-sm"
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
                      className="text-sm"
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
                      className="self-start"
                    />
                  )}

                  {/* ── Parsed ACL preview — inside left column, below button ── */}
                  {showPreview && (parsedReadEntries.length > 0 || parsedWriteEntries.length > 0) && (
                    <Stack direction="vertical" gap="4">
                      {parsedReadEntries.length > 0 && (
                        <div>
                          <p className="text-theme-default mb-2 text-sm font-semibold">
                            <Trans>Read ACLs — Preview</Trans>
                          </p>
                          <div className="border-theme-background-lvl-3 rounded border p-3">
                            <DescriptionList className="grid-cols-2" alignTerms="left">
                              {parsedReadEntries.map((entry, i) => (
                                <Fragment key={i}>
                                  <DescriptionTerm className="col-span-1">
                                    <span className="block truncate text-xs" title={entry.raw}>
                                      {entry.raw}
                                    </span>
                                  </DescriptionTerm>
                                  <DescriptionDefinition className="col-span-1">
                                    <span className="block truncate text-sm" title={aclEntryLabel(entry)}>
                                      {aclEntryLabel(entry)}
                                    </span>
                                    <span className="text-theme-light block text-xs">
                                      {entry.requiresToken ? (
                                        <Trans>valid token required: true</Trans>
                                      ) : (
                                        <Trans>valid token required: false</Trans>
                                      )}
                                    </span>
                                  </DescriptionDefinition>
                                </Fragment>
                              ))}
                            </DescriptionList>
                          </div>
                        </div>
                      )}

                      {parsedWriteEntries.length > 0 && (
                        <div>
                          <p className="text-theme-default mb-2 text-sm font-semibold">
                            <Trans>Write ACLs — Preview</Trans>
                          </p>
                          <div className="border-theme-background-lvl-3 rounded border p-3">
                            <DescriptionList className="grid-cols-2" alignTerms="left">
                              {parsedWriteEntries.map((entry, i) => (
                                <Fragment key={i}>
                                  <DescriptionTerm className="col-span-1">
                                    <span className="block truncate text-xs" title={entry.raw}>
                                      {entry.raw}
                                    </span>
                                  </DescriptionTerm>
                                  <DescriptionDefinition className="col-span-1">
                                    <span className="block truncate text-sm" title={aclEntryLabel(entry)}>
                                      {aclEntryLabel(entry)}
                                    </span>
                                    <span className="text-theme-light block text-xs">
                                      <Trans>valid token required: true</Trans>
                                    </span>
                                  </DescriptionDefinition>
                                </Fragment>
                              ))}
                            </DescriptionList>
                          </div>
                        </div>
                      )}
                    </Stack>
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
          </>
        )}

        {/* Note shown at the bottom of the modal body, just above the Save button */}
        {!isLoading && !isMetaError && (
          <p className="text-theme-light mt-4 text-xs">
            <Trans>Changes take effect immediately after saving.</Trans>
          </p>
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
      <Badge variant="info" className="mb-1 text-xs">
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
