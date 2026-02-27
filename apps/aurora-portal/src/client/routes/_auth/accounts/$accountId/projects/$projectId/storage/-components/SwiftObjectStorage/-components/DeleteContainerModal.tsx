import { useState, useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Message, Spinner, Icon } from "@cloudoperators/juno-ui-components"
import { ContainerSummary } from "@/server/Storage/types/swift"

interface DeleteContainerModalProps {
  isOpen: boolean
  container: ContainerSummary | null
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
}

export const DeleteContainerModal = ({ isOpen, container, onClose, onSuccess, onError }: DeleteContainerModalProps) => {
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
    { container: container?.name ?? "", format: "json", limit: 1 },
    { enabled: isOpen && container !== null }
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
      deleteContainerMutation.reset()
    }
  }, [isOpen, container?.name])

  const handleClose = () => {
    setConfirmName("")
    setNameError(null)
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
    if (confirmName.trim() !== container.name) {
      setNameError(t`Container name does not match`)
      return
    }
    deleteContainerMutation.mutate({ container: container.name })
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

  const modalTitle = (
    <span className="flex items-center gap-2">
      <Trans>Delete container:</Trans>
      <span>{container.name}</span>
      {!isLoadingObjects && !hasObjects && (
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
      confirmButtonLabel={hasObjects ? t`Got it!` : t`Delete`}
      onConfirm={hasObjects ? handleClose : handleSubmit}
      cancelButtonLabel={hasObjects ? undefined : t`Cancel`}
      size="small"
      disableConfirmButton={
        isLoadingObjects || deleteContainerMutation.isPending || (!hasObjects && confirmName !== container.name)
      }
    >
      {isLoadingObjects ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Loading...</Trans>
        </Stack>
      ) : hasObjects ? (
        // ── Container has objects — block deletion ───────────────────────────
        <Message variant="danger">
          <Trans>Cannot delete. Container contains objects. Please empty it first.</Trans>
        </Message>
      ) : (
        // ── Container is empty — allow deletion ──────────────────────────────
        <Stack direction="vertical" gap="6">
          <Message variant="danger">
            <Trans>
              <strong>Are you sure?</strong> The container will be deleted. This cannot be undone.
            </Trans>
          </Message>
          <TextInput
            label={t`Type container name to confirm`}
            required
            value={confirmName}
            onChange={handleConfirmNameChange}
            onKeyDown={handleKeyDown}
            invalid={!!nameError}
            errortext={nameError || undefined}
            disabled={deleteContainerMutation.isPending}
            autoFocus
            placeholder={container.name}
          />
        </Stack>
      )}
    </Modal>
  )
}
