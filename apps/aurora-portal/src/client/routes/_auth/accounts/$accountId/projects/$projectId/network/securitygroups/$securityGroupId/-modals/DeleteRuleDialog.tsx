import { useState } from "react"
import { Modal, Button, ModalFooter, ButtonRow, Message, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"

interface DeleteRuleDialogProps {
  rule: SecurityGroupRule | null
  open: boolean
  onClose: () => void
  onConfirm: (ruleId: string) => void
  isLoading: boolean
  error: string | null
}

export function DeleteRuleDialog({ rule, open, onClose, onConfirm, isLoading, error }: DeleteRuleDialogProps) {
  const { t } = useLingui()
  const [confirmText, setConfirmText] = useState("")

  const handleConfirm = () => {
    if (rule && confirmText === "delete") {
      onConfirm(rule.id)
    }
  }

  const handleClose = () => {
    setConfirmText("")
    onClose()
  }

  const isConfirmDisabled = confirmText !== "delete" || isLoading

  if (!rule) return null

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="small"
      title={t`Delete Security Group Rule`}
      modalFooter={
        <ModalFooter className="flex justify-end">
          <ButtonRow>
            <Button
              variant="primary-danger"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              data-testid="confirm-delete-rule-button"
            >
              {isLoading ? <Trans>Deleting...</Trans> : <Trans>Delete Rule</Trans>}
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
        <Trans>This action cannot be undone. The rule will be permanently deleted.</Trans>

        {/* Error Message */}
        {error && (
          <Message dismissible={false} variant="error" className="mt-4">
            {error}
          </Message>
        )}

        {/* Rule Details */}
        <div className="bg-theme-background-lvl-1 mt-4 mb-4 rounded p-4">
          <p className="mb-2 font-semibold">
            <Trans>Rule Details:</Trans>
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              <Trans>Direction</Trans>: {rule.direction}
            </li>
            {rule.description && (
              <li>
                <Trans>Description</Trans>: {rule.description}
              </li>
            )}
            <li>
              <Trans>Ethertype</Trans>: {rule.ethertype}
            </li>
            {rule.protocol && (
              <li>
                <Trans>Protocol</Trans>: {rule.protocol}
              </li>
            )}
            {rule.port_range_min !== null && rule.port_range_max !== null && (
              <li>
                <Trans>Port Range</Trans>:{" "}
                {rule.port_range_min === rule.port_range_max
                  ? rule.port_range_min
                  : `${rule.port_range_min}-${rule.port_range_max}`}
              </li>
            )}
            {rule.remote_ip_prefix && (
              <li>
                <Trans>Remote IP</Trans>: {rule.remote_ip_prefix}
              </li>
            )}
            {rule.remote_group_id && (
              <li>
                <Trans>Remote Security Group</Trans>: {rule.remote_group_id}
              </li>
            )}
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="mt-4">
          <p className="mb-2 text-sm">
            <Trans>
              Type <strong>delete</strong> to confirm:
            </Trans>
          </p>
          <TextInput
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t`delete`}
            autoComplete="off"
            disabled={isLoading}
            data-testid="delete-rule-confirmation-input"
          />
        </div>
      </div>
    </Modal>
  )
}
