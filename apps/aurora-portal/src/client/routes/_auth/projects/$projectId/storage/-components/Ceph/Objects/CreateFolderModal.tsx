import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Button, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { validateFolderName } from "./utils/objectValidation"

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

  // Fetch existing folders for duplicate detection
  const { data: objectsData } = trpcReact.storage.ceph.objects.list.useQuery(
    {
      project_id: projectId ?? "",
      containerName: bucketName,
      prefix: currentPrefix || undefined,
      delimiter: "/",
      maxKeys: 1000,
    },
    { enabled: isOpen && !!projectId && !!bucketName }
  )

  const createFolderMutation = trpcReact.storage.ceph.objects.createFolder.useMutation({
    onSuccess: (_data, variables) => {
      // Invalidate all object list queries to refresh the view
      utils.storage.ceph.objects.list.invalidate()
      // Use the exact path that was submitted (with trailing slash for display)
      const submittedFullPath = variables.folderPath.endsWith("/")
        ? variables.folderPath
        : `${variables.folderPath}/`
      onSuccess(submittedFullPath)
      handleClose()
    },
  })

  const handleClose = () => {
    setFolderName("")
    setValidationError(null)
    createFolderMutation.reset()
    onClose()
  }

  const handleFolderNameChange = (value: string) => {
    setFolderName(value)
    // Get existing folder names for duplicate detection
    const existingFolders = objectsData?.folders.map((f) => f.prefix) ?? []
    const error = validateFolderName(value, existingFolders, currentPrefix)
    setValidationError(error ? t(error.message) : null)
  }

  const handleCreate = () => {
    if (!projectId) return

    const existingFolders = objectsData?.folders.map((f) => f.prefix) ?? []
    const error = validateFolderName(folderName, existingFolders, currentPrefix)
    if (error) {
      setValidationError(t(error.message))
      return
    }

    const fullPath = currentPrefix + folderName.trim()

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
          <div className="mt-1 font-mono text-sm break-all">{currentPrefix + folderName.trim() + "/"}</div>
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
