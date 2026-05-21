import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import {
  Modal,
  ModalFooter,
  Button,
  ButtonRow,
  TextInput,
  Stack,
  Spinner,
  Checkbox,
} from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { useProjectId } from "@/client/hooks/useProjectId"

interface DeleteContainerModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const DeleteContainerModal = ({ isOpen, container, onClose, onSuccess, onError }: DeleteContainerModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [confirmName, setConfirmName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [versionsConfirmed, setVersionsConfirmed] = useState(false)

  const utils = trpcReact.useUtils()

  // Fetch actual objects to get accurate real-time state —
  // container.count can lag due to Swift eventual consistency
  const {
    data: objects,
    isLoading: isLoadingObjects,
    error: objectsError,
  } = trpcReact.storage.swift.listObjects.useQuery(
    { project_id: projectId, container: container?.name ?? "", format: "json", limit: 1 },
    { enabled: isOpen && container !== null }
  )

  // Fetch container metadata to check if versioning is enabled
  const { data: containerMetadata, error: metaError } = trpcReact.storage.swift.getContainerMetadata.useQuery(
    { project_id: projectId, container: container?.name ?? "" },
    { enabled: isOpen && container !== null }
  )

  // Swift versioning v2: x-versions-enabled header; v1: x-versions-location / x-history-location
  const isVersioned = !!(
    containerMetadata?.versionsEnabled ||
    containerMetadata?.versionsLocation ||
    containerMetadata?.historyLocation
  )

  const deleteContainerMutation = trpcReact.storage.swift.deleteContainer.useMutation({
    onSuccess: () => {
      utils.storage.swift.listContainers.invalidate()
      onSuccess?.(container!.name)
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
      setVersionsConfirmed(false)
      deleteContainerMutation.reset()
    }
  }, [isOpen, container?.name])

  const handleClose = () => {
    setConfirmName("")
    setNameError(null)
    setVersionsConfirmed(false)
    deleteContainerMutation.reset()
    onClose()
  }

  const handleConfirmNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmName(value)
    if (nameError) setNameError(null)
  }

  const handleSubmit = () => {
    if (!container) return
    if (objectsError || metaError) return
    if (confirmName.trim() !== "delete") {
      setNameError(t`The text must match "delete"`)
      return
    }
    if (isVersioned && !versionsConfirmed) return
    deleteContainerMutation.mutate({ project_id: projectId, container: container.name })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  if (!isOpen || !container) return null

  const actualObjectCount = objects?.length ?? 0

  // Container has objects — cannot delete, must empty first.
  // Also covers the Swift consistency delay where count > 0 but listed objects === 0:
  // we trust container.count here to avoid letting the user delete a non-empty container.
  const hasObjects = !isLoadingObjects && (actualObjectCount > 0 || container.count > 0)
  // Swift eventual consistency — count > 0 but listing returned 0 objects,
  // likely because a recent empty/delete hasn't propagated yet.
  const isConsistencyDelay = !isLoadingObjects && container.count > 0 && actualObjectCount === 0
  const hasPreflightError = !!(objectsError || metaError)

  const modalTitle = (
    <span className="flex max-w-[400px] items-center gap-2">
      <span className="shrink-0">
        <Trans>Delete container:</Trans>
      </span>
      <span className="truncate" title={container.name}>
        {container.name}
      </span>
    </span>
  )

  return (
    <Modal
      title={modalTitle}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={hasObjects ? undefined : t`Delete`}
      confirmButtonVariant={hasObjects ? undefined : "primary-danger"}
      onConfirm={hasObjects ? undefined : handleSubmit}
      cancelButtonLabel={hasObjects ? undefined : t`Cancel`}
      modalFooter={
        hasObjects ? (
          <ModalFooter className="flex justify-end">
            <ButtonRow>
              <Button variant="primary" onClick={handleClose} data-testid="delete-has-objects-close-button">
                <Trans>Close</Trans>
              </Button>
            </ButtonRow>
          </ModalFooter>
        ) : undefined
      }
      size="small"
      disableConfirmButton={
        isLoadingObjects ||
        hasPreflightError ||
        deleteContainerMutation.isPending ||
        (!hasObjects && confirmName.trim() !== "delete") ||
        (!hasObjects && isVersioned && !versionsConfirmed)
      }
    >
      {(objectsError || metaError) && (
        <Stack direction="vertical" gap="2" className="mb-4">
          {objectsError && (
            <p className="text-theme-error">
              {(() => {
                const errorMessage = objectsError.message
                return <Trans>Failed to load container objects: {errorMessage}</Trans>
              })()}
            </p>
          )}
          {metaError && (
            <p className="text-theme-error">
              {(() => {
                const errorMessage = metaError.message
                return <Trans>Failed to load container properties: {errorMessage}</Trans>
              })()}
            </p>
          )}
        </Stack>
      )}
      {isLoadingObjects ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading...</Trans>
        </Stack>
      ) : hasObjects ? (
        // ── Container has objects — block deletion ───────────────────────────
        <Stack direction="vertical" gap="3">
          <p className="text-theme-default">
            <Trans>The container cannot be deleted as it contains objects. Empty the container first.</Trans>
          </p>
          {isConsistencyDelay && (
            <p className="text-theme-default">
              <Trans>
                The container metadata reports objects but none were listed. This may be a temporary synchronization
                delay — please wait a moment and try again.
              </Trans>
            </p>
          )}
        </Stack>
      ) : (
        // ── Container is empty — allow deletion ──────────────────────────────
        <Stack direction="vertical" gap="6">
          <p className="text-theme-default">
            <Trans>The container will be deleted. This action is permanent and cannot be undone.</Trans>
            <br />
            <Trans>
              To confirm type <strong>delete</strong> in the field below.
            </Trans>
          </p>
          {isVersioned && (
            <Checkbox
              label={t`I confirm that all existing versions will also be deleted`}
              checked={versionsConfirmed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVersionsConfirmed(e.target.checked)}
              invalid={!versionsConfirmed}
            />
          )}
          <TextInput
            label={t`Type "delete" to confirm`}
            required
            value={confirmName}
            onChange={handleConfirmNameChange}
            onKeyDown={handleKeyDown}
            invalid={!!nameError}
            errortext={nameError || undefined}
            disabled={deleteContainerMutation.isPending}
            autoFocus
            placeholder={t`delete`}
          />
        </Stack>
      )}
    </Modal>
  )
}
