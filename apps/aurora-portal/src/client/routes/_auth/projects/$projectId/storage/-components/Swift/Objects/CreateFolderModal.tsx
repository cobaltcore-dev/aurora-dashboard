import { useState, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Message } from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"

interface CreateFolderModalProps {
  isOpen: boolean
  currentPrefix: string
  onClose: () => void
  onSuccess?: (folderName: string) => void
  onError?: (folderName: string, errorMessage: string) => void
}

export const CreateFolderModal = ({ isOpen, currentPrefix, onClose, onSuccess, onError }: CreateFolderModalProps) => {
  const { t } = useLingui()
  const { containerName } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  const [folderName, setFolderName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  const utils = trpcReact.useUtils()

  // useRef so the submitted name survives re-renders triggered by
  // createFolderMutation.reset() inside handleClose() before onSuccess/onError fire.
  const submittedNameRef = useRef("")

  const createFolderMutation = trpcReact.storage.swift.createFolder.useMutation({
    onSuccess: () => {
      utils.storage.swift.listObjects.invalidate()
      onSuccess?.(submittedNameRef.current)
    },
    onError: (error) => {
      onError?.(submittedNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  const handleClose = () => {
    setFolderName("")
    setNameError(null)
    createFolderMutation.reset()
    onClose()
  }

  const validateName = (name: string): boolean => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError(t`Folder name is required`)
      return false
    }
    if (trimmed.includes("/")) {
      setNameError(t`Folder name cannot contain slashes`)
      return false
    }
    if (trimmed !== name) {
      setNameError(t`Folder name cannot have leading or trailing whitespace`)
      return false
    }
    setNameError(null)
    return true
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFolderName(value)
    if (nameError) validateName(value)
  }

  const handleSubmit = () => {
    if (!validateName(folderName)) return
    submittedNameRef.current = folderName.trim()
    const folderPath = `${currentPrefix}${submittedNameRef.current}/`
    createFolderMutation.mutate({ container: containerName, folderPath })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
  }

  // Display the path where the folder will be created, e.g. "/ " or "test/ "
  const parentPath = currentPrefix ? currentPrefix : "/"

  if (!isOpen) return null

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Create folder below:</Trans>
          </span>
          <span className="truncate font-mono" title={parentPath}>
            {parentPath}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Create Folder`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={createFolderMutation.isPending || !folderName.trim()}
    >
      <Stack direction="vertical" gap="6">
        <Message variant="info">
          <Trans>
            Folders in object storage are virtual — they are created as zero-byte placeholder objects with a trailing
            slash. The folder will appear once created.
          </Trans>
        </Message>
        <TextInput
          label={t`Folder name`}
          required
          value={folderName}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          invalid={!!nameError}
          errortext={nameError || undefined}
          disabled={createFolderMutation.isPending}
          autoFocus
          placeholder={t`folder-name`}
        />
      </Stack>
    </Modal>
  )
}
