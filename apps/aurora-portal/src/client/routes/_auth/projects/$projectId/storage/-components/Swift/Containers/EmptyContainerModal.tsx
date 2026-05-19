import { useState, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  Modal,
  ModalFooter,
  Button,
  ButtonRow,
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
  const projectId = useProjectId()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const containerNameRef = useRef("")

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
  const {
    data: objects,
    isLoading: isLoadingObjects,
    error: objectsError,
  } = trpcReact.storage.swift.listObjects.useQuery(
    { project_id: projectId, container: container?.name ?? "", format: "json", limit: 100 },
    { enabled: isOpen && container !== null }
  )

  const emptyContainerMutation = trpcReact.storage.swift.emptyContainer.useMutation({
    onSuccess: (deletedCount) => {
      utils.storage.swift.listContainers.invalidate()
      utils.storage.swift.listObjects.invalidate({ project_id: projectId, container: containerNameRef.current })
      onSuccess?.(containerNameRef.current, deletedCount)
    },
    onError: (error) => {
      onError?.(containerNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

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
    containerNameRef.current = container.name
    emptyContainerMutation.mutate({ project_id: projectId, container: container.name })
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
    <span className="flex max-w-[400px] items-center gap-2">
      <span className="shrink-0">
        <Trans>Empty:</Trans>
      </span>
      <span className="truncate" title={container.name}>
        {container.name}
      </span>
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
      confirmButtonLabel={showEmptyInfo ? undefined : t`Empty`}
      confirmButtonVariant="primary-danger"
      onConfirm={showEmptyInfo ? undefined : handleSubmit}
      cancelButtonLabel={showEmptyInfo ? undefined : t`Cancel`}
      modalFooter={
        showEmptyInfo ? (
          <ModalFooter className="flex justify-end">
            <ButtonRow>
              <Button variant="primary" onClick={handleClose} data-testid="empty-info-close-button">
                <Trans>Close</Trans>
              </Button>
            </ButtonRow>
          </ModalFooter>
        ) : undefined
      }
      size="small"
      disableConfirmButton={
        isLoadingObjects ||
        emptyContainerMutation.isPending ||
        (!showEmptyInfo && !confirmName.trim()) ||
        (!showEmptyInfo && confirmName !== container.name)
      }
    >
      {objectsError && (
        <Message variant="danger" className="mb-2">
          {(() => {
            const errorMessage = objectsError.message
            return <Trans>Failed to load container objects: {errorMessage}</Trans>
          })()}
        </Message>
      )}
      {isLoadingObjects ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading objects...</Trans>
        </Stack>
      ) : showEmptyInfo && !objectsError ? (
        // ── Case 2 & 3 ──────────────────────────────────────────────────────
        <p className="text-theme-default py-2">
          {isTrulyEmpty ? (
            <Trans>This container is already empty.</Trans>
          ) : (
            <Trans>
              This container is already empty — the object count may not have synced yet due to a recent operation.
            </Trans>
          )}
        </p>
      ) : !objectsError ? (
        // ── Case 1: container has objects ────────────────────────────────────
        <Stack direction="vertical" gap="6">
          <p className="text-theme-default">
            <Trans>
              This action is permanent. All objects in the container will be deleted and this cannot be undone.
            </Trans>
            <br />
            <Trans>
              <strong>Please note:</strong> for <strong>dynamic</strong> and <strong>static large objects</strong> only
              the manifests will be deleted. The related segments will not be deleted.
            </Trans>
          </p>

          {/* Object list preview — capped at first 100 */}
          <div className="border-theme-background-lvl-3 overflow-hidden rounded border">
            {container.count > actualObjectCount && (
              <p className="text-theme-light px-3 py-2 text-xs">
                {(() => {
                  const total = container.count
                  return (
                    <Trans>
                      Showing first {actualObjectCount} of {total} objects
                    </Trans>
                  )
                })()}
              </p>
            )}
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
            </DataGrid>
            <div className="max-h-48 overflow-y-auto">
              <DataGrid columns={3} className="text-sm">
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
            </div>
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
      ) : null}
    </Modal>
  )
}
