import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Button, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"

interface CreateFolderModalProps {
  bucketName: string
  currentPrefix: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (folderPath: string) => void
}

export function CreateFolderModal({ bucketName, currentPrefix, isOpen, onClose, onSuccess }: CreateFolderModalProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [folderName, setFolderName] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  const utils = trpcReact.useUtils()

  const createFolderMutation = trpcReact.storage.ceph.objects.createFolder.useMutation({
    onSuccess: () => {
      // Invalidate all object list queries to refresh the view
      utils.storage.ceph.objects.list.invalidate()
      const fullPath = currentPrefix + folderName + "/"
      onSuccess(fullPath)
      handleClose()
    },
  })

  const handleClose = () => {
    setFolderName("")
    setValidationError(null)
    createFolderMutation.reset()
    onClose()
  }

  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) {
      return "Folder name cannot be empty"
    }

    if (name.length > 255) {
      return "Folder name is too long (max 255 characters)"
    }

    // Check for invalid characters
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1f]/
    if (invalidChars.test(name)) {
      return "Folder name contains invalid characters"
    }

    // Check for leading/trailing slashes
    if (name.startsWith("/") || name.endsWith("/")) {
      return "Folder name cannot start or end with /"
    }

    return null
  }

  const handleFolderNameChange = (value: string) => {
    setFolderName(value)
    setValidationError(validateFolderName(value))
  }

  const handleCreate = () => {
    if (!projectId) return

    const error = validateFolderName(folderName)
    if (error) {
      setValidationError(error)
      return
    }

    const fullPath = currentPrefix + folderName

    createFolderMutation.mutate({
      project_id: projectId,
      containerName: bucketName,
      folderPath: fullPath,
    })
  }

  const isValid = !validationError && folderName.trim().length > 0

  return (
    <Modal open={isOpen} onCancel={handleClose} title={<Trans>Create New Folder</Trans>} size="large">
      <Stack direction="vertical" gap="4">
        <p>
          <Trans>Enter a name for the new folder.</Trans>
        </p>

        {currentPrefix && (
          <div className="bg-theme-background-lvl-2 rounded p-3">
            <span className="text-juno-grey-light-1 text-sm">
              <Trans>Current location:</Trans>
            </span>
            <div className="mt-1 font-mono text-sm">{currentPrefix}</div>
          </div>
        )}

        <TextInput
          label={t`Folder Name`}
          value={folderName}
          onChange={(e) => handleFolderNameChange(e.target.value)}
          placeholder="my-folder"
          autoFocus
          invalid={!!validationError}
          errortext={validationError || undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid && !createFolderMutation.isPending) {
              handleCreate()
            }
          }}
        />

        <div className="bg-theme-background-lvl-1 rounded p-3">
          <span className="text-juno-grey-light-1 text-sm">
            <Trans>Full path:</Trans>
          </span>
          <div className="mt-1 font-mono text-sm break-all">{currentPrefix + folderName + "/"}</div>
        </div>

        {createFolderMutation.error && (
          <p className="text-juno-red text-sm">
            <Trans>Error:</Trans> {createFolderMutation.error.message}
          </p>
        )}
      </Stack>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="subdued" onClick={handleClose} disabled={createFolderMutation.isPending}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" onClick={handleCreate} disabled={!isValid || createFolderMutation.isPending}>
          {createFolderMutation.isPending ? <Trans>Creating...</Trans> : <Trans>Create Folder</Trans>}
        </Button>
      </div>
    </Modal>
  )
}
