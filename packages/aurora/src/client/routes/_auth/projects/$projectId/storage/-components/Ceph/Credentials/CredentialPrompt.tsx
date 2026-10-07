import { Trans, useLingui } from "@lingui/react/macro"
import { Button, Status } from "@cloudoperators/juno-ui-components"

interface CredentialPromptProps {
  onManageCredentials: () => void
}

/**
 * Empty state shown when the user has no S3 credentials in this project yet.
 *
 * This is a thin trigger for `ManageCredentialsModal` - it owns no permission checks or
 * mutations of its own. Creation and its permission gate both live in the modal, so there is
 * exactly one place that decides whether/how a credential gets created.
 *
 * `Status` rather than hand-rolled markup: this is one of two full-page states the bucket list
 * can resolve to, and the other one (`S3 Authentication Failed`, see index.tsx) is already
 * a `Status`. `status="empty"` and not `"error"` - holding no key yet is a starting point, not a
 * failure - which also makes the container a `role="status"` instead of a `role="alert"`.
 */
export function CredentialPrompt({ onManageCredentials }: CredentialPromptProps) {
  const { t } = useLingui()

  return (
    <Status
      status="empty"
      title={t`S3 Object Storage: Setup Required`}
      body={t`Access to S3 Object Storage requires an access key (access key ID + secret access key).`}
      action={
        <Button variant="primary" onClick={onManageCredentials}>
          <Trans>Manage Credentials</Trans>
        </Button>
      }
    />
  )
}
