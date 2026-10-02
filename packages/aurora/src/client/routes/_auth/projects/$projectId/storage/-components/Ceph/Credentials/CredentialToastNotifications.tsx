import { ReactNode } from "react"
import { NotificationOptions } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"

type ToastReturnType = { message: ReactNode } & NotificationOptions

/**
 * Names where the key lives from now on, not just that it was created.
 *
 * The first key a project ever gets is created from the "Setup Required" empty state, by someone
 * who has never seen this modal before and reached it through a menu they had no reason to open.
 * The row itself is on screen at that moment, so the useful half of this message is the second
 * sentence: the route back. Without it the modal is a dead end you can only find by accident —
 * and the secret, which appears concealed like every other one and is read through its own
 * Reveal, would look like something that had to be caught at creation time.
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

/**
 * A delete that did not happen, reported where the one that did is reported, and carrying whatever
 * the identity service answered rather than a sentence of our own.
 *
 * The commonest reason is the key already being gone - deleted from another tab, or by an admin.
 * That used to be answered as success and toasted as a deletion this session never performed; the
 * server now says NOT_FOUND and this says so too. The key is named because the table is refreshed
 * at the same moment, so by the time this is read the row it refers to may no longer be there -
 * which is also why the caller carries the access key alongside the id it is deleting rather than
 * looking it back up in that list.
 */
export const getCredentialDeleteErrorToast = (accessKey: string, reason: string): ToastReturnType => ({
  message: <Trans>Access key not deleted</Trans>,
  description: (
    <Trans>
      Access key "{accessKey}" was not deleted: {reason}
    </Trans>
  ),
})
