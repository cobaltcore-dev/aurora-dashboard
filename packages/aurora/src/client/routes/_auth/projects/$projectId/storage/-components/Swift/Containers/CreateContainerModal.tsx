import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { ContainerSummary } from "@/server/Storage/types/swift"

interface CreateContainerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onError?: (containerName: string, errorMessage: string) => void
  maxContainerNameLength?: number
  existingContainers?: ContainerSummary[]
}

export const CreateContainerModal = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  maxContainerNameLength = 256,
  existingContainers = [],
}: CreateContainerModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [containerName, setContainerName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  const utils = trpcReact.useUtils()

  const createContainerMutation = trpcReact.storage.swift.createContainer.useMutation({
    onSuccess: () => {
      utils.storage.swift.listContainers.invalidate()
      const name = containerName.trim()
      onSuccess?.(name)
      handleClose()
    },
    onError: (error) => {
      const trimmed = containerName.trim()

      if (error.data?.code === "CONFLICT") {
        setNameError(t`"${trimmed}" is already taken.`)
        return
      }

      onError?.(trimmed, error.message)
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
    const trimmed = name.trim()

    if (!trimmed) {
      setNameError(t`Container name is required`)
      return false
    }
    if (trimmed.length > maxContainerNameLength) {
      setNameError(t`Container name must be ${maxContainerNameLength} characters or fewer`)
      return false
    }
    if (trimmed.includes("/")) {
      setNameError(t`Container name cannot contain slashes`)
      return false
    }

    if (existingContainers.some((c) => c.name === trimmed)) {
      setNameError(t`"${trimmed}" is already taken.`)
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
      project_id: projectId,
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
      confirmButtonLabel={createContainerMutation.isPending ? t`Creating...` : t`Create`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={createContainerMutation.isPending || !containerName.trim()}
    >
      <Stack direction="vertical" gap="6">
        <p className="text-theme-default">
          <Trans>
            Inside a project, objects are stored in containers. Containers are where you define access permissions and
            quotas.
          </Trans>
        </p>
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
