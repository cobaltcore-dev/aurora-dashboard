import { useQueryClient } from "@tanstack/react-query"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Stack, toast } from "@cloudoperators/juno-ui-components"
import type { Container } from "@/server/KeyManager/types/keyManager"
import { uuidFromRef } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/keyManagerUtils"
import { getContainerDeletedToast } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/KeyManagerToastNotifications"

export function DeleteContainerModal({
  projectId,
  container,
  onClose,
}: {
  projectId: string
  container: Container
  onClose: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const containerId = uuidFromRef(container.container_ref)
  const containerName = container.name ?? containerId
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteContainer.useMutation({
    onSuccess: () => {
      const { message, ...options } = getContainerDeletedToast(containerName)
      toast.success(message, options)
      void utils.keyManager.listContainers.invalidate()
      void queryClient.invalidateQueries({ queryKey: ["km-all-containers", projectId] })
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Container`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, containerId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
      disableCloseButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {deleteMutation.error && <Message variant="error" text={deleteMutation.error.message} />}
        <p className="text-theme-default">
          {t`The container "${containerName}" will be permanently deleted. This action cannot be undone.`}
        </p>
      </Stack>
    </Modal>
  )
}
