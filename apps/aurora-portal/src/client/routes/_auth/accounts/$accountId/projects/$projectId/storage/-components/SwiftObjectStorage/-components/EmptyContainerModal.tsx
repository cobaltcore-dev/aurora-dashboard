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
  Icon,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary, ObjectSummary } from "@/server/Storage/types/swift"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface EmptyContainerModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string, deletedCount: number) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const EmptyContainerModal = ({ isOpen, container, onClose, onSuccess, onError }: EmptyContainerModalProps) => {
  const { t } = useLingui()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopyName = () => {
    if (!container) return
    navigator.clipboard.writeText(container.name).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const utils = trpcReact.useUtils()

  // Fetch actual objects to get accurate real-time state —
  // container.count can lag due to Swift eventual consistency
  const { data: objects, isLoading: isLoadingObjects } = trpcReact.storage.swift.listObjects.useQuery(
    { container: container?.name ?? "", format: "json", limit: 100 },
    { enabled: isOpen && container !== null }
  )

  const emptyContainerMutation = trpcReact.storage.swift.emptyContainer.useMutation({
    onSuccess: (deletedCount) => {
      utils.storage.swift.listContainers.invalidate()
      onSuccess?.(container!.name, deletedCount)
    },
    onError: (error) => {
      onError?.(container!.name, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  useEffect(() => {
    if (!isOpen) {
      setConfirmName("")
      setNameError(null)
      emptyContainerMutation.reset()
    }
  }, [isOpen, container?.name])

  const handleClose = () => {
    setConfirmName("")
    setNameError(null)
    emptyContainerMutation.reset()
    onClose()
  }

  const handleConfirmNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmName(value)
    if (nameError) setNameError(null)
  }

  const handleSubmit = () => {
    if (!container) return
    if (confirmName.trim() !== container.name) {
      setNameError(t`Container name does not match`)
      return
    }
    emptyContainerMutation.mutate({ container: container.name })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (!isOpen || !container) return null

  const actualObjectCount = objects?.length ?? 0

  // ── Case 2: container.count === 0 and listed objects === 0 ────────────────
  // Container is genuinely empty
  const isTrulyEmpty = !isLoadingObjects && container.count === 0 && actualObjectCount === 0

  // ── Case 3: container.count > 0 but listed objects === 0 ──────────────────
  // Swift eventual consistency delay — metadata not yet synced after recent delete
  const isConsistencyDelay = !isLoadingObjects && container.count > 0 && actualObjectCount === 0

  const showEmptyInfo = isTrulyEmpty || isConsistencyDelay

  const modalTitle = (
    <span className="flex items-center gap-2">
      <Trans>Empty container:</Trans>
      <span>{container.name}</span>
      {!isLoadingObjects && !showEmptyInfo && (
        <button
          type="button"
          onClick={handleCopyName}
          title={copied ? t`Copied!` : t`Copy container name`}
          className="text-theme-light hover:text-theme-default inline-flex items-center transition-colors"
        >
          <Icon icon={copied ? "checkCircle" : "contentCopy"} size="16" />
        </button>
      )}
    </span>
  )

  return (
    <Modal
      title={modalTitle}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={showEmptyInfo ? t`Got it!` : t`Empty`}
      onConfirm={showEmptyInfo ? handleClose : handleSubmit}
      cancelButtonLabel={showEmptyInfo ? undefined : t`Cancel`}
      size="small"
      disableConfirmButton={
        isLoadingObjects ||
        emptyContainerMutation.isPending ||
        (!showEmptyInfo && !confirmName.trim()) ||
        (!showEmptyInfo && confirmName !== container.name)
      }
    >
      {isLoadingObjects ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading objects...</Trans>
        </Stack>
      ) : showEmptyInfo ? (
        // ── Case 2 & 3 ──────────────────────────────────────────────────────
        <Message variant="info">
          {isTrulyEmpty ? (
            <Trans>Nothing to do. Container is already empty.</Trans>
          ) : (
            <Trans>
              Nothing to do. Container appears empty — the object count may not have synced yet due to a recent
              operation.
            </Trans>
          )}
        </Message>
      ) : (
        // ── Case 1: container has objects ────────────────────────────────────
        <Stack direction="vertical" gap="6">
          <Message variant="danger">
            <Trans>
              <strong>Are you sure?</strong> All objects in the container will be deleted. This cannot be undone.
            </Trans>
            <br />
            <Trans>
              Please note: for <strong>dynamic</strong> and <strong>static large objects</strong> only the manifests are
              deleted. The related segments are not deleted.
            </Trans>
          </Message>

          {/* Object list preview — capped at first 100 */}
          <div className="border-theme-background-lvl-3 max-h-48 overflow-y-auto rounded border">
            <DataGrid columns={3} className="text-sm">
              <DataGridRow>
                <DataGridHeadCell>
                  <Trans>Name</Trans>
                </DataGridHeadCell>
                <DataGridHeadCell>
                  <Trans>Size</Trans>
                </DataGridHeadCell>
                <DataGridHeadCell>
                  <Trans>Last Modified</Trans>
                </DataGridHeadCell>
              </DataGridRow>
              {(objects as ObjectSummary[]).map((obj) => (
                <DataGridRow key={obj.name}>
                  <DataGridCell className="max-w-[200px] truncate" title={obj.name}>
                    {obj.name}
                  </DataGridCell>
                  <DataGridCell>{formatBytesBinary(obj.bytes)}</DataGridCell>
                  <DataGridCell>
                    {obj.last_modified ? new Date(obj.last_modified).toLocaleString() : t`N/A`}
                  </DataGridCell>
                </DataGridRow>
              ))}
            </DataGrid>
            {container.count > actualObjectCount && (
              <p className="text-theme-light px-3 py-2 text-xs">
                <Trans>
                  Showing first {actualObjectCount} of {container.count} objects
                </Trans>
              </p>
            )}
          </div>

          <TextInput
            label={t`Type container name to confirm`}
            required
            value={confirmName}
            onChange={handleConfirmNameChange}
            onKeyDown={handleKeyDown}
            invalid={!!nameError}
            errortext={nameError || undefined}
            disabled={emptyContainerMutation.isPending}
            autoFocus
            placeholder={container.name}
          />
        </Stack>
      )}
    </Modal>
  )
}
