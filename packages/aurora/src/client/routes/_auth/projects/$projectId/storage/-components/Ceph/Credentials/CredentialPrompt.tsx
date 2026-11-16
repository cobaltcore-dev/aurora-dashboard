import { Trans, useLingui } from "@lingui/react/macro"
import { Button, ButtonRow, Status } from "@cloudoperators/juno-ui-components"

interface CredentialPromptProps {
  onManageCredentials: () => void
  onCliSetup?: () => void
}

/**
 * Empty state shown when the user has no S3 credentials in this project yet.
 *
 * This is a thin trigger for `ManageCredentialsModal` and, optionally, `CliSetupModal` - it owns
 * no permission checks or mutations of its own. Creation and its permission gate both live in the
 * modal, so there is exactly one place that decides whether/how a credential gets created.
 *
 * `Status` rather than hand-rolled markup: this is one of two full-page states the bucket list
 * can resolve to, and the other one (`S3 Authentication Failed`, see index.tsx) is already
 * a `Status`. `status="empty"` and not `"error"` - holding no key yet is a starting point, not a
 * failure - which also makes the container a `role="status"` instead of a `role="alert"`.
 */
export function CredentialPrompt({ onManageCredentials, onCliSetup }: CredentialPromptProps) {
  const { t } = useLingui()

  return (
    <Status
      status="empty"
      title={t`S3 Object Storage: Setup Required`}
      body={t`Access to S3 Object Storage requires an access key (access key ID + secret access key).`}
      action={
        onCliSetup ? (
          <ButtonRow>
            <Button variant="primary" onClick={onManageCredentials}>
              <Trans>Manage Credentials</Trans>
            </Button>
            <Button onClick={onCliSetup}>
              <Trans>CLI Setup</Trans>
            </Button>
          </ButtonRow>
        ) : (
          <Button variant="primary" onClick={onManageCredentials}>
            <Trans>Manage Credentials</Trans>
          </Button>
        )
      }
    />
  )
}
