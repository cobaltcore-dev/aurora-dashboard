import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Message, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { useProjectId } from "@/client/hooks"
import { FloatingIpUpdateFields } from "./EditFloatingIpModal"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

export interface DetachFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string, data: FloatingIpUpdateFields) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const DetachFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: DetachFloatingIpModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { floating_ip_address } = floatingIp

  const { confirmText, setConfirmText, isConfirmed, trackClose, markSubmitted } = useDeleteConfirmation({
    isOpen: open,
    confirmWord: "detach",
    trackingPrefix: "network.floatingip",
  })

  const handleClose = () => {
    trackClose()
    onClose()
  }

  const handleConfirm = async () => {
    markSubmitted()
    await onUpdate(floatingIp.id, {
      project_id: projectId,
      port_id: null,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      size="small"
      title={t`Detach Floating IP "${floating_ip_address}"`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={isLoading ? t`Detaching...` : t`Detach`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      disableConfirmButton={!isConfirmed || isLoading}
      disableCancelButton={isLoading}
      disableCloseButton={isLoading}
    >
      <Stack direction="vertical" gap="4">
        {error && <Message variant="error">{error}</Message>}

        <p className="text-theme-default">
          <Trans>
            Detaching this Floating IP will remove its association with the current port. The instance will no longer be
            reachable through this address.
          </Trans>
        </p>

        <TextInput
          label={t`Type "detach" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="detach"
          helptext={t`The text must match "detach" in lowercase.`}
          autoFocus
          disabled={isLoading}
          required
        />
      </Stack>
    </Modal>
  )
}
