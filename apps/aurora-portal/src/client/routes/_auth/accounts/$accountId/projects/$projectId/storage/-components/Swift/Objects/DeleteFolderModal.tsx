import { useEffect, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { useParams } from "@tanstack/react-router"
import { FolderRow } from "./"

interface DeleteFolderModalProps {
  isOpen: boolean
  folder: FolderRow | null
  onClose: () => void
  onSuccess?: (folderName: string, deletedCount: number) => void
  onError?: (folderName: string, errorMessage: string) => void
}

export const DeleteFolderModal = ({ isOpen, folder, onClose, onSuccess, onError }: DeleteFolderModalProps) => {
  const { t } = useLingui()
  const { containerName } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/storage/$provider/containers/$containerName/objects/",
  })

  const utils = trpcReact.useUtils()

  // useRef so the folder display name survives re-renders triggered by
  // deleteFolderMutation.reset() inside handleClose() before onSuccess/onError fire.
  const submittedFolderNameRef = useRef("")

  const deleteFolderMutation = trpcReact.storage.swift.deleteFolder.useMutation({
    onSuccess: (deletedCount) => {
      utils.storage.swift.listObjects.invalidate({ container: containerName })
      onSuccess?.(submittedFolderNameRef.current, deletedCount)
    },
    onError: (error) => {
      onError?.(submittedFolderNameRef.current, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  useEffect(() => {
    if (!isOpen) {
      deleteFolderMutation.reset()
    }
  }, [isOpen])

  const handleClose = () => {
    deleteFolderMutation.reset()
    onClose()
  }

  const handleConfirm = () => {
    if (!folder) return
    submittedFolderNameRef.current = folder.displayName
    deleteFolderMutation.mutate({
      container: containerName,
      folderPath: folder.name,
      recursive: true,
    })
  }

  if (!isOpen || !folder) return null

  const folderDisplayName = folder.displayName

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Delete folder:</Trans>
          </span>
          <span className="truncate font-mono" title={folderDisplayName}>
            {folderDisplayName}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={deleteFolderMutation.isPending ? t`Deleting...` : t`Delete`}
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={deleteFolderMutation.isPending}
    >
      {deleteFolderMutation.isPending ? (
        <Stack direction="horizontal" alignment="center" gap="2" className="py-4">
          <Spinner size="small" />
          <Trans>Deleting folder and all its contents...</Trans>
        </Stack>
      ) : (
        <Stack direction="vertical" gap="4">
          <Message variant="warning">
            <Trans>
              <strong>Are you sure?</strong> Folder{" "}
              <span className="font-mono font-semibold">"{folderDisplayName}"</span> and all objects within it will be
              permanently deleted. This cannot be undone.
            </Trans>
          </Message>
          <Message variant="info">
            <Trans>
              Note: for <strong>static and dynamic large objects</strong> only the manifests are deleted — their
              segments outside this folder prefix are not affected.
            </Trans>
          </Message>
        </Stack>
      )}
    </Modal>
  )
}
