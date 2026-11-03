import { useQueryClient } from "@tanstack/react-query"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Message, Stack, toast } from "@cloudoperators/juno-ui-components"
import type { Order } from "@/server/KeyManager/types/keyManager"
import { uuidFromRef } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/keyManagerUtils"
import { getOrderDeletedToast } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/KeyManagerToastNotifications"

export function DeleteOrderModal({
  projectId,
  order,
  onClose,
}: {
  projectId: string
  order: Order
  onClose: () => void
}) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const orderId = uuidFromRef(order.order_ref)
  const orderName = typeof order.meta?.name === "string" ? order.meta.name : orderId
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteOrder.useMutation({
    onSuccess: () => {
      const { message, ...options } = getOrderDeletedToast(orderName)
      toast.success(message, options)
      void utils.keyManager.listOrders.invalidate()
      void queryClient.invalidateQueries({ queryKey: ["km-all-orders", projectId] })
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Order`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, orderId })}
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
          {t`The order "${orderName}" will be permanently deleted. This action cannot be undone.`}
        </p>
      </Stack>
    </Modal>
  )
}
