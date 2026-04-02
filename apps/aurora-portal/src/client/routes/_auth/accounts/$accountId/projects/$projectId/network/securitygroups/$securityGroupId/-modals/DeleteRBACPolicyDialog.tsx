import { useState } from "react"
import { Modal, Button, ModalFooter, ButtonRow, Message, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"

interface DeleteRBACPolicyDialogProps {
  policy: RBACPolicy | null
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
  const [confirmText, setConfirmText] = useState("")

  const handleConfirm = () => {
    if (policy && confirmText === "remove") {
      onConfirm(policy.id)
    }
  }

  const handleClose = () => {
    setConfirmText("")
    onClose()
  }

  const isConfirmDisabled = confirmText !== "remove" || isLoading

  if (!policy) return null

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="small"
      title={t`Remove RBAC Policy`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              data-testid="confirm-remove-policy-button"
            >
              {isLoading ? <Trans>Removing...</Trans> : <Trans>Remove Policy</Trans>}
            </Button>
            <Button variant="default" onClick={handleClose} disabled={isLoading}>
              <Trans>Cancel</Trans>
            </Button>
          </ButtonRow>
        </ModalFooter>
      }
    >
      <div>
        {/* Warning */}
        <Trans>
          This action cannot be undone. The target project will lose access to this security group immediately.
        </Trans>

        {/* Error Message */}
        {error && (
          <Message dismissible={false} variant="error" className="mt-4">
            {error}
          </Message>
        )}

        {/* Policy Details */}
        <div className="bg-theme-background-lvl-1 mt-4 mb-4 rounded p-4">
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

        {/* Confirmation Input */}
        <div className="mt-4">
          <p className="mb-2 text-sm">
            <Trans>
              Type <strong>remove</strong> to confirm:
            </Trans>
          </p>
          <TextInput
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t`remove`}
            autoComplete="off"
            disabled={isLoading}
            data-testid="remove-policy-confirmation-input"
          />
        </div>
      </div>
    </Modal>
  )
}
