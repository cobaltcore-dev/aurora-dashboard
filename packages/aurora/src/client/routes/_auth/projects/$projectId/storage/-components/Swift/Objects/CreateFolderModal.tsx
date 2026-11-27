import { useState, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { Modal, TextInput, Form, FormSection, Status } from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { BrowserRow } from "./"

interface CreateFolderModalProps {
  isOpen: boolean
  currentPrefix: string
  onClose: () => void
  onSuccess?: (folderName: string) => void
  onError?: (folderName: string, errorMessage: string) => void
  existingRows?: BrowserRow[]
}

export const CreateFolderModal = ({
  isOpen,
  currentPrefix,
  onClose,
  onSuccess,
  onError,
  existingRows = [],
}: CreateFolderModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { containerName } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
  })

  const [folderName, setFolderName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)

  const utils = trpcReact.useUtils()

  // useRef so the submitted name survives re-renders triggered by
  // createFolderMutation.reset() inside handleClose() before onSuccess fires.
  const submittedNameRef = useRef("")

  const createFolderMutation = trpcReact.storage.swift.createFolder.useMutation({
    onSuccess: () => {
      utils.storage.swift.listObjects.invalidate()
      onSuccess?.(submittedNameRef.current)
      handleClose()
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT") {
        setNameError(t`A folder with this name already exists`)
      } else {
        onError?.(submittedNameRef.current, error.message)
        handleClose()
      }
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

    const newPath = `${currentPrefix}${trimmed}/`
    if (existingRows.some((row) => row.kind === "folder" && row.name === newPath)) {
      setNameError(t`A folder with this name already exists`)
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

  const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateName(e.target.value)
  }

  const handleSubmit = () => {
    if (!validateName(folderName)) return
    submittedNameRef.current = folderName.trim()
    const folderPath = `${currentPrefix}${submittedNameRef.current}/`
    createFolderMutation.mutate({ project_id: projectId, container: containerName, folderPath })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !createFolderMutation.isPending) handleSubmit()
  }

  // Display the path where the folder will be created, e.g. "/ " or "test/ "
  const parentPath = currentPrefix ? currentPrefix : "/"

  if (!isOpen) return null

  const isPending = createFolderMutation.isPending

  return (
    <Modal
      title={t`Create Folder`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Create Folder`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isPending || !folderName.trim() || !!nameError}
      disableCancelButton={isPending}
      disableCloseButton={isPending}
    >
      {isPending && <Status status="progress" title={t`Creating Folder...`} className="mt-0" />}

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
              <Trans>Location:</Trans> <span className="font-semibold">{parentPath}</span>
            </p>
            <p className="text-theme-default mb-6">
              <Trans>
                Folders in object storage are virtual — they are created as zero-byte placeholder objects with a
                trailing slash. The folder will appear once created.
              </Trans>
            </p>
            <TextInput
              label={t`Folder name`}
              required
              value={folderName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              invalid={!!nameError}
              errortext={nameError || undefined}
              helptext={t`No slashes or leading/trailing spaces allowed.`}
              disabled={isPending}
              autoFocus
              placeholder={t`folder-name`}
            />
          </FormSection>
        </Form>
      )}
    </Modal>
  )
}
