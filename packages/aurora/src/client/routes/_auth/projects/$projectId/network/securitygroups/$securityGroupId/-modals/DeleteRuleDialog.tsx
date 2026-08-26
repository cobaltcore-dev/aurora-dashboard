import { Modal, Stack, Message, TextInput } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

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

  const { confirmText, setConfirmText, isConfirmed, trackClose, markSubmitted } = useDeleteConfirmation({
    isOpen: open,
    confirmWord: "delete",
    trackingPrefix: "network.securitygroup.rule",
  })

  const handleConfirm = () => {
    if (rule && isConfirmed) {
      markSubmitted()
      onConfirm(rule.id)
    }
  }

  const handleClose = () => {
    trackClose()
    onClose()
  }

  if (!rule) return null

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      size="small"
      title={t`Delete Security Group Rule`}
      confirmButtonLabel={isLoading ? t`Deleting...` : t`Delete Rule`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={!isConfirmed || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>This action cannot be undone. The rule will be permanently deleted.</Trans>
        </p>

        <div className="bg-theme-background-lvl-1 rounded p-4">
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

        <TextInput
          label={t`Type "delete" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="delete"
          autoComplete="off"
          autoFocus
          disabled={isLoading}
          data-testid="delete-rule-confirmation-input"
        />
      </Stack>
    </Modal>
  )
}
