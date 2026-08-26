import { Modal, Stack, Message, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

interface DeleteRBACPolicyDialogProps {
  policy: RBACPolicy
  open: boolean
  onClose: () => void
  onConfirm: (policyId: string) => void
  isLoading: boolean
  error: string | null
}

export function DeleteRBACPolicyDialog({
  policy,
  open,
  onClose,
  onConfirm,
  isLoading,
  error,
}: DeleteRBACPolicyDialogProps) {
  const { t } = useLingui()

  const { confirmText, setConfirmText, isConfirmed, trackClose, markSubmitted } = useDeleteConfirmation({
    isOpen: open,
    confirmWord: "remove",
    trackingPrefix: "network.securitygroup.rbacpolicy",
  })

  const handleClose = () => {
    trackClose()
    onClose()
  }

  const handleConfirm = () => {
    markSubmitted()
    onConfirm(policy.id)
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="small"
      title={t`Remove RBAC Policy`}
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={isLoading ? t`Removing...` : t`Remove Policy`}
      confirmButtonVariant="primary-danger"
      disableConfirmButton={!isConfirmed || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>
            This action cannot be undone. The target project will lose access to this security group immediately.
          </Trans>
        </p>

        <div className="bg-theme-background-lvl-1 rounded p-4">
          <p className="mb-2 font-semibold">
            <Trans>RBAC Policy Details:</Trans>
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              <Trans>Target Project ID</Trans>: {policy.target_tenant}
            </li>
            <li>
              <Trans>Action</Trans>: {policy.action}
            </li>
            <li>
              <Trans>Object Type</Trans>: {policy.object_type}
            </li>
          </ul>
        </div>

        <TextInput
          label={t`Type "remove" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="remove"
          autoComplete="off"
          autoFocus
          disabled={isLoading}
          data-testid="remove-policy-confirmation-input"
        />
      </Stack>
    </Modal>
  )
}
