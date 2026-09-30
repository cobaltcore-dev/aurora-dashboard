import { Trans } from "@lingui/react/macro"
import { Button, Stack } from "@cloudoperators/juno-ui-components"

interface CredentialPromptProps {
  onManageCredentials: () => void
}

/**
 * Empty state shown when the user has no S3 credentials in this project yet.
 *
 * This is a thin trigger for `ManageCredentialsModal` - it owns no permission checks or
 * mutations of its own. Creation, its permission gate, and its limit all live in the modal,
 * so there is exactly one place that decides whether/how a credential gets created.
 */
export function CredentialPrompt({ onManageCredentials }: CredentialPromptProps) {
  return (
    <Stack direction="vertical" gap="4" className="mt-8 max-w-lg">
      <h2 className="text-lg font-semibold">
        <Trans>S3 Object Storage: Setup Required</Trans>
      </h2>
      <p className="text-theme-default">
        <Trans>
          Access to S3 Object Storage requires an access key (access key ID + secret access key). The key authenticates
          requests to the Ceph storage backend.
        </Trans>
      </p>
      <div>
        <Button variant="primary" onClick={onManageCredentials}>
          <Trans>Manage Credentials</Trans>
        </Button>
      </div>
    </Stack>
  )
}
