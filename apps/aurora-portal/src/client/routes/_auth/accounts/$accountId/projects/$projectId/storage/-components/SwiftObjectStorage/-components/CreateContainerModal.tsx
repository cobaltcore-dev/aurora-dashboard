import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Message } from "@cloudoperators/juno-ui-components"

interface CreateContainerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
  maxContainerNameLength?: number
}

export const CreateContainerModal = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  maxContainerNameLength = 256,
}: CreateContainerModalProps) => {
  const { t } = useLingui()
  const [containerName, setContainerName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  const utils = trpcReact.useUtils()

  const createContainerMutation = trpcReact.storage.swift.createContainer.useMutation({
    onSuccess: () => {
      utils.storage.swift.listContainers.invalidate()
      const name = containerName.trim()
      onSuccess?.(name)
    },
    onError: (error) => {
      onError?.(containerName.trim(), error.message)
    },
    onSettled: () => {
      handleClose()
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
    if (name.length > maxContainerNameLength) {
      setNameError(t`Container name must be ${maxContainerNameLength} characters or fewer`)
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
    createContainerMutation.mutate({ container: containerName.trim() })
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
      <Stack direction="vertical" gap="6">
        <Message variant="info">
          <Trans>
            Inside a project, objects are stored in containers. Containers are where you define access permissions and
            quotas.
          </Trans>
        </Message>
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
      </Stack>
    </Modal>
  )
}
