import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Form, FormSection, Status } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { ContainerSummary } from "@/server/Storage/types/swift"

interface CreateContainerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (containerName: string) => void
  onPartialSuccess?: (containerName: string, reason: string) => void
  onError?: (containerName: string, errorMessage: string) => void
  maxContainerNameLength?: number
  existingContainers?: ContainerSummary[]
}

export const CreateContainerModal = ({
  isOpen,
  onClose,
  onSuccess,
  onPartialSuccess,
  onError,
  maxContainerNameLength = 256,
  existingContainers = [],
}: CreateContainerModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [containerName, setContainerName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.swift.container.create",
  })

  const utils = trpcReact.useUtils()

  const createContainerMutation = trpcReact.storage.swift.createContainer.useMutation({
    onSuccess: (data) => {
      utils.storage.swift.listContainers.invalidate()
      const name = containerName.trim()
      if (data.optionsApplied) {
        onSuccess?.(name)
      } else {
        onPartialSuccess?.(name, data.optionsError ?? t`The container's settings could not be applied.`)
      }
      handleClose()
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        setNameError(t`A container with this name already exists`)
        resetTracking()
      } else {
        onError?.(containerName.trim(), error.message)
        handleClose()
      }
    },
  })

  const handleClose = () => {
    trackClose()
    setContainerName("")
    setNameError(null)
    resetTracking()
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
      setNameError(t`A container with this name already exists`)
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

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateName(e.target.value)
  }

  const handleSubmit = () => {
    if (!validateName(containerName)) return
    markSubmitted()
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

  const isPending = createContainerMutation.isPending

  return (
    <Modal
      title={t`Create Container`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Creating...` : t`Create`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isPending || !containerName.trim() || !!nameError}
      disableCancelButton={isPending}
      disableCloseButton={isPending}
    >
      {isPending && <Status status="progress" title={t`Creating Container...`} className="mt-0" />}

      {!isPending && (
        <Form
          className="mb-0"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <FormSection>
            <p className="text-theme-default mb-6">
              <Trans>
                Inside a project, objects are stored in containers. Containers are where you define access permissions
                and quotas.
              </Trans>
            </p>

            <TextInput
              label={t`Container name`}
              required
              value={containerName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              invalid={!!nameError}
              errortext={nameError || undefined}
              helptext={t`Up to ${maxContainerNameLength} characters. Slashes are not allowed.`}
              disabled={isPending}
              autoFocus
              placeholder={t`e.g. my-container`}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
