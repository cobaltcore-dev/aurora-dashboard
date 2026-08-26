import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Message, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import type { FloatingIp } from "@/server/Network/types/floatingIp"
import { useDeleteConfirmation } from "@/client/hooks/useDeleteConfirmation"

export interface ReleaseFloatingIpModalProps {
  floatingIp: FloatingIp
  open: boolean
  onClose: () => void
  onUpdate: (floatingIpId: string) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const ReleaseFloatingIpModal = ({
  floatingIp,
  open,
  onClose,
  onUpdate,
  isLoading = false,
  error = null,
}: ReleaseFloatingIpModalProps) => {
  const { t } = useLingui()
  const { floating_ip_address } = floatingIp

  const { confirmText, setConfirmText, isConfirmed, trackClose, markSubmitted } = useDeleteConfirmation({
    isOpen: open,
    confirmWord: "release",
    trackingPrefix: "network.floatingip",
  })

  const handleClose = () => {
    trackClose()
    onClose()
  }

  const handleConfirm = async () => {
    markSubmitted()
    await onUpdate(floatingIp.id)
    onClose()
  }

  return (
    <Modal
      open={open}
      size="small"
      title={t`Release Floating IP "${floating_ip_address}"`}
      onCancel={handleClose}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={isLoading ? t`Releasing...` : t`Release`}
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
            This action is permanent. The address will be removed from your project and returned to the public pool.
            This action cannot be undone.
          </Trans>
        </p>

        <TextInput
          label={t`Type "release" to confirm`}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="release"
          helptext={t`The text must match "release" in lowercase.`}
          autoFocus
          disabled={isLoading}
          required
        />
      </Stack>
    </Modal>
  )
}
