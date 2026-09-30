import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturnType = { message: ReactNode } & NotificationOptions

/**
 * Names where the key lives from now on, not just that it was created.
 *
 * The first key a project ever gets is created from the "Setup Required" empty state, by someone
 * who has never seen this modal before and reached it through a menu they had no reason to open.
 * The key itself is on screen at that moment, so the useful half of this message is the second
 * sentence: the route back. Without it the modal is a dead end you can only find by accident, and
 * the secret — which nothing else in the dashboard displays — reads like a one-time reveal you
 * had better copy now.
 */
export const getCredentialCreatedToast = (accessKey: string): ToastReturnType => ({
  message: <Trans>Access key created</Trans>,
  description: (
    <Trans>
      Access key "{accessKey}" is ready to use. You can find it again any time under More Actions, Manage Credentials.
    </Trans>
  ),
})

export const getCredentialDeletedToast = (accessKey: string): ToastReturnType => ({
  message: <Trans>Access key deleted</Trans>,
  description: <Trans>Access key "{accessKey}" was permanently deleted.</Trans>,
})
