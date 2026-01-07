import { Modal } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { useAuth } from "../../store/AuthProvider"

export function InactivityModal() {
  const { t } = useLingui()
  const { showInactivityModal, closeInactivityModal, logoutReason } = useAuth()

  if (!showInactivityModal) return null

  const title = logoutReason === "expired" ? t`Session Expired` : t`Inactivity Timeout`
  const message =
    logoutReason === "expired" ? t`Your session has expired.` : t`You have been logged out due to inactivity.`

  return (
    <Modal
      open={showInactivityModal}
      title={title}
      onConfirm={closeInactivityModal}
      confirmButtonLabel={t`OK`}
      disableCancelButton
      size="small"
    >
      <p>{message}</p>
      <p>
        <Trans>Please log in again to continue.</Trans>
      </p>
    </Modal>
  )
}
