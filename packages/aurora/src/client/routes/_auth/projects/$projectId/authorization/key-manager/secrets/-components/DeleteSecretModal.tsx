import { useQueryClient } from "@tanstack/react-query"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Stack, toast } from "@cloudoperators/juno-ui-components"
import type { Secret } from "@/server/KeyManager/types/keyManager"
import { uuidFromRef } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/keyManagerUtils"
import { getSecretDeletedToast } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/KeyManagerToastNotifications"

export function DeleteSecretModal({
  projectId,
  secret,
  onClose,
}: {
  projectId: string
  secret: Secret
  onClose: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const secretId = uuidFromRef(secret.secret_ref)
  const secretName = secret.name ?? secretId
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteSecret.useMutation({
    onSuccess: () => {
      const { message, ...options } = getSecretDeletedToast(secretName)
      toast.success(message, options)
      void utils.keyManager.listSecrets.invalidate()
      void queryClient.invalidateQueries({ queryKey: ["km-all-secrets", projectId] })
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Secret`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, secretId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
      disableCloseButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {deleteMutation.error && <Message variant="error" text={deleteMutation.error.message} />}
        <p className="text-theme-default">{t`The secret "${secretName}" will be permanently deleted. This action cannot be undone.`}</p>
      </Stack>
    </Modal>
  )
}
