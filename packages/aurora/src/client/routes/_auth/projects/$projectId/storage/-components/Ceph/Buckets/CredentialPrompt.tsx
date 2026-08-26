import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useCephPermissions } from "../hooks/useCephPermissions"
import { Button, Stack, Message, toast } from "@cloudoperators/juno-ui-components"

interface CredentialPromptProps {
  onSuccess: () => void
}

export function CredentialPrompt({ onSuccess }: CredentialPromptProps) {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { permissions } = useCephPermissions(projectId)
  const utils = trpcReact.useUtils()

  const createMutation = trpcReact.storage.ceph.ec2Credentials.create.useMutation({
    onSuccess: () => {
      utils.storage.ceph.ec2Credentials.list.invalidate()
      onSuccess()
    },
    onError: (err) => {
      const errorMessage = err.message
      toast.error(<Trans>Failed to create credential: {errorMessage}</Trans>)
    },
  })

  return (
    <Stack direction="vertical" gap="4" className="mt-8 max-w-lg">
      <h2 className="text-lg font-semibold">
        <Trans>S3 Object Storage: Setup Required</Trans>
      </h2>
      <p className="text-theme-default">
        <Trans>
          To access S3 Object Storage, you need EC2 credentials (access key + secret key). These credentials
          authenticate your requests to the Ceph storage backend.
        </Trans>
      </p>
      <p className="text-theme-default text-sm">
        <Trans>
          Click the button below to automatically generate credentials for this project. You only need to do this once.
        </Trans>
      </p>
      {permissions.canCreateCredential ? (
        <div>
          <Button
            onClick={() => projectId && createMutation.mutate({ project_id: projectId })}
            disabled={createMutation.isPending || !projectId}
          >
            {createMutation.isPending ? <Trans>Creating Credentials...</Trans> : <Trans>Create S3 Credentials</Trans>}
          </Button>
        </div>
      ) : (
        <Message variant="info" title={t`Insufficient permissions`}>
          <Trans>
            You don't have permission to create S3 credentials. Please contact your administrator to request access to
            S3 Object Storage.
          </Trans>
        </Message>
      )}
    </Stack>
  )
}
