import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Message } from "@cloudoperators/juno-ui-components"

interface CreateContainerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const CreateContainerModal = ({ isOpen, onClose, onSuccess }: CreateContainerModalProps) => {
  const { t } = useLingui()
  const [containerName, setContainerName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  const utils = trpcReact.useUtils()

  const createContainerMutation = trpcReact.storage.swift.createContainer.useMutation({
    onSuccess: () => {
      // Invalidate and refetch containers list
      utils.storage.swift.listContainers.invalidate()
      handleClose()
      onSuccess?.()
    },
  })

  const handleClose = () => {
    setContainerName("")
    setNameError(null)
    createContainerMutation.reset()
    onClose()
  }

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError(t`Container name is required`)
      return false
    }
    if (name.length > 256) {
      setNameError(t`Container name must be 256 characters or fewer`)
      return false
    }
    if (name.includes("/")) {
      setNameError(t`Container name cannot contain slashes`)
      return false
    }
    setNameError(null)
    return true
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setContainerName(value)
    if (nameError) validateName(value)
  }

  const handleSubmit = () => {
    if (!validateName(containerName)) return

    createContainerMutation.mutate({
      container: containerName.trim(),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      title={t`Create Container`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Create`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={createContainerMutation.isPending || !containerName.trim()}
    >
      <Stack direction="vertical" gap="4">
        {createContainerMutation.isError && (
          <div className="text-theme-danger text-sm p-2 rounded bg-theme-background-lvl-2">
            {createContainerMutation.error?.message || t`Failed to create container`}
          </div>
        )}

        <Stack direction="vertical" gap="4">
          <TextInput
            label={t`Container name`}
            required
            value={containerName}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            invalid={!!nameError}
            errortext={nameError || undefined}
            disabled={createContainerMutation.isPending}
            autoFocus
            placeholder={t`Enter container name`}
          />
          <Message variant="info">
            <Trans>
              Inside a project, objects are stored in containers. Containers are where you define access permissions and
              quotas.
            </Trans>
          </Message>
        </Stack>
      </Stack>
    </Modal>
  )
}
